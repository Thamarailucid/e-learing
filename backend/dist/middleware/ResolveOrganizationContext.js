"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResolveOrganizationContext = ResolveOrganizationContext;
const ApiError_1 = require("../utils/ApiError");
const connection_1 = require("../database/connection");
const environment_1 = require("../config/environment");
async function ResolveOrganizationContext(req, _res, next) {
    if (!req.user) {
        return next(ApiError_1.ApiError.unauthorized());
    }
    // 1. Target organization can come from header, query or route params
    const requestedOrgId = (req.params.organizationId ||
        req.headers['x-organization-id'] ||
        req.query.organizationId ||
        req.user.activeOrganizationId);
    // If user is platform Super Admin, they have platform-wide access
    if (req.user.isSuperAdmin) {
        req.organizationId = requestedOrgId || req.user.activeOrganizationId;
        return next();
    }
    if (!requestedOrgId) {
        return next(ApiError_1.ApiError.badRequest('Organization context is required for this operation.', 'MISSING_ORGANIZATION_CONTEXT'));
    }
    // 2. Validate tenant membership from database
    try {
        const schema = environment_1.EnvironmentConfig.database.schema;
        const memberRes = await (0, connection_1.executeQuery)(`SELECT om.role_id, om.status, o.status as org_status
       FROM ${schema}.organization_members om
       JOIN ${schema}.organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.organization_id = $2`, [req.user.userId, requestedOrgId]);
        if (memberRes.rowCount === 0) {
            return next(ApiError_1.ApiError.forbidden('You do not belong to this organization.', 'TENANT_ACCESS_DENIED'));
        }
        const membership = memberRes.rows[0];
        if (membership.org_status !== 'ACTIVE') {
            return next(ApiError_1.ApiError.forbidden('This organization has been suspended or is inactive.', 'ORGANIZATION_INACTIVE'));
        }
        if (membership.status !== 'ACTIVE') {
            return next(ApiError_1.ApiError.forbidden('Your account in this organization is suspended.', 'MEMBERSHIP_INACTIVE'));
        }
        req.organizationId = requestedOrgId;
        req.user.role = membership.role_id;
        next();
    }
    catch (err) {
        next(err);
    }
}
