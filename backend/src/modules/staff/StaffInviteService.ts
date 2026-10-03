import crypto from 'crypto';
import { executeQuery } from '../../database/connection';
import { EnvironmentConfig } from '../../config/environment';
import { ApiError } from '../../utils/ApiError';
import { PasswordUtils } from '../../utils/PasswordUtils';
import { TokenUtils } from '../../utils/TokenUtils';
import { DateTimeUtils } from '../../utils/DateTimeUtils';
import { isLoopbackIp, FetchPublicIp } from '../../utils/ClientIpResolver';
import { staffService } from './StaffService';

export class StaffInviteService {
  private schema = EnvironmentConfig.database.schema;

  private generateInviteCode(roleId: string, customCode?: string): string {
    if (customCode && customCode.trim().length >= 4) {
      return customCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    }
    const prefix = 'STF';
    const roleShort = roleId.slice(0, 4).toUpperCase();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${roleShort}-${rand.slice(0, 3)}-${rand.slice(3)}`;
  }

  async CreateStaffInviteLink(
    organizationId: string,
    actorId: string,
    data: {
      title: string;
      roleId: string;
      permissions?: Record<string, boolean>;
      maxRegistrations?: number;
      expiresAt?: string;
      customInviteCode?: string;
    }
  ) {
    // 1. Get role defaults and merge custom permissions
    const basePermissions = staffService.getDefaultRolePermissions(data.roleId);
    const effectivePermissions = { ...basePermissions, ...(data.permissions || {}) };

    // Strict dependency: Managing campaigns requires course management
    if (data.permissions?.can_manage_campaigns === true || effectivePermissions.can_manage_campaigns === true) {
      effectivePermissions.can_manage_campaigns = true;
      effectivePermissions.can_manage_courses = true;
    } else if (data.permissions?.can_manage_courses === false || effectivePermissions.can_manage_courses === false) {
      effectivePermissions.can_manage_courses = false;
      effectivePermissions.can_manage_campaigns = false;
    }

    // Strict dependency: Managing bulk staff invites requires staff management
    if (data.permissions?.can_manage_bulk_staff === true || effectivePermissions.can_manage_bulk_staff === true) {
      effectivePermissions.can_manage_bulk_staff = true;
      effectivePermissions.can_manage_staff = true;
    } else if (data.permissions?.can_manage_staff === false || effectivePermissions.can_manage_staff === false) {
      effectivePermissions.can_manage_staff = false;
      effectivePermissions.can_manage_bulk_staff = false;
    }

    const inviteCode = this.generateInviteCode(data.roleId, data.customInviteCode);
    const maxRegistrations = data.maxRegistrations && data.maxRegistrations > 0 ? data.maxRegistrations : 500;
    const expiresAt = data.expiresAt ? new Date(data.expiresAt).toISOString() : null;

    const insertRes = await executeQuery(
      `INSERT INTO ${this.schema}.staff_invite_links (
        organization_id, invite_code, title, role_id, permissions,
        max_registrations, current_registrations, expires_at, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, 0, $7, TRUE, $8)
      RETURNING *`,
      [
        organizationId,
        inviteCode,
        data.title,
        data.roleId,
        JSON.stringify(effectivePermissions),
        maxRegistrations,
        expiresAt,
        actorId,
      ]
    );

    const record = insertRes.rows[0];

    // Fetch creator details
    let creatorName = 'Organization Admin';
    let creatorEmail = '';
    if (actorId) {
      const uRes = await executeQuery(
        `SELECT first_name, last_name, email FROM ${this.schema}.users WHERE id = $1`,
        [actorId]
      );
      if (uRes.rowCount! > 0) {
        creatorName = `${uRes.rows[0].first_name} ${uRes.rows[0].last_name}`.trim();
        creatorEmail = uRes.rows[0].email;
      }
    }

    return {
      ...record,
      creator_name: creatorName,
      creator_email: creatorEmail,
      share_path: `/staff/join?token=${record.invite_code}`,
    };
  }

  async GetStaffInviteList(organizationId: string) {
    const query = `
      SELECT sil.*,
             u.first_name as creator_first_name,
             u.last_name as creator_last_name,
             u.email as creator_email
      FROM ${this.schema}.staff_invite_links sil
      LEFT JOIN ${this.schema}.users u ON u.id = sil.created_by
      WHERE sil.organization_id = $1
      ORDER BY sil.created_at DESC
    `;

    const res = await executeQuery(query, [organizationId]);
    const now = new Date();

    return res.rows.map((r) => {
      const isExpired = r.expires_at ? new Date(r.expires_at) < now : false;
      const isQuotaFull = r.current_registrations >= r.max_registrations;
      const creatorName = r.creator_first_name
        ? `${r.creator_first_name} ${r.creator_last_name || ''}`.trim()
        : 'Organization Admin';

      return {
        ...r,
        creator_name: creatorName,
        creator_email: r.creator_email || null,
        is_expired: isExpired,
        is_quota_full: isQuotaFull,
        remaining_seats: Math.max(0, r.max_registrations - r.current_registrations),
        share_path: `/staff/join?token=${r.invite_code}`,
      };
    });
  }

  async ToggleStaffInviteStatus(organizationId: string, inviteId: string, isActive: boolean) {
    const res = await executeQuery(
      `UPDATE ${this.schema}.staff_invite_links
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [isActive, inviteId, organizationId]
    );

    if (res.rowCount === 0) {
      throw ApiError.notFound('Staff invite link not found.');
    }
    return res.rows[0];
  }

  async GetStaffInviteRegistrations(organizationId: string, inviteId: string) {
    const query = `
      SELECT sir.id as redemption_id, sir.created_at as joined_at, sir.client_ip,
             u.id as user_id, u.email, u.first_name, u.last_name, u.phone,
             om.role_id, om.status as member_status, om.permissions
      FROM ${this.schema}.staff_invite_redemptions sir
      JOIN ${this.schema}.users u ON u.id = sir.user_id
      JOIN ${this.schema}.organization_members om ON om.user_id = u.id AND om.organization_id = sir.organization_id
      WHERE sir.invite_id = $1 AND sir.organization_id = $2
      ORDER BY sir.created_at DESC
    `;

    const res = await executeQuery(query, [inviteId, organizationId]);
    return res.rows.map((row) => ({
      ...row,
      user_name: `${row.first_name} ${row.last_name}`.trim(),
    }));
  }

  // Public endpoint: lookup details before staff registers
  async GetStaffInviteDetails(inviteCode: string) {
    const res = await executeQuery(
      `SELECT sil.*,
              o.name as organization_name,
              o.slug as organization_slug,
              o.logo_url as organization_logo_url,
              r.name as role_name
       FROM ${this.schema}.staff_invite_links sil
       JOIN ${this.schema}.organizations o ON o.id = sil.organization_id
       LEFT JOIN ${this.schema}.roles r ON r.id = sil.role_id
       WHERE sil.invite_code = $1`,
      [inviteCode.trim().toUpperCase()]
    );

    if (res.rowCount === 0) {
      throw ApiError.notFound('Staff invitation link not found or invalid.');
    }

    const row = res.rows[0];
    const now = new Date();
    const isExpired = row.expires_at ? new Date(row.expires_at) < now : false;
    const isQuotaFull = row.current_registrations >= row.max_registrations;

    return {
      id: row.id,
      inviteCode: row.invite_code,
      title: row.title,
      roleId: row.role_id,
      roleName: row.role_name || row.role_id,
      permissions: row.permissions,
      isActive: row.is_active,
      isExpired,
      isQuotaFull,
      remainingSeats: Math.max(0, row.max_registrations - row.current_registrations),
      organization: {
        id: row.organization_id,
        name: row.organization_name,
        slug: row.organization_slug,
        logoUrl: row.organization_logo_url,
      },
    };
  }

  // Public endpoint: Staff Self-Registration via Invite Link
  async RegisterStaffViaInvite(
    inviteCode: string,
    data: {
      email: string;
      password?: string;
      firstName: string;
      lastName: string;
      phone?: string;
    },
    clientIp?: string
  ) {
    if (isLoopbackIp(clientIp)) {
      clientIp = await FetchPublicIp();
    }
    const inviteRes = await executeQuery(
      `SELECT * FROM ${this.schema}.staff_invite_links
       WHERE invite_code = $1`,
      [inviteCode.trim().toUpperCase()]
    );

    if (inviteRes.rowCount === 0) {
      throw ApiError.notFound('Invalid staff invitation link.');
    }

    const invite = inviteRes.rows[0];

    if (!invite.is_active) {
      throw ApiError.forbidden('This staff invitation link has been deactivated by the organization.');
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      throw ApiError.forbidden('This staff invitation link has expired.');
    }

    if (invite.current_registrations >= invite.max_registrations) {
      throw ApiError.forbidden('This staff invitation link has reached its maximum onboarding quota.');
    }

    const emailNorm = data.email.trim().toLowerCase();
    const targetPassword = data.password && data.password.length >= 6
      ? data.password
      : PasswordUtils.generateSecurePassword(12);
    const hash = await PasswordUtils.hashPassword(targetPassword);

    // 1. Create or Find User
    let userId: string;
    const existingUser = await executeQuery(
      `SELECT id, is_active FROM ${this.schema}.users WHERE email = $1`,
      [emailNorm]
    );

    if (existingUser.rowCount! > 0) {
      userId = existingUser.rows[0].id;
    } else {
      const orgLookup = await executeQuery(
        `SELECT COALESCE(org_prefix, 'ORG') as org_prefix FROM ${this.schema}.organizations WHERE id = $1`,
        [invite.organization_id]
      );
      const orgPrefix = (orgLookup.rowCount! > 0 ? orgLookup.rows[0].org_prefix : 'ORG') || 'ORG';
      const businessPrefix = orgPrefix + 'STF';

      const newUserRes = await executeQuery(
        `INSERT INTO ${this.schema}.users (business_id, email, password_hash, first_name, last_name, phone, is_active, email_verified, last_login_ip)
         VALUES (${this.schema}.generate_business_id($1), $2, $3, $4, $5, $6, TRUE, TRUE, $7)
         RETURNING id`,
        [businessPrefix, emailNorm, hash, data.firstName.trim(), data.lastName.trim(), data.phone || null, clientIp || null]
      );
      userId = newUserRes.rows[0].id;
    }

    // 2. Attach to organization with assigned role and permissions
    await executeQuery(
      `INSERT INTO ${this.schema}.organization_members (organization_id, user_id, role_id, permissions, status)
       VALUES ($1, $2, $3, $4::jsonb, 'ACTIVE')
       ON CONFLICT (organization_id, user_id)
       DO UPDATE SET role_id = EXCLUDED.role_id, permissions = EXCLUDED.permissions, status = 'ACTIVE'`,
      [invite.organization_id, userId, invite.role_id, JSON.stringify(invite.permissions)]
    );

    // 3. Record redemption
    await executeQuery(
      `INSERT INTO ${this.schema}.staff_invite_redemptions (invite_id, user_id, organization_id, client_ip)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (invite_id, user_id) DO NOTHING`,
      [invite.id, userId, invite.organization_id, clientIp || null]
    );

    // 4. Increment registration count
    await executeQuery(
      `UPDATE ${this.schema}.staff_invite_links
       SET current_registrations = current_registrations + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [invite.id]
    );

    // 5. Generate Auth Tokens for instant staff portal access
    const newSessionId = crypto.randomUUID();
    await executeQuery(
      `UPDATE ${this.schema}.users
       SET current_session_id = $1, last_login_at = CURRENT_TIMESTAMP, last_login_ip = $2
       WHERE id = $3`,
      [newSessionId, clientIp || null, userId]
    );

    const accessToken = TokenUtils.generateAccessToken({
      userId,
      email: emailNorm,
      isSuperAdmin: false,
      activeOrganizationId: invite.organization_id,
      role: invite.role_id,
      permissions: invite.permissions,
      sessionId: newSessionId,
    });
    const refreshToken = TokenUtils.generateRefreshToken({ userId });

    // 6. Audit log
    await executeQuery(
      `INSERT INTO ${this.schema}.audit_logs (
        organization_id, user_id, action, resource, resource_id, ip_address, metadata
      ) VALUES ($1, $2, 'STAFF_REGISTER_VIA_INVITE', 'staff_invite_links', $3, $4, $5::jsonb)`,
      [
        invite.organization_id,
        userId,
        invite.id,
        clientIp || null,
        JSON.stringify({
          staffEmail: emailNorm,
          role: invite.role_id,
          inviteCode,
        }),
      ]
    );

    return {
      tokens: { accessToken, refreshToken },
      user: {
        id: userId,
        email: emailNorm,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        role: invite.role_id,
        permissions: invite.permissions,
        organizationId: invite.organization_id,
      },
    };
  }
}

export const staffInviteService = new StaffInviteService();
