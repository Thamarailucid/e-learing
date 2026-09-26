"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffService = exports.StaffService = void 0;
const connection_1 = require("../../database/connection");
const environment_1 = require("../../config/environment");
const ApiError_1 = require("../../utils/ApiError");
const PasswordUtils_1 = require("../../utils/PasswordUtils");
const DateTimeUtils_1 = require("../../utils/DateTimeUtils");
class StaffService {
    schema = environment_1.EnvironmentConfig.database.schema;
    async getOrganizationPrimaryOwner(organizationId) {
        const res = await (0, connection_1.executeQuery)(`SELECT om.user_id, om.role_id, u.email, u.first_name, u.last_name
       FROM ${this.schema}.organization_members om
       JOIN ${this.schema}.users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND om.role_id IN ('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN')
       ORDER BY CASE WHEN om.role_id = 'ORGANIZATION_OWNER' THEN 0 ELSE 1 END, om.created_at ASC
       LIMIT 1`, [organizationId]);
        return res.rowCount > 0 ? res.rows[0] : null;
    }
    async GetStaffList(organizationId, page = 1, pageSize = 20, search) {
        const offset = (page - 1) * pageSize;
        let whereClause = `WHERE om.organization_id = $1 AND om.role_id != 'STUDENT'`;
        const params = [organizationId, pageSize, offset];
        if (search) {
            whereClause += ` AND (u.first_name ILIKE $4 OR u.last_name ILIKE $4 OR u.email ILIKE $4)`;
            params.push(`%${search}%`);
        }
        const countRes = await (0, connection_1.executeQuery)(`SELECT COUNT(*) as count
       FROM ${this.schema}.organization_members om
       JOIN ${this.schema}.users u ON u.id = om.user_id
       ${whereClause}`, search ? [organizationId, `%${search}%`] : [organizationId]);
        const totalRecords = parseInt(countRes.rows[0].count, 10);
        const totalPages = Math.ceil(totalRecords / pageSize);
        const listRes = await (0, connection_1.executeQuery)(`SELECT om.id as membership_id, om.role_id, om.status, om.created_at, om.permissions,
              u.id as user_id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
              u.last_login_at, u.last_login_ip,
              r.name as role_name,
              CASE 
                WHEN om.user_id = po.owner_user_id OR om.role_id = 'ORGANIZATION_OWNER' THEN TRUE
                ELSE FALSE
              END as is_primary_owner,
              CASE 
                WHEN om.role_id = 'ORGANIZATION_ADMIN' AND om.user_id != COALESCE(po.owner_user_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN TRUE
                ELSE FALSE
              END as is_delegated_admin
       FROM ${this.schema}.organization_members om
       JOIN ${this.schema}.users u ON u.id = om.user_id
       JOIN ${this.schema}.roles r ON r.id = om.role_id
       LEFT JOIN LATERAL (
         SELECT om2.user_id as owner_user_id
         FROM ${this.schema}.organization_members om2
         WHERE om2.organization_id = om.organization_id AND om2.role_id IN ('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN')
         ORDER BY CASE WHEN om2.role_id = 'ORGANIZATION_OWNER' THEN 0 ELSE 1 END, om2.created_at ASC
         LIMIT 1
       ) po ON TRUE
       ${whereClause}
       ORDER BY 
         CASE 
           WHEN (om.user_id = po.owner_user_id OR om.role_id = 'ORGANIZATION_OWNER') THEN 0
           WHEN om.role_id = 'ORGANIZATION_ADMIN' THEN 1
           ELSE 2
         END,
         om.created_at ASC
       LIMIT $2 OFFSET $3`, params);
        const formattedData = listRes.rows.map((row) => {
            let perms = row.permissions;
            if (typeof perms === 'string') {
                try {
                    perms = JSON.parse(perms);
                }
                catch {
                    perms = null;
                }
            }
            return {
                ...row,
                permissions: perms || {
                    can_edit_students: false,
                    can_reset_student_passwords: false,
                    can_manage_courses: false,
                    can_manage_campaigns: false,
                    can_manage_staff: false,
                    can_view_reports: false,
                },
                last_login_at_utc: row.last_login_at ? DateTimeUtils_1.DateTimeUtils.toUtcIsoString(row.last_login_at) : null,
                last_login_at_ist: row.last_login_at ? DateTimeUtils_1.DateTimeUtils.formatUtcToIst(row.last_login_at) : null,
            };
        });
        return {
            data: formattedData,
            pagination: { page, pageSize, totalRecords, totalPages },
        };
    }
    async CreateStaffMember(organizationId, data, actorUser) {
        const primaryOwner = await this.getOrganizationPrimaryOwner(organizationId);
        const isCallerOwner = (actorUser?.userId && actorUser.userId === primaryOwner?.user_id) || actorUser?.role === 'ORGANIZATION_OWNER';
        const isCallerSuperAdmin = Boolean(actorUser?.isSuperAdmin);
        const isCallerOwnerOrSuper = isCallerOwner || isCallerSuperAdmin;
        if (data.roleId === 'ORGANIZATION_OWNER' && !isCallerOwnerOrSuper) {
            throw ApiError_1.ApiError.forbidden('Only the primary Organization Owner or Super Admin can assign the Organization Owner role.');
        }
        const emailNorm = data.email.toLowerCase().trim();
        let userId;
        let initialPassword = data.password;
        let isGeneratedPassword = false;
        const userRes = await (0, connection_1.executeQuery)(`SELECT id FROM ${this.schema}.users WHERE email = $1`, [emailNorm]);
        if (userRes.rowCount === 0) {
            if (!initialPassword) {
                initialPassword = PasswordUtils_1.PasswordUtils.generateSecurePassword(12);
                isGeneratedPassword = true;
            }
            const hash = await PasswordUtils_1.PasswordUtils.hashPassword(initialPassword);
            const newUserRes = await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.users (email, password_hash, first_name, last_name, phone, is_active, email_verified, must_reset_password)
         VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, TRUE)
         RETURNING id`, [emailNorm, hash, data.firstName, data.lastName, data.phone || null]);
            userId = newUserRes.rows[0].id;
        }
        else {
            userId = userRes.rows[0].id;
        }
        const isFullRole = ['ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER'].includes(data.roleId);
        const effectivePermissions = isFullRole
            ? {
                can_edit_students: true,
                can_reset_student_passwords: true,
                can_manage_courses: true,
                can_manage_campaigns: true,
                can_manage_staff: true,
                can_view_reports: true,
            }
            : {
                can_edit_students: false,
                can_reset_student_passwords: false,
                can_manage_courses: false,
                can_manage_campaigns: false,
                can_manage_staff: false,
                can_view_reports: false,
                ...(data.permissions || {}),
            };
        // Strict dependency: Managing campaigns requires course management
        if (effectivePermissions.can_manage_courses === false) {
            effectivePermissions.can_manage_campaigns = false;
        }
        else if (effectivePermissions.can_manage_campaigns === true) {
            effectivePermissions.can_manage_courses = true;
        }
        // Attach to organization with role and permissions
        const memberRes = await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.organization_members (organization_id, user_id, role_id, permissions, status)
       VALUES ($1, $2, $3, $4::jsonb, 'ACTIVE')
       ON CONFLICT (organization_id, user_id)
       DO UPDATE SET role_id = EXCLUDED.role_id, permissions = EXCLUDED.permissions, status = 'ACTIVE'
       RETURNING *`, [organizationId, userId, data.roleId, JSON.stringify(effectivePermissions)]);
        return {
            ...memberRes.rows[0],
            email: emailNorm,
            firstName: data.firstName,
            lastName: data.lastName,
            permissions: effectivePermissions,
            initialPassword: initialPassword || undefined,
            isGeneratedPassword,
        };
    }
    async UpdateStaffMember(organizationId, staffUserId, data, actorUser) {
        const checkRes = await (0, connection_1.executeQuery)(`SELECT om.id, om.role_id, om.permissions, u.id as user_id, u.email
       FROM ${this.schema}.organization_members om
       JOIN ${this.schema}.users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND om.user_id = $2 AND om.role_id != 'STUDENT'`, [organizationId, staffUserId]);
        if (checkRes.rowCount === 0) {
            throw ApiError_1.ApiError.notFound('Staff member not found in this organization.');
        }
        const targetUser = checkRes.rows[0];
        const primaryOwner = await this.getOrganizationPrimaryOwner(organizationId);
        const isTargetOwner = (targetUser.user_id === primaryOwner?.user_id) || (targetUser.role_id === 'ORGANIZATION_OWNER');
        const isCallerOwner = (actorUser?.userId && actorUser.userId === primaryOwner?.user_id) || actorUser?.role === 'ORGANIZATION_OWNER';
        const isCallerSuperAdmin = Boolean(actorUser?.isSuperAdmin);
        const isCallerOwnerOrSuper = isCallerOwner || isCallerSuperAdmin;
        // Rule 1: Protected Owner - Subordinate staff/PAs CANNOT modify the Owner
        if (isTargetOwner && !isCallerOwnerOrSuper) {
            throw ApiError_1.ApiError.forbidden('Access restricted: Only the primary Organization Owner or Super Admin can modify the owner account.');
        }
        // Rule 2: Primary Owner cannot be demoted from Owner
        if (isTargetOwner && data.roleId && data.roleId !== 'ORGANIZATION_OWNER' && !isCallerSuperAdmin) {
            throw ApiError_1.ApiError.forbidden('The primary Organization Owner role is permanent and cannot be demoted.');
        }
        // Rule 3: Protected PA / Delegated Admin - Another Delegated Admin cannot modify a fellow admin
        if (targetUser.role_id === 'ORGANIZATION_ADMIN' && !isCallerOwnerOrSuper && actorUser?.userId !== targetUser.user_id) {
            throw ApiError_1.ApiError.forbidden('Access restricted: Only the primary Organization Owner or Super Admin can modify an administrator / PA account.');
        }
        // Rule 4: Promoting to Organization Owner
        if (data.roleId === 'ORGANIZATION_OWNER' && !isCallerOwnerOrSuper) {
            throw ApiError_1.ApiError.forbidden('Only the primary Organization Owner or Super Admin can assign the Organization Owner role.');
        }
        if (data.firstName || data.lastName || data.phone !== undefined) {
            await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.users
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             phone = COALESCE($3, phone),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`, [data.firstName || null, data.lastName || null, data.phone ?? null, staffUserId]);
        }
        const currentRole = data.roleId || checkRes.rows[0].role_id;
        const isFullRole = ['ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER'].includes(currentRole);
        let permissionsToSet = data.permissions;
        if (isFullRole) {
            permissionsToSet = {
                can_edit_students: true,
                can_reset_student_passwords: true,
                can_manage_courses: true,
                can_manage_campaigns: true,
                can_manage_staff: true,
                can_view_reports: true,
            };
        }
        else if (permissionsToSet) {
            const existingPerms = (checkRes.rows[0].permissions && typeof checkRes.rows[0].permissions === 'object')
                ? checkRes.rows[0].permissions
                : {};
            const merged = {
                ...existingPerms,
                ...permissionsToSet,
            };
            // Strict mutual dependency enforcement
            if (data.permissions?.can_manage_campaigns === true) {
                merged.can_manage_campaigns = true;
                merged.can_manage_courses = true;
            }
            else if (data.permissions?.can_manage_courses === false) {
                merged.can_manage_courses = false;
                merged.can_manage_campaigns = false;
            }
            else if (merged.can_manage_courses === false) {
                merged.can_manage_campaigns = false;
            }
            permissionsToSet = merged;
        }
        else if (data.roleId && data.roleId !== checkRes.rows[0].role_id) {
            // Role changed (e.g. Owner demotes PA to Instructor) and no permissions explicitly passed -> load role defaults
            permissionsToSet = this.getDefaultRolePermissions(data.roleId);
        }
        await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.organization_members
       SET role_id = COALESCE($1, role_id),
           status = COALESCE($2, status),
           permissions = CASE WHEN $3::jsonb IS NOT NULL THEN $3::jsonb ELSE permissions END,
           updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = $4 AND user_id = $5`, [
            data.roleId || null,
            data.status || null,
            permissionsToSet ? JSON.stringify(permissionsToSet) : null,
            organizationId,
            staffUserId,
        ]);
        const updatedRes = await (0, connection_1.executeQuery)(`SELECT om.id as membership_id, om.role_id, om.status, om.permissions,
              u.id as user_id, u.email, u.first_name, u.last_name, u.phone, u.last_login_at, u.last_login_ip,
              r.name as role_name
       FROM ${this.schema}.organization_members om
       JOIN ${this.schema}.users u ON u.id = om.user_id
       JOIN ${this.schema}.roles r ON r.id = om.role_id
       WHERE om.organization_id = $1 AND om.user_id = $2`, [organizationId, staffUserId]);
        return updatedRes.rows[0];
    }
    async ResetStaffPassword(organizationId, staffUserId, newPassword, actorId, actorName, actorRole, isSuperAdmin) {
        const checkRes = await (0, connection_1.executeQuery)(`SELECT om.id, om.role_id, u.id as user_id, u.email, u.first_name, u.last_name
       FROM ${this.schema}.organization_members om
       JOIN ${this.schema}.users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND om.user_id = $2 AND om.role_id != 'STUDENT'`, [organizationId, staffUserId]);
        if (checkRes.rowCount === 0) {
            throw ApiError_1.ApiError.notFound('Staff member not found in this organization.');
        }
        const staff = checkRes.rows[0];
        const primaryOwner = await this.getOrganizationPrimaryOwner(organizationId);
        const isTargetOwner = (staff.user_id === primaryOwner?.user_id) || (staff.role_id === 'ORGANIZATION_OWNER');
        const isCallerOwner = (actorId && actorId === primaryOwner?.user_id) || actorRole === 'ORGANIZATION_OWNER';
        const isCallerSuperAdmin = Boolean(isSuperAdmin);
        const isCallerOwnerOrSuper = isCallerOwner || isCallerSuperAdmin;
        // Rule 1: Protected Owner Password - Subordinates/PAs cannot reset Owner password
        if (isTargetOwner && !isCallerOwnerOrSuper) {
            throw ApiError_1.ApiError.forbidden('Access restricted: Only the primary Organization Owner or Super Admin can reset the owner password.');
        }
        // Rule 2: Protected Admin Password - Another delegated admin cannot reset an admin password
        if (staff.role_id === 'ORGANIZATION_ADMIN' && !isCallerOwnerOrSuper && actorId !== staff.user_id) {
            throw ApiError_1.ApiError.forbidden('Access restricted: Only the primary Organization Owner or Super Admin can reset an administrator / PA password.');
        }
        const targetPassword = newPassword || PasswordUtils_1.PasswordUtils.generateSecurePassword(12);
        const hash = await PasswordUtils_1.PasswordUtils.hashPassword(targetPassword);
        await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.users
       SET password_hash = $1,
           must_reset_password = TRUE,
           current_session_id = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`, [hash, staffUserId]);
        try {
            await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.audit_logs (organization_id, user_id, action, resource, resource_id, metadata)
         VALUES ($1, $2, 'STAFF_PASSWORD_RESET', 'users', $3, $4)`, [
                organizationId,
                actorId || null,
                staffUserId,
                JSON.stringify({
                    staffEmail: staff.email,
                    staffName: `${staff.first_name} ${staff.last_name}`.trim(),
                    resetByUserId: actorId || null,
                    resetByName: actorName || 'System',
                }),
            ]);
        }
        catch (auditErr) {
            console.error('[StaffService] Audit log insert error', auditErr);
        }
        return {
            success: true,
            staffId: staffUserId,
            staffEmail: staff.email,
            temporaryPassword: targetPassword,
            message: 'Staff password successfully reset. Any active sessions were invalidated.',
        };
    }
    // 4. Role Permissions Template Management
    getDefaultRolePermissions(roleId) {
        switch (roleId) {
            case 'ORGANIZATION_ADMIN':
            case 'ORGANIZATION_OWNER':
                return {
                    can_manage_courses: true,
                    can_manage_campaigns: true,
                    can_manage_staff: true,
                    can_edit_students: true,
                    can_reset_student_passwords: true,
                    can_view_reports: true,
                };
            case 'INSTRUCTOR':
                return {
                    can_manage_courses: true,
                    can_manage_campaigns: true,
                    can_manage_staff: false,
                    can_edit_students: false,
                    can_reset_student_passwords: false,
                    can_view_reports: true,
                };
            case 'CONTENT_MANAGER':
                return {
                    can_manage_courses: true,
                    can_manage_campaigns: false,
                    can_manage_staff: false,
                    can_edit_students: false,
                    can_reset_student_passwords: false,
                    can_view_reports: false,
                };
            case 'MANAGER':
                return {
                    can_manage_courses: false,
                    can_manage_campaigns: false,
                    can_manage_staff: false,
                    can_edit_students: true,
                    can_reset_student_passwords: true,
                    can_view_reports: true,
                };
            case 'REVIEWER':
            case 'SUPPORT_STAFF':
            default:
                return {
                    can_manage_courses: false,
                    can_manage_campaigns: false,
                    can_manage_staff: false,
                    can_edit_students: false,
                    can_reset_student_passwords: false,
                    can_view_reports: true,
                };
        }
    }
    async GetRolePermissionsList(organizationId) {
        const customRes = await (0, connection_1.executeQuery)(`SELECT role_id, permissions, updated_at
       FROM ${this.schema}.organization_role_permissions
       WHERE organization_id = $1`, [organizationId]);
        const customMap = new Map();
        for (const row of customRes.rows) {
            customMap.set(row.role_id, row.permissions);
        }
        const standardRoles = [
            { id: 'INSTRUCTOR', name: 'Instructor' },
            { id: 'CONTENT_MANAGER', name: 'Content Manager' },
            { id: 'MANAGER', name: 'Manager' },
            { id: 'REVIEWER', name: 'Reviewer' },
            { id: 'ORGANIZATION_ADMIN', name: 'Organization Admin (Full Rights)' },
        ];
        const result = standardRoles.map((r) => {
            const defaultPerms = this.getDefaultRolePermissions(r.id);
            const effectivePerms = customMap.has(r.id) ? customMap.get(r.id) : defaultPerms;
            return {
                roleId: r.id,
                roleName: r.name,
                isCustomized: customMap.has(r.id),
                permissions: effectivePerms,
            };
        });
        return result;
    }
    async UpdateRolePermissions(organizationId, roleId, permissions) {
        const effective = { ...this.getDefaultRolePermissions(roleId), ...permissions };
        // Strict dependency: Managing campaigns requires course management
        if (permissions?.can_manage_campaigns === true) {
            effective.can_manage_campaigns = true;
            effective.can_manage_courses = true;
        }
        else if (permissions?.can_manage_courses === false) {
            effective.can_manage_courses = false;
            effective.can_manage_campaigns = false;
        }
        else if (effective.can_manage_courses === false) {
            effective.can_manage_campaigns = false;
        }
        const upsertRes = await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.organization_role_permissions (organization_id, role_id, permissions, updated_at)
       VALUES ($1, $2, $3::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (organization_id, role_id)
       DO UPDATE SET permissions = EXCLUDED.permissions, updated_at = CURRENT_TIMESTAMP
       RETURNING *`, [organizationId, roleId, JSON.stringify(effective)]);
        return {
            roleId,
            permissions: effective,
            updatedAt: upsertRes.rows[0].updated_at,
        };
    }
}
exports.StaffService = StaffService;
exports.staffService = new StaffService();
