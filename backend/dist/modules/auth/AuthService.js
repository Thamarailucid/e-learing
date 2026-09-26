"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const connection_1 = require("../../database/connection");
const environment_1 = require("../../config/environment");
const PasswordUtils_1 = require("../../utils/PasswordUtils");
const TokenUtils_1 = require("../../utils/TokenUtils");
const ApiError_1 = require("../../utils/ApiError");
const DateTimeUtils_1 = require("../../utils/DateTimeUtils");
class AuthService {
    schema = environment_1.EnvironmentConfig.database.schema;
    async PostLoginUser(email, passwordPlain, requestedOrgId, clearPreviousSession = false, clientIp) {
        const emailNorm = email.toLowerCase().trim();
        const userRes = await (0, connection_1.executeQuery)(`SELECT id, email, password_hash, first_name, last_name, is_super_admin, is_active,
              current_session_id, last_login_at, must_reset_password
       FROM ${this.schema}.users WHERE email = $1`, [emailNorm]);
        if (userRes.rowCount === 0) {
            throw ApiError_1.ApiError.unauthorized('Invalid email or password credentials.', 'INVALID_CREDENTIALS');
        }
        const user = userRes.rows[0];
        if (!user.is_active) {
            throw ApiError_1.ApiError.forbidden('Your account is currently inactive or suspended.', 'ACCOUNT_INACTIVE');
        }
        const isMatch = await PasswordUtils_1.PasswordUtils.comparePassword(passwordPlain, user.password_hash);
        if (!isMatch) {
            throw ApiError_1.ApiError.unauthorized('Invalid email or password credentials.', 'INVALID_CREDENTIALS');
        }
        // CONCURRENT / SINGLE ACTIVE SESSION CHECK
        // Only student accounts are restricted to single-device sessions (to preserve exam security & single-attendance integrity)
        if (!user.is_super_admin && user.current_session_id && !clearPreviousSession) {
            const userRolesRes = await (0, connection_1.executeQuery)(`SELECT role_id FROM ${this.schema}.organization_members WHERE user_id = $1 AND status = 'ACTIVE'`, [user.id]);
            const isStudentAccount = userRolesRes.rowCount > 0 && userRolesRes.rows.every((r) => r.role_id === 'STUDENT');
            if (isStudentAccount) {
                throw ApiError_1.ApiError.conflict('This student account is currently active on another device or browser tab. Would you like to clear the other session and log in here?', 'SESSION_CONFLICT', {
                    hasActiveSession: true,
                    lastLoginAt: user.last_login_at ? DateTimeUtils_1.DateTimeUtils.toUtcIsoString(user.last_login_at) : null,
                    lastLoginAtIst: user.last_login_at ? DateTimeUtils_1.DateTimeUtils.formatUtcToIst(user.last_login_at) : null,
                });
            }
        }
        // Generate fresh primary session ID & UTC timestamp
        const newSessionId = crypto_1.default.randomUUID();
        const nowUtc = DateTimeUtils_1.DateTimeUtils.getCurrentUtcDate();
        // Persist new primary session and UTC last login
        await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.users
       SET current_session_id = $1,
           last_login_at = $2,
           last_login_ip = $3,
           updated_at = $2
       WHERE id = $4`, [newSessionId, nowUtc, clientIp || null, user.id]);
        // Fetch user's organization memberships
        const memberRes = await (0, connection_1.executeQuery)(`SELECT om.organization_id, om.role_id, om.permissions, o.name as organization_name, o.slug as organization_slug, o.logo_url as organization_logo_url, o.status as org_status
       FROM ${this.schema}.organization_members om
       JOIN ${this.schema}.organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.status = 'ACTIVE'`, [user.id]);
        let activeOrgId = requestedOrgId;
        let role = user.is_super_admin ? 'SUPER_ADMIN' : 'STUDENT';
        let activeOrgMeta = null;
        if (memberRes.rowCount > 0) {
            if (activeOrgId) {
                const found = memberRes.rows.find((m) => m.organization_id === activeOrgId);
                if (found) {
                    role = found.role_id;
                    activeOrgMeta = found;
                }
                else if (!user.is_super_admin) {
                    throw ApiError_1.ApiError.forbidden('You do not belong to the requested organization.');
                }
            }
            else {
                activeOrgId = memberRes.rows[0].organization_id;
                role = memberRes.rows[0].role_id;
                activeOrgMeta = memberRes.rows[0];
            }
        }
        const defaultFullPermissions = {
            can_edit_students: true,
            can_reset_student_passwords: true,
            can_manage_courses: true,
            can_manage_campaigns: true,
            can_manage_staff: true,
            can_view_reports: true,
        };
        let permissions = {
            can_edit_students: false,
            can_reset_student_passwords: false,
            can_manage_courses: false,
            can_manage_campaigns: false,
            can_manage_staff: false,
            can_view_reports: false,
        };
        let activePerms = activeOrgMeta?.permissions;
        if (typeof activePerms === 'string') {
            try {
                activePerms = JSON.parse(activePerms);
            }
            catch {
                activePerms = null;
            }
        }
        if (user.is_super_admin || role === 'ORGANIZATION_OWNER' || role === 'ORGANIZATION_ADMIN') {
            permissions = { ...defaultFullPermissions };
        }
        else if (activePerms) {
            permissions = { ...permissions, ...activePerms };
            if (permissions.can_manage_campaigns) {
                permissions.can_manage_courses = true;
            }
        }
        // Record Login in Audit Logs
        try {
            await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.audit_logs (organization_id, user_id, action, resource, resource_id, ip_address, metadata)
         VALUES ($1, $2, 'USER_LOGIN', 'users', $2, $3, $4)`, [
                activeOrgId || null,
                user.id,
                clientIp || null,
                JSON.stringify({
                    userName: `${user.first_name} ${user.last_name}`.trim(),
                    userEmail: user.email,
                    role,
                    sessionId: newSessionId,
                }),
            ]);
        }
        catch (auditErr) {
            console.error('[AuthService] Audit log insert error', auditErr);
        }
        const accessToken = TokenUtils_1.TokenUtils.generateAccessToken({
            userId: user.id,
            email: user.email,
            isSuperAdmin: user.is_super_admin,
            activeOrganizationId: activeOrgId,
            role,
            permissions,
            sessionId: newSessionId,
        });
        const refreshToken = TokenUtils_1.TokenUtils.generateRefreshToken({ userId: user.id });
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                isSuperAdmin: user.is_super_admin,
                activeOrganizationId: activeOrgId,
                activeOrganizationName: activeOrgMeta?.organization_name || null,
                activeOrganizationLogo: activeOrgMeta?.organization_logo_url || null,
                activeOrganizationSlug: activeOrgMeta?.organization_slug || null,
                role,
                permissions,
                mustResetPassword: Boolean(user.must_reset_password),
                lastLoginIp: clientIp || null,
                lastLoginAt: DateTimeUtils_1.DateTimeUtils.toUtcIsoString(nowUtc),
                lastLoginAtIst: DateTimeUtils_1.DateTimeUtils.formatUtcToIst(nowUtc),
                sessionId: newSessionId,
            },
            organizations: memberRes.rows.map((m) => ({
                id: m.organization_id,
                name: m.organization_name,
                slug: m.organization_slug,
                logoUrl: m.organization_logo_url,
                role: m.role_id,
            })),
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: environment_1.EnvironmentConfig.jwt.accessExpiresIn,
            },
        };
    }
    async PostRegisterUser(data) {
        const emailNorm = data.email.toLowerCase().trim();
        const existing = await (0, connection_1.executeQuery)(`SELECT id FROM ${this.schema}.users WHERE email = $1`, [emailNorm]);
        if (existing.rowCount > 0) {
            throw ApiError_1.ApiError.conflict('An account with this email address already exists.', 'EMAIL_EXISTS');
        }
        const passwordHash = await PasswordUtils_1.PasswordUtils.hashPassword(data.password);
        const insertRes = await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.users (email, password_hash, first_name, last_name, phone, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, TRUE, TRUE)
       RETURNING id, email, first_name, last_name`, [emailNorm, passwordHash, data.firstName, data.lastName, data.phone || null]);
        const newUser = insertRes.rows[0];
        // If organization is specified directly or via slug/code, enroll as student
        let targetOrgId = data.organizationId;
        if (!targetOrgId && (data.organizationSlug || data.organizationCode)) {
            const lookup = (data.organizationSlug || data.organizationCode).trim();
            const orgLookup = await (0, connection_1.executeQuery)(`SELECT id FROM ${this.schema}.organizations WHERE (slug ILIKE $1 OR invite_code ILIKE $1 OR id::text = $1) AND status = 'ACTIVE'`, [lookup]);
            if (orgLookup.rowCount > 0) {
                targetOrgId = orgLookup.rows[0].id;
            }
        }
        if (targetOrgId) {
            await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.organization_members (organization_id, user_id, role_id, status)
         VALUES ($1, $2, 'STUDENT', 'ACTIVE')
         ON CONFLICT (organization_id, user_id) DO NOTHING`, [targetOrgId, newUser.id]);
        }
        return this.PostLoginUser(data.email, data.password, targetOrgId);
    }
    async PostRefreshAccessToken(refreshToken) {
        try {
            const decoded = TokenUtils_1.TokenUtils.verifyRefreshToken(refreshToken);
            const userRes = await (0, connection_1.executeQuery)(`SELECT id, email, is_super_admin, is_active FROM ${this.schema}.users WHERE id = $1`, [decoded.userId]);
            if (userRes.rowCount === 0 || !userRes.rows[0].is_active) {
                throw ApiError_1.ApiError.unauthorized('Invalid or expired refresh token.');
            }
            const user = userRes.rows[0];
            const memberRes = await (0, connection_1.executeQuery)(`SELECT organization_id, role_id FROM ${this.schema}.organization_members WHERE user_id = $1 AND status = 'ACTIVE' LIMIT 1`, [user.id]);
            const activeOrgId = memberRes.rows[0]?.organization_id;
            const role = user.is_super_admin ? 'SUPER_ADMIN' : memberRes.rows[0]?.role_id || 'STUDENT';
            const newAccessToken = TokenUtils_1.TokenUtils.generateAccessToken({
                userId: user.id,
                email: user.email,
                isSuperAdmin: user.is_super_admin,
                activeOrganizationId: activeOrgId,
                role,
            });
            return {
                accessToken: newAccessToken,
                expiresIn: environment_1.EnvironmentConfig.jwt.accessExpiresIn,
            };
        }
        catch {
            throw ApiError_1.ApiError.unauthorized('Invalid or expired refresh session.', 'REFRESH_TOKEN_EXPIRED');
        }
    }
    async GetAuthenticatedUserProfile(userId, activeOrgId) {
        const res = await (0, connection_1.executeQuery)(`SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url, u.is_super_admin,
              u.last_login_at, u.last_login_ip, u.current_session_id, u.must_reset_password, u.created_at,
              om.organization_id, om.role_id, om.permissions as member_permissions
       FROM ${this.schema}.users u
       LEFT JOIN ${this.schema}.organization_members om ON om.user_id = u.id AND om.status = 'ACTIVE'
         ${activeOrgId ? 'AND om.organization_id = $2' : ''}
       WHERE u.id = $1
       LIMIT 1`, activeOrgId ? [userId, activeOrgId] : [userId]);
        if (res.rowCount === 0) {
            throw ApiError_1.ApiError.notFound('User profile not found.');
        }
        const row = res.rows[0];
        const isOwnerOrAdmin = row.is_super_admin || ['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'].includes(row.role_id);
        const defaultFullPermissions = {
            can_edit_students: true,
            can_reset_student_passwords: true,
            can_manage_courses: true,
            can_manage_staff: true,
            can_view_reports: true,
        };
        let memberPerms = row.member_permissions;
        if (typeof memberPerms === 'string') {
            try {
                memberPerms = JSON.parse(memberPerms);
            }
            catch {
                memberPerms = null;
            }
        }
        const permissions = isOwnerOrAdmin
            ? defaultFullPermissions
            : {
                can_edit_students: false,
                can_reset_student_passwords: false,
                can_manage_courses: false,
                can_manage_staff: false,
                can_view_reports: false,
                ...(memberPerms || {}),
            };
        return {
            ...row,
            permissions,
            mustResetPassword: Boolean(row.must_reset_password),
            lastLoginIp: row.last_login_ip || null,
            lastLoginAt: row.last_login_at ? DateTimeUtils_1.DateTimeUtils.toUtcIsoString(row.last_login_at) : null,
            lastLoginAtUtc: row.last_login_at ? DateTimeUtils_1.DateTimeUtils.toUtcIsoString(row.last_login_at) : null,
            lastLoginAtIst: row.last_login_at ? DateTimeUtils_1.DateTimeUtils.formatUtcToIst(row.last_login_at) : null,
        };
    }
    async PostResetFirstTimePassword(userId, newPassword, activeOrgId) {
        if (!newPassword || newPassword.trim().length < 6) {
            throw ApiError_1.ApiError.badRequest('New password must be at least 6 characters long.');
        }
        const userRes = await (0, connection_1.executeQuery)(`SELECT id, email, first_name, last_name, is_active, is_super_admin, current_session_id
       FROM ${this.schema}.users WHERE id = $1`, [userId]);
        if (userRes.rowCount === 0) {
            throw ApiError_1.ApiError.notFound('User account not found.');
        }
        const user = userRes.rows[0];
        if (!user.is_active) {
            throw ApiError_1.ApiError.forbidden('Your account is currently inactive or suspended.');
        }
        const hash = await PasswordUtils_1.PasswordUtils.hashPassword(newPassword.trim());
        await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.users
       SET password_hash = $1,
           must_reset_password = FALSE,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`, [hash, userId]);
        // Audit log
        try {
            await (0, connection_1.executeQuery)(`INSERT INTO ${this.schema}.audit_logs (organization_id, user_id, action, resource, resource_id, metadata)
         VALUES ($1, $2, 'FIRST_TIME_PASSWORD_RESET', 'users', $2, $3)`, [
                activeOrgId || null,
                userId,
                JSON.stringify({
                    email: user.email,
                    name: `${user.first_name} ${user.last_name}`.trim(),
                    timestamp: new Date().toISOString(),
                }),
            ]);
        }
        catch (auditErr) {
            console.error('[AuthService] Audit log insert error', auditErr);
        }
        // Retrieve refreshed profile
        const profile = await this.GetAuthenticatedUserProfile(userId, activeOrgId);
        const accessToken = TokenUtils_1.TokenUtils.generateAccessToken({
            userId: user.id,
            email: user.email,
            isSuperAdmin: user.is_super_admin,
            activeOrganizationId: activeOrgId || profile.organization_id,
            role: user.is_super_admin ? 'SUPER_ADMIN' : profile.role_id || 'STUDENT',
            permissions: profile.permissions,
            sessionId: profile.current_session_id,
        });
        const refreshToken = TokenUtils_1.TokenUtils.generateRefreshToken({ userId: user.id });
        return {
            success: true,
            message: 'Password successfully updated. You may now access your dashboard.',
            user: {
                ...profile,
                mustResetPassword: false,
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: environment_1.EnvironmentConfig.jwt.accessExpiresIn,
            },
        };
    }
    async PostLogoutUser(userId) {
        if (userId) {
            await (0, connection_1.executeQuery)(`UPDATE ${this.schema}.users
         SET current_session_id = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`, [userId]);
        }
        return { loggedOut: true };
    }
    async GetAuthenticatedUserOrganizations(userId) {
        const res = await (0, connection_1.executeQuery)(`SELECT o.id, o.name, o.slug, o.domain, o.logo_url, om.role_id, om.status
       FROM ${this.schema}.organization_members om
       JOIN ${this.schema}.organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1`, [userId]);
        return res.rows;
    }
    async PostSwitchActiveOrganization(userId, targetOrgId) {
        const memberRes = await (0, connection_1.executeQuery)(`SELECT om.role_id, o.name, o.slug
       FROM ${this.schema}.organization_members om
       JOIN ${this.schema}.organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.organization_id = $2 AND om.status = 'ACTIVE'`, [userId, targetOrgId]);
        const userRes = await (0, connection_1.executeQuery)(`SELECT email, is_super_admin FROM ${this.schema}.users WHERE id = $1`, [userId]);
        const user = userRes.rows[0];
        if (memberRes.rowCount === 0 && !user.is_super_admin) {
            throw ApiError_1.ApiError.forbidden('You do not belong to this organization.');
        }
        const role = user.is_super_admin ? 'SUPER_ADMIN' : memberRes.rows[0].role_id;
        const newAccessToken = TokenUtils_1.TokenUtils.generateAccessToken({
            userId,
            email: user.email,
            isSuperAdmin: user.is_super_admin,
            activeOrganizationId: targetOrgId,
            role,
        });
        return {
            activeOrganizationId: targetOrgId,
            role,
            accessToken: newAccessToken,
        };
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
