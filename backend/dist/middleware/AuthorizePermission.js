"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizeRoles = AuthorizeRoles;
exports.AuthorizePermission = AuthorizePermission;
exports.RequireSuperAdmin = RequireSuperAdmin;
const ApiError_1 = require("../utils/ApiError");
const connection_1 = require("../database/connection");
const environment_1 = require("../config/environment");
function AuthorizeRoles(...allowedRoles) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(ApiError_1.ApiError.unauthorized());
        }
        if (req.user.isSuperAdmin) {
            return next();
        }
        if (!req.user.role || !allowedRoles.includes(req.user.role)) {
            return next(ApiError_1.ApiError.forbidden(`Access restricted. Required roles: ${allowedRoles.join(', ')}`));
        }
        next();
    };
}
function AuthorizePermission(permissionKey, ...fallbackRoles) {
    return async (req, _res, next) => {
        if (!req.user) {
            return next(ApiError_1.ApiError.unauthorized());
        }
        if (req.user.isSuperAdmin) {
            return next();
        }
        const role = req.user.role || '';
        if (['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', ...fallbackRoles].includes(role)) {
            return next();
        }
        // Check token permissions
        const perms = req.user.permissions;
        if (perms && typeof perms === 'object' && perms[permissionKey] === true) {
            if (permissionKey === 'can_manage_campaigns' && perms.can_manage_courses !== true) {
                return next(ApiError_1.ApiError.forbidden('Access restricted. College Outreach & Campaign management requires Course Management permission ("can_manage_courses").'));
            }
            return next();
        }
        // Realtime database check in case permissions were updated after login token was issued
        const orgId = req.organizationId || req.user.activeOrganizationId;
        if (orgId) {
            try {
                const schema = environment_1.EnvironmentConfig.database.schema;
                const res = await (0, connection_1.executeQuery)(`SELECT permissions FROM ${schema}.organization_members
           WHERE organization_id = $1 AND user_id = $2 AND status = 'ACTIVE'`, [orgId, req.user.userId]);
                if (res.rowCount > 0) {
                    const dbPerms = res.rows[0].permissions;
                    if (dbPerms?.[permissionKey] === true) {
                        if (permissionKey === 'can_manage_campaigns' && dbPerms?.can_manage_courses !== true) {
                            return next(ApiError_1.ApiError.forbidden('Access restricted. College Outreach & Campaign management requires Course Management permission ("can_manage_courses").'));
                        }
                        return next();
                    }
                }
            }
            catch { }
        }
        return next(ApiError_1.ApiError.forbidden(`Access restricted. Your account lacks the required permission switch: "${permissionKey}". Please contact your organization owner or administrator.`));
    };
}
function RequireSuperAdmin(req, _res, next) {
    if (!req.user || !req.user.isSuperAdmin) {
        return next(ApiError_1.ApiError.forbidden('Only platform Super Administrators can access this endpoint.'));
    }
    next();
}
