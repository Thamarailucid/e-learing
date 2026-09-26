"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizationService = exports.OrganizationService = void 0;
const connection_1 = require("../../database/connection");
const environment_1 = require("../../config/environment");
const ApiError_1 = require("../../utils/ApiError");
const FileStorageFactory_1 = require("../../services/storage/FileStorageFactory");
const AssetNamingUtils_1 = require("../../utils/AssetNamingUtils");
class OrganizationService {
    schema = environment_1.EnvironmentConfig.database.schema;
    storage = FileStorageFactory_1.FileStorageFactory.getInstance();
    async GetOrganizationDetails(organizationId) {
        const res = await (0, connection_1.executeQuery)(`SELECT id, name, slug, domain, logo_url, favicon_url, status, plan_type, max_students, max_courses, created_at,
              license_type, license_start_date, license_end_date, license_is_active, show_plan_tier_to_org, license_warning_days
       FROM ${this.schema}.organizations WHERE id = $1`, [organizationId]);
        if (res.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Organization not found.');
        const row = res.rows[0];
        const now = Date.now();
        const endDate = row.license_end_date ? new Date(row.license_end_date).getTime() : null;
        const warningDays = row.license_warning_days !== undefined && row.license_warning_days !== null ? row.license_warning_days : 2;
        const warningMs = warningDays * 24 * 60 * 60 * 1000;
        const isExpired = row.license_is_active === false || (endDate !== null && now >= endDate);
        const isExpiringSoon = !isExpired && endDate !== null && (endDate - now <= warningMs);
        const daysRemaining = endDate !== null ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : null;
        let licenseStatus = 'ACTIVE';
        if (row.license_is_active === false)
            licenseStatus = 'DISABLED';
        else if (isExpired)
            licenseStatus = 'EXPIRED';
        else if (isExpiringSoon)
            licenseStatus = 'EXPIRING_SOON';
        return {
            ...row,
            license_status: licenseStatus,
            is_expired: isExpired,
            is_expiring_soon: isExpiringSoon,
            days_remaining: daysRemaining,
        };
    }
    async UpdateOrganizationDetails(organizationId, data) {
        const fields = [];
        const params = [organizationId];
        if (data.name) {
            params.push(data.name);
            fields.push(`name = $${params.length}`);
        }
        if (data.domain !== undefined) {
            params.push(data.domain);
            fields.push(`domain = $${params.length}`);
        }
        if (data.logoUrl !== undefined) {
            params.push(data.logoUrl);
            fields.push(`logo_url = $${params.length}`);
        }
        if (data.faviconUrl !== undefined) {
            params.push(data.faviconUrl);
            fields.push(`favicon_url = $${params.length}`);
        }
        if (fields.length === 0)
            return this.GetOrganizationDetails(organizationId);
        params.push(new Date());
        fields.push(`updated_at = $${params.length}`);
        const res = await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.organizations SET ${fields.join(', ')} WHERE id = $1 RETURNING *`, params);
        return res.rows[0];
    }
    async GetOrganizationThemeSettings(organizationId) {
        const res = await (0, connection_1.executeQuery)(`SELECT * FROM ${this.schema}.organization_theme_settings WHERE organization_id = $1`, [organizationId]);
        if (res.rowCount === 0) {
            return {
                primaryColor: '#000000',
                secondaryColor: '#ffffff',
                sidebarColor: '#0a0a0a',
                sidebarTextColor: '#ffffff',
                borderColor: '#e5e5e5',
                buttonColor: '#111111',
                buttonTextColor: '#ffffff',
                fontFamily: 'Inter, system-ui, sans-serif',
                borderRadiusMd: '12px',
                certificateTitle: 'Certificate of Completion',
                certificateSignatoryName: 'Academic Director',
                certificateSignatoryTitle: 'Head of Education & Certification',
                certificateSignatureUrl: null,
                certificateBackgroundUrl: null,
                certificateAccentColor: '#0f172a',
            };
        }
        const row = res.rows[0];
        return {
            primaryColor: row.primary_color,
            secondaryColor: row.secondary_color,
            sidebarColor: row.sidebar_color,
            sidebarTextColor: row.sidebar_text_color,
            borderColor: row.border_color,
            buttonColor: row.button_color,
            buttonTextColor: row.button_text_color,
            fontFamily: row.font_family,
            borderRadiusMd: row.border_radius_md,
            certificateTitle: row.certificate_title || 'Certificate of Completion',
            certificateSignatoryName: row.certificate_signatory_name || 'Academic Director',
            certificateSignatoryTitle: row.certificate_signatory_title || 'Head of Education & Certification',
            certificateSignatureUrl: row.certificate_signature_url,
            certificateBackgroundUrl: row.certificate_background_url,
            certificateAccentColor: row.certificate_accent_color || '#0f172a',
        };
    }
    async UpdateOrganizationThemeSettings(organizationId, settings) {
        const existingRes = await (0, connection_1.executeQuery)(`SELECT * FROM ${this.schema}.organization_theme_settings WHERE organization_id = $1`, [organizationId]);
        const cur = existingRes.rows[0] || {};
        const primaryColor = settings.primaryColor ?? settings.primary_color ?? cur.primary_color ?? '#000000';
        const secondaryColor = settings.secondaryColor ?? settings.secondary_color ?? cur.secondary_color ?? '#ffffff';
        const sidebarColor = settings.sidebarColor ?? settings.sidebar_color ?? cur.sidebar_color ?? '#0a0a0a';
        const sidebarTextColor = settings.sidebarTextColor ?? settings.sidebar_text_color ?? cur.sidebar_text_color ?? '#ffffff';
        const borderColor = settings.borderColor ?? settings.border_color ?? cur.border_color ?? '#e5e5e5';
        const buttonColor = settings.buttonColor ?? settings.button_color ?? cur.button_color ?? '#111111';
        const buttonTextColor = settings.buttonTextColor ?? settings.button_text_color ?? cur.button_text_color ?? '#ffffff';
        const fontFamily = settings.fontFamily ?? settings.font_family ?? cur.font_family ?? 'Inter, system-ui, sans-serif';
        const borderRadiusMd = settings.borderRadiusMd ?? settings.border_radius_md ?? cur.border_radius_md ?? '12px';
        const certificateTitle = settings.certificateTitle ?? settings.certificate_title ?? cur.certificate_title ?? 'Certificate of Completion';
        const certificateSignatoryName = settings.certificateSignatoryName ?? settings.certificate_signatory_name ?? cur.certificate_signatory_name ?? 'Academic Director';
        const certificateSignatoryTitle = settings.certificateSignatoryTitle ?? settings.certificate_signatory_title ?? cur.certificate_signatory_title ?? 'Head of Education & Certification';
        const certificateSignatureUrl = settings.certificateSignatureUrl !== undefined ? settings.certificateSignatureUrl : (settings.certificate_signature_url !== undefined ? settings.certificate_signature_url : (cur.certificate_signature_url ?? null));
        const certificateBackgroundUrl = settings.certificateBackgroundUrl !== undefined ? settings.certificateBackgroundUrl : (settings.certificate_background_url !== undefined ? settings.certificate_background_url : (cur.certificate_background_url ?? null));
        const certificateAccentColor = settings.certificateAccentColor ?? settings.certificate_accent_color ?? cur.certificate_accent_color ?? '#0f172a';
        await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.organization_theme_settings (
        organization_id, primary_color, secondary_color, sidebar_color, sidebar_text_color,
        border_color, button_color, button_text_color, font_family, border_radius_md,
        certificate_title, certificate_signatory_name, certificate_signatory_title,
        certificate_signature_url, certificate_background_url, certificate_accent_color, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
      ON CONFLICT (organization_id) DO UPDATE SET
        primary_color = EXCLUDED.primary_color,
        secondary_color = EXCLUDED.secondary_color,
        sidebar_color = EXCLUDED.sidebar_color,
        sidebar_text_color = EXCLUDED.sidebar_text_color,
        border_color = EXCLUDED.border_color,
        button_color = EXCLUDED.button_color,
        button_text_color = EXCLUDED.button_text_color,
        font_family = EXCLUDED.font_family,
        border_radius_md = EXCLUDED.border_radius_md,
        certificate_title = EXCLUDED.certificate_title,
        certificate_signatory_name = EXCLUDED.certificate_signatory_name,
        certificate_signatory_title = EXCLUDED.certificate_signatory_title,
        certificate_signature_url = EXCLUDED.certificate_signature_url,
        certificate_background_url = EXCLUDED.certificate_background_url,
        certificate_accent_color = EXCLUDED.certificate_accent_color,
        updated_at = CURRENT_TIMESTAMP`, [
            organizationId,
            primaryColor,
            secondaryColor,
            sidebarColor,
            sidebarTextColor,
            borderColor,
            buttonColor,
            buttonTextColor,
            fontFamily,
            borderRadiusMd,
            certificateTitle,
            certificateSignatoryName,
            certificateSignatoryTitle,
            certificateSignatureUrl,
            certificateBackgroundUrl,
            certificateAccentColor,
        ]);
        return this.GetOrganizationThemeSettings(organizationId);
    }
    async GetOrganizationDashboard(organizationId) {
        const studentsRes = await (0, connection_1.executeQuery)(`SELECT COUNT(*) as count FROM ${this.schema}.organization_members WHERE organization_id = $1 AND role_id = 'STUDENT'`, [organizationId]);
        const staffRes = await (0, connection_1.executeQuery)(`SELECT COUNT(*) as count FROM ${this.schema}.organization_members WHERE organization_id = $1 AND role_id != 'STUDENT'`, [organizationId]);
        const coursesRes = await (0, connection_1.executeQuery)(`SELECT COUNT(*) as count FROM ${this.schema}.courses WHERE organization_id = $1`, [organizationId]);
        const completionsRes = await (0, connection_1.executeQuery)(`SELECT COUNT(*) as count FROM ${this.schema}.student_course_progress WHERE organization_id = $1 AND is_completed = TRUE`, [organizationId]);
        const certsRes = await (0, connection_1.executeQuery)(`SELECT COUNT(*) as count FROM ${this.schema}.certificates WHERE organization_id = $1`, [organizationId]);
        return {
            totalStudents: parseInt(studentsRes.rows[0].count, 10),
            totalStaff: parseInt(staffRes.rows[0].count, 10),
            totalCourses: parseInt(coursesRes.rows[0].count, 10),
            totalCompletions: parseInt(completionsRes.rows[0].count, 10),
            totalCertificatesIssued: parseInt(certsRes.rows[0].count, 10),
            averageCompletionRate: 68,
        };
    }
    async UploadOrganizationBranding(organizationId, type, file) {
        const orgRes = await (0, connection_1.executeQuery)(`SELECT id, slug FROM ${this.schema}.organizations WHERE id = $1`, [organizationId]);
        if (orgRes.rowCount === 0)
            throw ApiError_1.ApiError.notFound('Organization not found.');
        const org = orgRes.rows[0];
        let customFileName;
        let category;
        if (type === 'logo') {
            customFileName = AssetNamingUtils_1.AssetNamingUtils.getLogoName(org.slug, file.originalname);
            category = 'logos';
        }
        else if (type === 'favicon') {
            customFileName = AssetNamingUtils_1.AssetNamingUtils.getFaviconName(org.slug, file.originalname);
            category = 'favicons';
        }
        else if (type === 'certificate_background') {
            customFileName = AssetNamingUtils_1.AssetNamingUtils.getCertificateBackgroundName(org.slug, file.originalname);
            category = 'certificates';
        }
        else {
            customFileName = AssetNamingUtils_1.AssetNamingUtils.getCertificateSignatureName(org.slug, file.originalname);
            category = 'certificates';
        }
        const uploadResult = await this.storage.UploadFile({
            organizationId,
            category,
            fileName: file.originalname,
            customFileName,
            mimeType: file.mimetype,
            buffer: file.buffer,
        });
        if (type === 'logo' || type === 'favicon') {
            const updateCol = type === 'logo' ? 'logo_url' : 'favicon_url';
            await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.organizations SET ${updateCol} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [uploadResult.url, organizationId]);
        }
        else if (type === 'certificate_background') {
            await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.organization_theme_settings (organization_id, certificate_background_url, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (organization_id) DO UPDATE SET certificate_background_url = $2, updated_at = CURRENT_TIMESTAMP`, [organizationId, uploadResult.url]);
        }
        else if (type === 'certificate_signature') {
            await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.organization_theme_settings (organization_id, certificate_signature_url, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (organization_id) DO UPDATE SET certificate_signature_url = $2, updated_at = CURRENT_TIMESTAMP`, [organizationId, uploadResult.url]);
        }
        return {
            type,
            url: uploadResult.url,
            fileName: customFileName,
        };
    }
}
exports.OrganizationService = OrganizationService;
exports.organizationService = new OrganizationService();
