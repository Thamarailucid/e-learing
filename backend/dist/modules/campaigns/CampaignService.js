"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignService = void 0;
const connection_1 = require("../../database/connection");
const environment_1 = require("../../config/environment");
const ApiError_1 = require("../../utils/ApiError");
const DateTimeUtils_1 = require("../../utils/DateTimeUtils");
const ClientIpResolver_1 = require("../../utils/ClientIpResolver");
class CampaignService {
    schema = environment_1.EnvironmentConfig.database.schema;
    /**
     * Create an outreach campaign invite link for a private (or standard) course.
     * Target: Specific College / Partner / University with limited free student quota.
     */
    async CreateCampaignLink(organizationId, courseId, userId, data) {
        // 1. Verify course belongs to this organization
        const courseRes = await (0, connection_1.executeQuery)(`SELECT id, title, slug, is_private FROM ${this.schema}.courses WHERE id = $1 AND organization_id = $2`, [courseId, organizationId]);
        if (courseRes.rowCount === 0) {
            throw ApiError_1.ApiError.notFound('Course not found in this organization.');
        }
        const course = courseRes.rows[0];
        // 2. Generate or sanitize invite code
        let inviteCode = data.customInviteCode
            ? data.customInviteCode.toUpperCase().replace(/[^A-Z0-9_-]/g, '').trim()
            : null;
        if (!inviteCode) {
            const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const timeSuffix = Date.now().toString(36).toUpperCase().slice(-4);
            const cleanInst = data.targetInstitution
                .replace(/[^A-Za-z0-9]/g, '')
                .substring(0, 4)
                .toUpperCase();
            inviteCode = `CMP-${cleanInst || 'ACAD'}-${timeSuffix}-${randSuffix}`;
        }
        // Check code collision
        const existing = await (0, connection_1.executeQuery)(`SELECT id FROM ${this.schema}.course_campaign_links WHERE invite_code = $1`, [inviteCode]);
        if (existing.rowCount > 0) {
            throw ApiError_1.ApiError.conflict('A campaign with this invite code already exists. Please pick another code.');
        }
        const maxRedemptions = data.maxRedemptions && data.maxRedemptions > 0 ? data.maxRedemptions : 100;
        const expiresAt = data.expiresAt ? new Date(data.expiresAt).toISOString() : null;
        const insertRes = await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.course_campaign_links (
        organization_id, course_id, campaign_name, target_institution,
        invite_code, max_redemptions, current_redemptions, expires_at,
        is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, TRUE, $8)
      RETURNING *`, [
            organizationId,
            courseId,
            data.campaignName.trim(),
            data.targetInstitution.trim(),
            inviteCode,
            maxRedemptions,
            expiresAt,
            userId,
        ]);
        const campaign = insertRes.rows[0];
        // Fetch creator user details
        const userRes = await (0, connection_1.executeQuery)(`SELECT first_name, last_name, email FROM ${this.schema}.users WHERE id = $1`, [userId]);
        const creator = userRes.rows[0];
        const creatorName = creator ? `${creator.first_name} ${creator.last_name}`.trim() : 'Staff Member';
        const creatorEmail = creator ? creator.email : null;
        return {
            ...campaign,
            course_title: course.title,
            course_slug: course.slug,
            is_private_course: course.is_private,
            creator_name: creatorName,
            creator_email: creatorEmail,
            expires_at_utc: campaign.expires_at ? DateTimeUtils_1.DateTimeUtils.toUtcIsoString(campaign.expires_at) : null,
        };
    }
    /**
     * List all campaigns created for a course with live claim metrics.
     */
    async GetCourseCampaignList(organizationId, courseId) {
        const res = await (0, connection_1.executeQuery)(`SELECT ccl.*, 
              u.first_name as creator_first_name, u.last_name as creator_last_name, u.email as creator_email,
              c.title as course_title, c.is_private as course_is_private
       FROM ${this.schema}.course_campaign_links ccl
       JOIN ${this.schema}.courses c ON c.id = ccl.course_id
       LEFT JOIN ${this.schema}.users u ON u.id = ccl.created_by
       WHERE ccl.course_id = $1 AND ccl.organization_id = $2
       ORDER BY ccl.created_at DESC`, [courseId, organizationId]);
        return res.rows.map((row) => ({
            ...row,
            creator_name: `${row.creator_first_name || ''} ${row.creator_last_name || ''}`.trim() || 'Staff Member',
            creator_email: row.creator_email || null,
            remaining_redemptions: Math.max(0, row.max_redemptions - row.current_redemptions),
            is_expired: row.expires_at ? new Date(row.expires_at) < new Date() : false,
            expires_at_utc: row.expires_at ? DateTimeUtils_1.DateTimeUtils.toUtcIsoString(row.expires_at) : null,
            created_at_utc: DateTimeUtils_1.DateTimeUtils.toUtcIsoString(row.created_at),
        }));
    }
    /**
     * Public lookup for Campaign Landing Page when student scans QR or clicks share link.
     * Does NOT require authentication.
     */
    async GetPublicCampaignDetails(inviteCode) {
        const codeNorm = inviteCode.toUpperCase().trim();
        const res = await (0, connection_1.executeQuery)(`SELECT ccl.id as campaign_id, ccl.campaign_name, ccl.target_institution, ccl.invite_code,
              ccl.max_redemptions, ccl.current_redemptions, ccl.expires_at, ccl.is_active,
              c.id as course_id, c.title as course_title, c.slug as course_slug, c.description as course_description,
              c.short_description as course_short_description, c.thumbnail_url as course_thumbnail_url,
              c.level as course_level, c.category as course_category, c.is_private as course_is_private,
              (SELECT COUNT(*) FROM ${this.schema}.lessons l WHERE l.course_id = c.id) as lesson_count,
              COALESCE((SELECT SUM(l.video_duration_seconds) / 60 FROM ${this.schema}.lessons l WHERE l.course_id = c.id), 0) as duration_minutes,
              o.id as organization_id, o.name as organization_name, o.slug as organization_slug, o.logo_url as organization_logo_url
       FROM ${this.schema}.course_campaign_links ccl
       JOIN ${this.schema}.courses c ON c.id = ccl.course_id
       JOIN ${this.schema}.organizations o ON o.id = ccl.organization_id
       WHERE ccl.invite_code = $1`, [codeNorm]);
        if (res.rowCount === 0) {
            throw ApiError_1.ApiError.notFound('Campaign invitation link not found or invalid.');
        }
        const item = res.rows[0];
        const isExpired = item.expires_at ? new Date(item.expires_at) < new Date() : false;
        const isFull = item.current_redemptions >= item.max_redemptions;
        const isClaimable = item.is_active && !isExpired && !isFull;
        return {
            campaign: {
                id: item.campaign_id,
                name: item.campaign_name,
                targetInstitution: item.target_institution,
                inviteCode: item.invite_code,
                maxRedemptions: item.max_redemptions,
                currentRedemptions: item.current_redemptions,
                remainingSeats: Math.max(0, item.max_redemptions - item.current_redemptions),
                expiresAtUtc: item.expires_at ? DateTimeUtils_1.DateTimeUtils.toUtcIsoString(item.expires_at) : null,
                isActive: item.is_active,
                isExpired,
                isFull,
                isClaimable,
            },
            course: {
                id: item.course_id,
                title: item.course_title,
                slug: item.course_slug,
                description: item.course_description,
                shortDescription: item.course_short_description,
                thumbnailUrl: item.course_thumbnail_url,
                level: item.course_level,
                category: item.course_category,
                isPrivate: item.course_is_private,
                lessonCount: parseInt(item.lesson_count || '0', 10),
                durationMinutes: Math.round(Number(item.duration_minutes || 0)),
            },
            organization: {
                id: item.organization_id,
                name: item.organization_name,
                slug: item.organization_slug,
                logoUrl: item.organization_logo_url,
            },
        };
    }
    /**
     * Redeem Campaign Share Link: Authenticated student claims free access.
     * Auto-enrolls student into organization and the private course.
     */
    async RedeemCampaignLink(userId, inviteCode, clientIp) {
        if ((0, ClientIpResolver_1.isLoopbackIp)(clientIp)) {
            clientIp = await (0, ClientIpResolver_1.FetchPublicIp)();
        }
        const codeNorm = inviteCode.toUpperCase().trim();
        // 1. Fetch Campaign Link
        const campRes = await (0, connection_1.executeQuery)(`SELECT * FROM ${this.schema}.course_campaign_links WHERE invite_code = $1`, [codeNorm]);
        if (campRes.rowCount === 0) {
            throw ApiError_1.ApiError.notFound('Invalid or unknown campaign code.');
        }
        const campaign = campRes.rows[0];
        // 2. Validate Link State
        if (!campaign.is_active) {
            throw ApiError_1.ApiError.forbidden('This campaign invite link has been deactivated by the organization.');
        }
        if (campaign.expires_at && new Date(campaign.expires_at) < new Date()) {
            throw ApiError_1.ApiError.forbidden('This campaign invitation link has expired.');
        }
        // 3. Check if user already redeemed this link
        const existingRedemption = await (0, connection_1.executeQuery)(`SELECT id, redeemed_at FROM ${this.schema}.course_campaign_redemptions
       WHERE campaign_link_id = $1 AND user_id = $2`, [campaign.id, userId]);
        if (existingRedemption.rowCount > 0) {
            // User already redeemed: Return course link without error
            return {
                alreadyRedeemed: true,
                message: 'You already claimed access through this campaign invitation. Proceeding to course player.',
                courseId: campaign.course_id,
                organizationId: campaign.organization_id,
            };
        }
        // 4. Check Quota
        if (campaign.current_redemptions >= campaign.max_redemptions) {
            throw ApiError_1.ApiError.forbidden(`All ${campaign.max_redemptions} free student seats allocated for ${campaign.target_institution} have been claimed.`);
        }
        // 5. Ensure student is an active member of this organization
        await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.organization_members (organization_id, user_id, role_id, status)
       VALUES ($1, $2, 'STUDENT', 'ACTIVE')
       ON CONFLICT (organization_id, user_id) DO NOTHING`, [campaign.organization_id, userId]);
        // 6. Enroll student in the private course
        await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.enrollments (organization_id, user_id, course_id, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       ON CONFLICT (organization_id, user_id, course_id) DO NOTHING`, [campaign.organization_id, userId, campaign.course_id]);
        // 7. Initialize course progress record
        const lessonCountRes = await (0, connection_1.executeQuery)(`SELECT COUNT(*) as count FROM ${this.schema}.lessons WHERE course_id = $1`, [campaign.course_id]);
        const lessonCount = parseInt(lessonCountRes.rows[0]?.count || '0', 10);
        await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.student_course_progress (
        organization_id, user_id, course_id, completed_lessons_count, total_lessons_count, progress_percentage
       ) VALUES ($1, $2, $3, 0, $4, 0.00)
       ON CONFLICT (organization_id, user_id, course_id) DO NOTHING`, [campaign.organization_id, userId, campaign.course_id, lessonCount]);
        // 8. Record Campaign Redemption
        await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.course_campaign_redemptions (
        campaign_link_id, organization_id, course_id, user_id, ip_address
       ) VALUES ($1, $2, $3, $4, $5)`, [campaign.id, campaign.organization_id, campaign.course_id, userId, clientIp || null]);
        // 9. Atomically increment redemptions count
        await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.course_campaign_links
       SET current_redemptions = current_redemptions + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`, [campaign.id]);
        // 10. Audit Log
        try {
            await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.audit_logs (organization_id, user_id, action, resource, resource_id, ip_address, metadata)
         VALUES ($1::uuid, $2::uuid, 'CAMPAIGN_COURSE_REDEEMED', 'course_campaign_links', $3::text, $4::text, $5::jsonb)`, [
                campaign.organization_id,
                userId,
                campaign.id,
                clientIp,
                JSON.stringify({
                    courseId: campaign.course_id,
                    inviteCode: campaign.invite_code,
                    targetInstitution: campaign.target_institution,
                    campaignName: campaign.campaign_name,
                }),
            ]);
        }
        catch { }
        return {
            alreadyRedeemed: false,
            message: `Congratulations! Free access granted for ${campaign.target_institution}.`,
            courseId: campaign.course_id,
            organizationId: campaign.organization_id,
        };
    }
    /**
     * Get list of all students who redeemed access via this outreach campaign.
     */
    async GetCampaignRedemptions(organizationId, campaignId) {
        const res = await (0, connection_1.executeQuery)(`SELECT ccr.id as redemption_id, ccr.ip_address, ccr.redeemed_at,
              u.id as user_id, u.email, u.first_name, u.last_name, u.phone, u.last_login_ip
       FROM ${this.schema}.course_campaign_redemptions ccr
       JOIN ${this.schema}.users u ON u.id = ccr.user_id
       WHERE ccr.campaign_link_id = $1 AND ccr.organization_id = $2
       ORDER BY ccr.redeemed_at DESC`, [campaignId, organizationId]);
        return res.rows.map((r) => ({
            ...r,
            redeemed_at_utc: DateTimeUtils_1.DateTimeUtils.toUtcIsoString(r.redeemed_at),
        }));
    }
    /**
     * Toggle Active / Inactive switch for an outreach campaign link.
     */
    async ToggleCampaignStatus(organizationId, campaignId, isActive) {
        const res = await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.course_campaign_links
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND organization_id = $3
       RETURNING *`, [isActive, campaignId, organizationId]);
        if (res.rowCount === 0) {
            throw ApiError_1.ApiError.notFound('Campaign link not found.');
        }
        return res.rows[0];
    }
}
exports.CampaignService = CampaignService;
