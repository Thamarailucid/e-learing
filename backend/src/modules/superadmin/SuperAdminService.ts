import { executeQuery } from '../../database/connection';
import { EnvironmentConfig } from '../../config/environment';
import { ApiError } from '../../utils/ApiError';
import { PasswordUtils } from '../../utils/PasswordUtils';
import { DateTimeUtils } from '../../utils/DateTimeUtils';
import { isLoopbackIp, FetchPublicIp } from '../../utils/ClientIpResolver';
import { FileStorageFactory } from '../../services/storage/FileStorageFactory';
import { AssetNamingUtils } from '../../utils/AssetNamingUtils';

export class SuperAdminService {
  private schema = EnvironmentConfig.database.schema;
  private storage = FileStorageFactory.getInstance();

  async GetSuperAdminDashboard() {
    const orgsCountRes = await executeQuery(`SELECT COUNT(*) as count FROM ${this.schema}.organizations`);
    const activeOrgsRes = await executeQuery(`SELECT COUNT(*) as count FROM ${this.schema}.organizations WHERE status = 'ACTIVE'`);
    const usersCountRes = await executeQuery(`SELECT COUNT(*) as count FROM ${this.schema}.users WHERE is_super_admin = FALSE`);
    const coursesCountRes = await executeQuery(`SELECT COUNT(*) as count FROM ${this.schema}.courses`);
    const certsCountRes = await executeQuery(`SELECT COUNT(*) as count FROM ${this.schema}.certificates`);

    return {
      totalOrganizations: parseInt(orgsCountRes.rows[0].count, 10),
      activeOrganizations: parseInt(activeOrgsRes.rows[0].count, 10),
      totalUsers: parseInt(usersCountRes.rows[0].count, 10),
      totalCourses: parseInt(coursesCountRes.rows[0].count, 10),
      totalCertificatesIssued: parseInt(certsCountRes.rows[0].count, 10),
      storageUsedGb: 12.4,
      bandwidthUsedGb: 48.6,
      monthlyRecurringRevenue: 15998,
    };
  }

  async GetOrganizationList(page = 1, pageSize = 20, search?: string) {
    const offset = (page - 1) * pageSize;
    let whereClause = '';
    const params: any[] = [pageSize, offset];

    if (search) {
      whereClause = 'WHERE (o.name ILIKE $3 OR o.slug ILIKE $3 OR u.email ILIKE $3 OR u.first_name ILIKE $3 OR u.last_name ILIKE $3)';
      params.push(`%${search}%`);
    }

    const countRes = await executeQuery(
      `SELECT COUNT(*) as count
       FROM ${this.schema}.organizations o
       LEFT JOIN LATERAL (
         SELECT u.id, u.email, u.first_name, u.last_name
         FROM ${this.schema}.organization_members om
         JOIN ${this.schema}.users u ON u.id = om.user_id
         WHERE om.organization_id = o.id AND om.role_id IN ('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN')
         ORDER BY CASE WHEN om.role_id = 'ORGANIZATION_OWNER' THEN 0 ELSE 1 END, om.created_at ASC
         LIMIT 1
       ) u ON TRUE
       ${search ? 'WHERE (o.name ILIKE $1 OR o.slug ILIKE $1 OR u.email ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1)' : ''}`,
      search ? [`%${search}%`] : []
    );

    const totalRecords = parseInt(countRes.rows[0].count, 10);
    const totalPages = Math.ceil(totalRecords / pageSize);

    const listRes = await executeQuery(
      `SELECT o.id, o.name, o.slug, o.domain, o.status, o.plan_type, o.max_students, o.max_courses, o.logo_url, o.favicon_url, o.created_at,
        o.license_type, o.license_start_date, o.license_end_date, o.license_is_active, o.show_plan_tier_to_org, o.license_warning_days,
        (SELECT COUNT(*) FROM ${this.schema}.organization_members om WHERE om.organization_id = o.id AND om.role_id = 'STUDENT') as student_count,
        (SELECT COUNT(*) FROM ${this.schema}.courses c WHERE c.organization_id = o.id) as course_count,
        u.id as owner_user_id,
        u.email as owner_email,
        u.first_name as owner_first_name,
        u.last_name as owner_last_name,
        u.phone as owner_phone,
        u.last_login_at as owner_last_login_at,
        u.last_login_ip as owner_last_login_ip,
        u.is_active as owner_is_active
       FROM ${this.schema}.organizations o
       LEFT JOIN LATERAL (
         SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.last_login_at, u.last_login_ip, u.is_active
         FROM ${this.schema}.organization_members om
         JOIN ${this.schema}.users u ON u.id = om.user_id
         WHERE om.organization_id = o.id AND om.role_id IN ('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN')
         ORDER BY CASE WHEN om.role_id = 'ORGANIZATION_OWNER' THEN 0 ELSE 1 END, om.created_at ASC
         LIMIT 1
       ) u ON TRUE
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const now = Date.now();
    const publicFallback = await FetchPublicIp();
    const formattedData = listRes.rows.map((row) => {
      const endDate = row.license_end_date ? new Date(row.license_end_date).getTime() : null;
      const warningDays = row.license_warning_days !== undefined && row.license_warning_days !== null ? row.license_warning_days : 2;
      const warningMs = warningDays * 24 * 60 * 60 * 1000;
      const isExpired = row.license_is_active === false || (endDate !== null && now >= endDate);
      const isExpiringSoon = !isExpired && endDate !== null && (endDate - now <= warningMs);
      const daysRemaining = endDate !== null ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : null;

      let licenseStatus = 'ACTIVE';
      if (row.license_is_active === false) licenseStatus = 'DISABLED';
      else if (isExpired) licenseStatus = 'EXPIRED';
      else if (isExpiringSoon) licenseStatus = 'EXPIRING_SOON';

      return {
        ...row,
        owner_last_login_ip: isLoopbackIp(row.owner_last_login_ip) ? (row.owner_last_login_at ? publicFallback : null) : row.owner_last_login_ip,
        license_status: licenseStatus,
        is_expired: isExpired,
        is_expiring_soon: isExpiringSoon,
        days_remaining: daysRemaining,
        owner_last_login_at: row.owner_last_login_at ? DateTimeUtils.toUtcIsoString(row.owner_last_login_at) : null,
        license_start_date: row.license_start_date ? DateTimeUtils.toUtcIsoString(row.license_start_date) : null,
        license_end_date: row.license_end_date ? DateTimeUtils.toUtcIsoString(row.license_end_date) : null,
      };
    });

    return {
      data: formattedData,
      pagination: { page, pageSize, totalRecords, totalPages },
    };
  }

  async CreateOrganization(
    data: {
      name: string;
      slug: string;
      domain?: string;
      planType?: string;
      licenseType?: string;
      licenseStartDate?: string;
      licenseEndDate?: string;
      licenseIsActive?: boolean;
      showPlanTierToOrg?: boolean;
      licenseWarningDays?: number;
      ownerEmail: string;
      ownerFirstName: string;
      ownerLastName: string;
      ownerPassword?: string;
    },
    actorUserId?: string,
    clientIp?: string,
    userAgent?: string
  ) {
    const slugNorm = data.slug.toLowerCase().trim();
    const existing = await executeQuery(
      `SELECT id FROM ${this.schema}.organizations WHERE slug = $1`,
      [slugNorm]
    );
    if (existing.rowCount! > 0) {
      throw ApiError.conflict('An organization with this slug already exists.');
    }

    const orgRes = await executeQuery(
      `INSERT INTO ${this.schema}.organizations (
        business_id, org_prefix, name, slug, domain, plan_type, status,
        license_type, license_start_date, license_end_date,
        license_is_active, show_plan_tier_to_org, license_warning_days
       )
       VALUES (
         ${this.schema}.generate_business_id('ORG'),
         UPPER(SUBSTRING(REGEXP_REPLACE($1, '[^A-Za-z]', '', 'g'), 1, 3)),
         $1, $2, $3, $4, 'ACTIVE', $5, COALESCE($6, CURRENT_TIMESTAMP), COALESCE($7, CURRENT_TIMESTAMP + INTERVAL '365 days'), COALESCE($8, TRUE), COALESCE($9, TRUE), COALESCE($10, 2)
       )
       RETURNING id, business_id, org_prefix, name, slug, status, plan_type, license_type, license_start_date, license_end_date, license_is_active, show_plan_tier_to_org, license_warning_days`,
      [
        data.name,
        slugNorm,
        data.domain || null,
        data.planType || 'STARTER',
        data.licenseType || 'SUBSCRIPTION',
        data.licenseStartDate || null,
        data.licenseEndDate || null,
        data.licenseIsActive !== undefined ? data.licenseIsActive : null,
        data.showPlanTierToOrg !== undefined ? data.showPlanTierToOrg : null,
        data.licenseWarningDays !== undefined ? data.licenseWarningDays : null,
      ]
    );
    const org = orgRes.rows[0];

    // Seed default theme settings for organization
    await executeQuery(
      `INSERT INTO ${this.schema}.organization_theme_settings (organization_id)
       VALUES ($1) ON CONFLICT DO NOTHING`,
      [org.id]
    );

    // Create or find Owner user
    const ownerEmailNorm = data.ownerEmail.toLowerCase().trim();
    let ownerId: string;

    const userRes = await executeQuery(
      `SELECT id FROM ${this.schema}.users WHERE email = $1`,
      [ownerEmailNorm]
    );

    let generatedPassword: string | undefined;
    if (userRes.rowCount === 0) {
      const defaultPwd = data.ownerPassword || PasswordUtils.generateSecurePassword(12);
      if (!data.ownerPassword) {
        generatedPassword = defaultPwd;
      }
      const hash = await PasswordUtils.hashPassword(defaultPwd);
      const newUser = await executeQuery(
        `INSERT INTO ${this.schema}.users (business_id, email, password_hash, first_name, last_name, is_active, email_verified, must_reset_password)
         VALUES (${this.schema}.generate_business_id($1), $2, $3, $4, $5, TRUE, TRUE, TRUE)
         RETURNING id`,
        [org.org_prefix + 'STF', ownerEmailNorm, hash, data.ownerFirstName, data.ownerLastName]
      );
      ownerId = newUser.rows[0].id;
    } else {
      ownerId = userRes.rows[0].id;
    }

    const fullPermissions = JSON.stringify({
      can_edit_students: true,
      can_reset_student_passwords: true,
      can_manage_courses: true,
      can_manage_campaigns: true,
      can_manage_staff: true,
      can_manage_bulk_staff: true,
      can_view_reports: true,
    });

    // Attach user as ORGANIZATION_OWNER
    await executeQuery(
      `INSERT INTO ${this.schema}.organization_members (organization_id, user_id, role_id, permissions, status)
       VALUES ($1, $2, 'ORGANIZATION_OWNER', $3::jsonb, 'ACTIVE')
       ON CONFLICT (organization_id, user_id) DO UPDATE SET role_id = 'ORGANIZATION_OWNER', permissions = $3::jsonb, status = 'ACTIVE'`,
      [org.id, ownerId, fullPermissions]
    );

    // Record audit log for organization creation
    try {
      let resolvedIp = clientIp;
      if (isLoopbackIp(resolvedIp)) {
        resolvedIp = await FetchPublicIp();
      }
      await executeQuery(
        `INSERT INTO ${this.schema}.audit_logs (organization_id, user_id, action, resource, resource_id, ip_address, user_agent, metadata)
         VALUES ($1::uuid, $2::uuid, 'ORGANIZATION_CREATED', 'ORGANIZATION', $1::text, $3, $4, $5::jsonb)`,
        [
          org.id,
          actorUserId || null,
          resolvedIp || null,
          userAgent || null,
          JSON.stringify({
            organizationId: org.id,
            organizationName: org.name,
            slug: org.slug,
            planType: org.plan_type,
            licenseType: org.license_type,
            ownerEmail: ownerEmailNorm,
            ownerName: `${data.ownerFirstName} ${data.ownerLastName}`.trim(),
            createdBySuperAdmin: true,
          }),
        ]
      );
    } catch (auditErr) {
      console.error('[SuperAdminService] Failed to record audit log for organization creation:', auditErr);
    }

    return {
      ...org,
      ownerEmail: ownerEmailNorm,
      initialPassword: data.ownerPassword || generatedPassword,
    };
  }

  async SuspendOrganization(organizationId: string, actorUserId?: string, clientIp?: string, userAgent?: string) {
    const res = await executeQuery(
      `UPDATE ${this.schema}.organizations SET status = 'SUSPENDED', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING id, name, status`,
      [organizationId]
    );
    if (res.rowCount === 0) throw ApiError.notFound('Organization not found.');

    try {
      let resolvedIp = clientIp;
      if (isLoopbackIp(resolvedIp)) {
        resolvedIp = await FetchPublicIp();
      }
      await executeQuery(
        `INSERT INTO ${this.schema}.audit_logs (organization_id, user_id, action, resource, resource_id, ip_address, user_agent, metadata)
         VALUES ($1::uuid, $2::uuid, 'ORGANIZATION_SUSPENDED', 'ORGANIZATION', $1::text, $3, $4, $5::jsonb)`,
        [
          organizationId,
          actorUserId || null,
          resolvedIp || null,
          userAgent || null,
          JSON.stringify({
            organizationId,
            organizationName: res.rows[0].name,
            status: 'SUSPENDED',
          }),
        ]
      );
    } catch (auditErr) {
      console.error('[SuperAdminService] Failed to record audit log for organization suspension:', auditErr);
    }

    return res.rows[0];
  }

  async ActivateOrganization(organizationId: string, actorUserId?: string, clientIp?: string, userAgent?: string) {
    const res = await executeQuery(
      `UPDATE ${this.schema}.organizations SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING id, name, status`,
      [organizationId]
    );
    if (res.rowCount === 0) throw ApiError.notFound('Organization not found.');

    try {
      let resolvedIp = clientIp;
      if (isLoopbackIp(resolvedIp)) {
        resolvedIp = await FetchPublicIp();
      }
      await executeQuery(
        `INSERT INTO ${this.schema}.audit_logs (organization_id, user_id, action, resource, resource_id, ip_address, user_agent, metadata)
         VALUES ($1::uuid, $2::uuid, 'ORGANIZATION_ACTIVATED', 'ORGANIZATION', $1::text, $3, $4, $5::jsonb)`,
        [
          organizationId,
          actorUserId || null,
          resolvedIp || null,
          userAgent || null,
          JSON.stringify({
            organizationId,
            organizationName: res.rows[0].name,
            status: 'ACTIVE',
          }),
        ]
      );
    } catch (auditErr) {
      console.error('[SuperAdminService] Failed to record audit log for organization activation:', auditErr);
    }

    return res.rows[0];
  }

  async UpdateOrganizationPlanTier(organizationId: string, data: {
    planType: 'STARTER' | 'BUSINESS' | 'ENTERPRISE';
    maxStudents?: number;
    maxCourses?: number;
    licenseType?: string;
    licenseStartDate?: string;
    licenseEndDate?: string;
    licenseIsActive?: boolean;
    showPlanTierToOrg?: boolean;
    licenseWarningDays?: number;
  }, clientIp?: string) {
    let maxStudents = data.maxStudents;
    let maxCourses = data.maxCourses;

    if (!maxStudents) {
      if (data.planType === 'STARTER') maxStudents = 200;
      else if (data.planType === 'BUSINESS') maxStudents = 2000;
      else maxStudents = 100000;
    }

    if (!maxCourses) {
      if (data.planType === 'STARTER') maxCourses = 25;
      else if (data.planType === 'BUSINESS') maxCourses = 200;
      else maxCourses = 10000;
    }

    const res = await executeQuery(
      `UPDATE ${this.schema}.organizations
       SET plan_type = $1,
           max_students = $2,
           max_courses = $3,
           license_type = CASE WHEN $5::varchar IS NOT NULL THEN $5::varchar ELSE license_type END,
           license_start_date = CASE WHEN $6::timestamptz IS NOT NULL THEN $6::timestamptz ELSE license_start_date END,
           license_end_date = CASE WHEN $7::timestamptz IS NOT NULL THEN $7::timestamptz ELSE license_end_date END,
           license_is_active = CASE WHEN $8::boolean IS NOT NULL THEN $8::boolean ELSE license_is_active END,
           show_plan_tier_to_org = CASE WHEN $9::boolean IS NOT NULL THEN $9::boolean ELSE show_plan_tier_to_org END,
           license_warning_days = CASE WHEN $10::integer IS NOT NULL THEN $10::integer ELSE license_warning_days END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, name, slug, plan_type, max_students, max_courses, status,
                 license_type, license_start_date, license_end_date, license_is_active,
                 show_plan_tier_to_org, license_warning_days`,
      [
        data.planType,
        maxStudents,
        maxCourses,
        organizationId,
        data.licenseType || null,
        data.licenseStartDate || null,
        data.licenseEndDate || null,
        data.licenseIsActive !== undefined ? data.licenseIsActive : null,
        data.showPlanTierToOrg !== undefined ? data.showPlanTierToOrg : null,
        data.licenseWarningDays !== undefined ? data.licenseWarningDays : null,
      ]
    );

    if (res.rowCount === 0) throw ApiError.notFound('Organization not found.');

    if (isLoopbackIp(clientIp)) {
      clientIp = await FetchPublicIp();
    }

    // Log to audit log
    await executeQuery(
      `INSERT INTO ${this.schema}.audit_logs (organization_id, action, resource, resource_id, ip_address, metadata)
       VALUES ($1::uuid, 'PLAN_TIER_UPDATED', 'ORGANIZATION', $2::text, $3::text, $4::jsonb)`,
      [organizationId, organizationId, clientIp, JSON.stringify(data)]
    );

    return res.rows[0];
  }

  async GetPlatformAuditLogList(
    pageOrOptions: number | {
      page?: number;
      pageSize?: number;
      search?: string;
      category?: string;
      action?: string;
      resource?: string;
      organizationId?: string;
      startDate?: string;
      endDate?: string;
    } = 1,
    pageSizeParam = 30
  ) {
    let page = 1;
    let pageSize = 30;
    let search: string | undefined;
    let category: string | undefined;
    let action: string | undefined;
    let resource: string | undefined;
    let organizationId: string | undefined;
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (typeof pageOrOptions === 'number') {
      page = pageOrOptions || 1;
      pageSize = pageSizeParam || 30;
    } else if (typeof pageOrOptions === 'object' && pageOrOptions !== null) {
      page = pageOrOptions.page ? Number(pageOrOptions.page) : 1;
      pageSize = pageOrOptions.pageSize ? Number(pageOrOptions.pageSize) : 30;
      search = pageOrOptions.search;
      category = pageOrOptions.category;
      action = pageOrOptions.action;
      resource = pageOrOptions.resource;
      organizationId = pageOrOptions.organizationId;
      startDate = pageOrOptions.startDate;
      endDate = pageOrOptions.endDate;
    }

    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 30;
    if (pageSize > 100) pageSize = 100;
    const offset = (page - 1) * pageSize;

    const whereClauses: string[] = [];
    const params: any[] = [];

    // Search matches user email, name, organization name, action, resource, resource_id, ip_address
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      params.push(term);
      const pIdx = params.length;
      whereClauses.push(
        `(u.email ILIKE $${pIdx} OR u.first_name ILIKE $${pIdx} OR u.last_name ILIKE $${pIdx} OR o.name ILIKE $${pIdx} OR al.action ILIKE $${pIdx} OR al.resource ILIKE $${pIdx} OR al.resource_id ILIKE $${pIdx} OR al.ip_address ILIKE $${pIdx})`
      );
    }

    // Exact action filter takes priority
    if (action && action.trim() && action.trim() !== 'ALL') {
      params.push(action.trim());
      whereClauses.push(`al.action = $${params.length}`);
    } else if (category && category.trim() && category.trim() !== 'ALL') {
      const cat = category.trim().toUpperCase();
      if (cat === 'AUTH') {
        whereClauses.push(`al.action IN ('USER_LOGIN')`);
      } else if (cat === 'PASSWORD') {
        whereClauses.push(`al.action IN ('FIRST_TIME_PASSWORD_RESET', 'STAFF_PASSWORD_RESET', 'STUDENT_PASSWORD_RESET', 'SUPER_ADMIN_PASSWORD_RESET', 'ORGANIZATION_OWNER_PASSWORD_RESET')`);
      } else if (cat === 'SECURITY') {
        whereClauses.push(`(al.action ILIKE '%SECURITY%' OR al.action ILIKE '%VIOLATION%' OR al.action ILIKE '%PIRACY%')`);
      } else if (cat === 'PLAN') {
        whereClauses.push(`(al.action ILIKE 'PLAN_%' OR al.action ILIKE 'ORGANIZATION_STATUS_%')`);
      } else if (cat === 'STAFF') {
        whereClauses.push(`al.action ILIKE 'STAFF_%'`);
      } else if (cat === 'CAMPAIGN' || cat === 'COURSE') {
        whereClauses.push(`(al.action ILIKE 'CAMPAIGN_%' OR al.action ILIKE 'COURSE_%')`);
      }
    }

    // Resource filter
    if (resource && resource.trim() && resource.trim() !== 'ALL') {
      params.push(resource.trim());
      whereClauses.push(`al.resource = $${params.length}`);
    }

    // Organization filter ('global' vs specific org UUID)
    if (organizationId && organizationId.trim() && organizationId.trim() !== 'ALL') {
      if (organizationId.trim().toLowerCase() === 'global') {
        whereClauses.push(`al.organization_id IS NULL`);
      } else {
        params.push(organizationId.trim());
        whereClauses.push(`al.organization_id = $${params.length}::uuid`);
      }
    }

    // Date range filter
    if (startDate && startDate.trim()) {
      params.push(new Date(startDate.trim()));
      whereClauses.push(`al.created_at >= $${params.length}`);
    }

    if (endDate && endDate.trim()) {
      params.push(new Date(endDate.trim()));
      whereClauses.push(`al.created_at <= $${params.length}`);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await executeQuery(
      `SELECT COUNT(*) as count 
       FROM ${this.schema}.audit_logs al
       LEFT JOIN ${this.schema}.users u ON u.id = al.user_id
       LEFT JOIN ${this.schema}.organizations o ON o.id = al.organization_id
       ${whereString}`,
      params
    );
    const totalRecords = parseInt(countRes.rows[0].count, 10);
    const totalPages = Math.ceil(totalRecords / pageSize);

    const queryParams = [...params, pageSize, offset];
    const limitIdx = queryParams.length - 1;
    const offsetIdx = queryParams.length;

    const logsRes = await executeQuery(
      `SELECT al.id, al.organization_id, al.user_id, al.action, al.resource, al.resource_id,
              al.ip_address, al.user_agent, al.metadata, al.created_at,
              u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name,
              o.name as organization_name, o.slug as organization_slug
       FROM ${this.schema}.audit_logs al
       LEFT JOIN ${this.schema}.users u ON u.id = al.user_id
       LEFT JOIN ${this.schema}.organizations o ON o.id = al.organization_id
       ${whereString}
       ORDER BY al.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      queryParams
    );

    const publicFallback = await FetchPublicIp();
    const sanitizedRows = logsRes.rows.map((row) => ({
      ...row,
      ip_address: isLoopbackIp(row.ip_address) ? publicFallback : (row.ip_address || publicFallback),
    }));

    return {
      data: sanitizedRows,
      pagination: { page, pageSize, totalRecords, totalPages },
    };
  }

  async GetPlatformAuditLogFilterOptions() {
    const actionsRes = await executeQuery(
      `SELECT action, COUNT(*) as count 
       FROM ${this.schema}.audit_logs 
       GROUP BY action 
       ORDER BY count DESC`
    );

    const resourcesRes = await executeQuery(
      `SELECT DISTINCT resource 
       FROM ${this.schema}.audit_logs 
       WHERE resource IS NOT NULL 
       ORDER BY resource ASC`
    );

    const statsRes = await executeQuery(
      `SELECT 
         COUNT(*) as total_events,
         COUNT(CASE WHEN action ILIKE '%SECURITY%' OR action ILIKE '%VIOLATION%' OR action ILIKE '%PIRACY%' THEN 1 END) as security_events,
         COUNT(CASE WHEN action = 'USER_LOGIN' THEN 1 END) as auth_events,
         COUNT(CASE WHEN action ILIKE 'PLAN_%' OR action ILIKE '%PASSWORD_RESET%' THEN 1 END) as admin_events
       FROM ${this.schema}.audit_logs`
    );

    const orgsRes = await executeQuery(
      `SELECT id, name, slug FROM ${this.schema}.organizations ORDER BY name ASC`
    );

    const stats = statsRes.rows[0] || {};

    return {
      actions: actionsRes.rows.map(r => ({ action: r.action, count: parseInt(r.count, 10) })),
      resources: resourcesRes.rows.map(r => r.resource),
      organizations: orgsRes.rows,
      stats: {
        totalEvents: parseInt(stats.total_events || '0', 10),
        securityEvents: parseInt(stats.security_events || '0', 10),
        authEvents: parseInt(stats.auth_events || '0', 10),
        adminEvents: parseInt(stats.admin_events || '0', 10),
      }
    };
  }

  async ResetOrganizationOwnerPassword(organizationId: string, newPassword?: string, newEmail?: string, clientIp?: string) {
    const ownerRes = await executeQuery(
      `SELECT u.id, u.email, u.first_name, u.last_name, o.name as organization_name
       FROM ${this.schema}.organization_members om
       JOIN ${this.schema}.users u ON u.id = om.user_id
       JOIN ${this.schema}.organizations o ON o.id = om.organization_id
       WHERE om.organization_id = $1 AND om.role_id IN ('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN')
       ORDER BY CASE WHEN om.role_id = 'ORGANIZATION_OWNER' THEN 0 ELSE 1 END, om.created_at ASC
       LIMIT 1`,
      [organizationId]
    );

    if (ownerRes.rowCount === 0) {
      throw ApiError.notFound('No owner account found for this organization.');
    }

    const owner = ownerRes.rows[0];
    const targetPassword = newPassword || PasswordUtils.generateSecurePassword(12);
    const passwordHash = await PasswordUtils.hashPassword(targetPassword);

    const fields: string[] = ['password_hash = $1', 'must_reset_password = TRUE', 'current_session_id = NULL', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [passwordHash];

    let targetEmail = owner.email;
    if (newEmail && newEmail.toLowerCase().trim() !== owner.email) {
      targetEmail = newEmail.toLowerCase().trim();
      const checkEmail = await executeQuery(
        `SELECT id FROM ${this.schema}.users WHERE email = $1 AND id != $2`,
        [targetEmail, owner.id]
      );
      if (checkEmail.rowCount! > 0) {
        throw ApiError.badRequest('Email address is already in use by another user.');
      }
      params.push(targetEmail);
      fields.push(`email = $${params.length}`);
    }

    params.push(owner.id);
    await executeQuery(
      `UPDATE ${this.schema}.users SET ${fields.join(', ')} WHERE id = $${params.length}`,
      params
    );

    if (isLoopbackIp(clientIp)) {
      clientIp = await FetchPublicIp();
    }

    // Audit log
    await executeQuery(
      `INSERT INTO ${this.schema}.audit_logs (organization_id, action, resource, resource_id, ip_address, metadata)
       VALUES ($1::uuid, 'SUPER_ADMIN_PASSWORD_RESET', 'USER', $2::text, $3::text, $4::jsonb)`,
      [organizationId, owner.id, clientIp, JSON.stringify({ resetBy: 'SUPER_ADMIN', ownerEmail: targetEmail })]
    );

    return {
      organizationName: owner.organization_name,
      ownerUserId: owner.id,
      ownerEmail: targetEmail,
      ownerName: `${owner.first_name} ${owner.last_name}`,
      newPassword: targetPassword,
    };
  }

  async UpdateOrganizationOwner(
    organizationId: string,
    data: { email?: string; firstName?: string; lastName?: string; phone?: string; password?: string }
  ) {
    const ownerRes = await executeQuery(
      `SELECT u.id, u.email, u.first_name, u.last_name, o.name as organization_name
       FROM ${this.schema}.organization_members om
       JOIN ${this.schema}.users u ON u.id = om.user_id
       JOIN ${this.schema}.organizations o ON o.id = om.organization_id
       WHERE om.organization_id = $1 AND om.role_id IN ('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN')
       ORDER BY CASE WHEN om.role_id = 'ORGANIZATION_OWNER' THEN 0 ELSE 1 END, om.created_at ASC
       LIMIT 1`,
      [organizationId]
    );

    if (ownerRes.rowCount === 0) {
      throw ApiError.notFound('No owner account found for this organization.');
    }

    const owner = ownerRes.rows[0];
    const fields: string[] = [];
    const params: any[] = [owner.id];

    if (data.email) {
      const emailNorm = data.email.toLowerCase().trim();
      const checkRes = await executeQuery(
        `SELECT id FROM ${this.schema}.users WHERE email = $1 AND id != $2`,
        [emailNorm, owner.id]
      );
      if (checkRes.rowCount! > 0) {
        throw ApiError.badRequest('Email address is already in use by another user.');
      }
      params.push(emailNorm);
      fields.push(`email = $${params.length}`);
    }

    if (data.firstName) {
      params.push(data.firstName.trim());
      fields.push(`first_name = $${params.length}`);
    }

    if (data.lastName) {
      params.push(data.lastName.trim());
      fields.push(`last_name = $${params.length}`);
    }

    if (data.phone !== undefined) {
      params.push(data.phone ? data.phone.trim() : null);
      fields.push(`phone = $${params.length}`);
    }

    if (data.password) {
      const passwordHash = await PasswordUtils.hashPassword(data.password);
      params.push(passwordHash);
      fields.push(`password_hash = $${params.length}`);
    }

    if (fields.length > 0) {
      params.push(new Date());
      fields.push(`updated_at = $${params.length}`);

      await executeQuery(
        `UPDATE ${this.schema}.users SET ${fields.join(', ')} WHERE id = $1`,
        params
      );
    }

    const updatedUserRes = await executeQuery(
      `SELECT id, email, first_name, last_name, phone, last_login_at, is_active
       FROM ${this.schema}.users WHERE id = $1`,
      [owner.id]
    );

    try {
      let resolvedIp = clientIp;
      if (isLoopbackIp(resolvedIp)) {
        resolvedIp = await FetchPublicIp();
      }
      await executeQuery(
        `INSERT INTO ${this.schema}.audit_logs (organization_id, user_id, action, resource, resource_id, ip_address, user_agent, metadata)
         VALUES ($1::uuid, $2::uuid, 'ORGANIZATION_OWNER_UPDATED', 'USER', $3::text, $4, $5, $6::jsonb)`,
        [
          organizationId,
          actorUserId || null,
          owner.id,
          resolvedIp || null,
          userAgent || null,
          JSON.stringify({
            organizationId,
            organizationName: owner.organization_name,
            ownerEmail: updatedUserRes.rows[0].email,
            updatedFields: Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined),
          }),
        ]
      );
    } catch (auditErr) {
      console.error('[SuperAdminService] Failed to record audit log for owner update:', auditErr);
    }

    return {
      organizationId,
      organizationName: owner.organization_name,
      owner: updatedUserRes.rows[0],
    };
  }

  async UpdateOrganizationProfile(
    organizationId: string,
    data: { name?: string; slug?: string; domain?: string; logoUrl?: string; faviconUrl?: string },
    actorUserId?: string,
    clientIp?: string,
    userAgent?: string
  ) {
    const fields: string[] = [];
    const params: any[] = [organizationId];

    if (data.name) {
      params.push(data.name);
      fields.push(`name = $${params.length}`);
    }
    if (data.slug) {
      const slugNorm = data.slug.toLowerCase().trim();
      params.push(slugNorm);
      fields.push(`slug = $${params.length}`);
    }
    if (data.domain !== undefined) {
      params.push(data.domain || null);
      fields.push(`domain = $${params.length}`);
    }
    if (data.logoUrl !== undefined) {
      params.push(data.logoUrl || null);
      fields.push(`logo_url = $${params.length}`);
    }
    if (data.faviconUrl !== undefined) {
      params.push(data.faviconUrl || null);
      fields.push(`favicon_url = $${params.length}`);
    }

    if (fields.length === 0) {
      const current = await executeQuery(`SELECT * FROM ${this.schema}.organizations WHERE id = $1`, [organizationId]);
      return current.rows[0];
    }

    params.push(new Date());
    fields.push(`updated_at = $${params.length}`);

    const res = await executeQuery(
      `UPDATE ${this.schema}.organizations SET ${fields.join(', ')} WHERE id = $1
       RETURNING id, name, slug, domain, logo_url, favicon_url, status, plan_type`,
      params
    );

    if (res.rowCount === 0) throw ApiError.notFound('Organization not found.');

    try {
      let resolvedIp = clientIp;
      if (isLoopbackIp(resolvedIp)) {
        resolvedIp = await FetchPublicIp();
      }
      await executeQuery(
        `INSERT INTO ${this.schema}.audit_logs (organization_id, user_id, action, resource, resource_id, ip_address, user_agent, metadata)
         VALUES ($1::uuid, $2::uuid, 'ORGANIZATION_PROFILE_UPDATED', 'ORGANIZATION', $1::text, $3, $4, $5::jsonb)`,
        [
          organizationId,
          actorUserId || null,
          resolvedIp || null,
          userAgent || null,
          JSON.stringify({
            organizationId,
            updatedFields: data,
          }),
        ]
      );
    } catch (auditErr) {
      console.error('[SuperAdminService] Failed to record audit log for profile update:', auditErr);
    }

    return res.rows[0];
  }

  async UploadOrganizationLogo(organizationId: string, actorUserId: string, file: Express.Multer.File) {
    const orgRes = await executeQuery(
      `SELECT id, slug, name FROM ${this.schema}.organizations WHERE id = $1`,
      [organizationId]
    );
    if (orgRes.rowCount === 0) throw ApiError.notFound('Organization not found.');
    const org = orgRes.rows[0];

    const customFileName = AssetNamingUtils.getLogoName(org.slug, file.originalname);
    const uploadResult = await this.storage.UploadFile({
      organizationId,
      category: 'logos',
      fileName: file.originalname,
      customFileName,
      mimeType: file.mimetype,
      buffer: file.buffer,
    });

    await executeQuery(
      `UPDATE ${this.schema}.organizations SET logo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [uploadResult.url, organizationId]
    );

    return {
      url: uploadResult.url,
      fileName: customFileName,
    };
  }
}

export const superAdminService = new SuperAdminService();
