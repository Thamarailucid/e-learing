"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffController = exports.StaffController = void 0;
const zod_1 = require("zod");
const StaffService_1 = require("./StaffService");
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const ClientIpResolver_1 = require("../../utils/ClientIpResolver");
const CreateStaffSchema = zod_1.z.object({
    email: zod_1.z.string().min(3, 'Email address is required'),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    roleId: zod_1.z.enum(['ORGANIZATION_ADMIN', 'MANAGER', 'INSTRUCTOR', 'CONTENT_MANAGER', 'REVIEWER', 'SUPPORT_STAFF', 'ORGANIZATION_OWNER']),
    phone: zod_1.z.string().optional(),
    password: zod_1.z.string().min(6).optional(),
    avatarUrl: zod_1.z.string().optional(),
    permissions: zod_1.z.record(zod_1.z.boolean()).optional(),
});
const UpdateStaffSchema = zod_1.z.object({
    staffUserId: zod_1.z.string().uuid().optional(),
    firstName: zod_1.z.string().min(1).optional(),
    lastName: zod_1.z.string().min(1).optional(),
    phone: zod_1.z.string().optional(),
    avatarUrl: zod_1.z.string().nullable().optional(),
    roleId: zod_1.z.enum(['ORGANIZATION_ADMIN', 'MANAGER', 'INSTRUCTOR', 'CONTENT_MANAGER', 'REVIEWER', 'SUPPORT_STAFF', 'ORGANIZATION_OWNER']).optional(),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
    permissions: zod_1.z.record(zod_1.z.boolean()).optional(),
});
const ResetStaffPasswordSchema = zod_1.z.object({
    staffUserId: zod_1.z.string().uuid().optional(),
    newPassword: zod_1.z.string().min(6).optional(),
});
class StaffController {
    async GetStaffList(req, res, next) {
        try {
            const orgId = req.organizationId;
            const page = parseInt(req.query.page || '1', 10);
            const pageSize = parseInt(req.query.pageSize || '20', 10);
            const search = req.query.search;
            const roleId = req.query.roleId;
            const status = req.query.status;
            const result = await StaffService_1.staffService.GetStaffList(orgId, page, pageSize, search, roleId, status);
            res.json(ApiResponse_1.ApiResponse.success('Staff list retrieved successfully.', result.data, result.pagination));
        }
        catch (err) {
            next(err);
        }
    }
    async CreateStaffMember(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = CreateStaffSchema.parse(req.body);
            const result = await StaffService_1.staffService.CreateStaffMember(orgId, parsed, req.user);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Staff member created successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async UpdateStaffMember(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = UpdateStaffSchema.parse(req.body);
            const staffUserId = req.params.staffUserId || parsed.staffUserId;
            if (!staffUserId) {
                throw ApiError_1.ApiError.badRequest('staffUserId parameter is required');
            }
            const result = await StaffService_1.staffService.UpdateStaffMember(orgId, staffUserId, {
                firstName: parsed.firstName,
                lastName: parsed.lastName,
                phone: parsed.phone,
                roleId: parsed.roleId,
                status: parsed.status,
                permissions: parsed.permissions,
            }, req.user);
            res.json(ApiResponse_1.ApiResponse.success('Staff member updated successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async ResetStaffPassword(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = ResetStaffPasswordSchema.parse(req.body);
            const staffUserId = req.params.staffUserId || parsed.staffUserId;
            if (!staffUserId) {
                throw ApiError_1.ApiError.badRequest('staffUserId parameter is required');
            }
            const actorId = req.user?.userId;
            const actorName = req.user?.email;
            const actorRole = req.user?.role;
            const isSuperAdmin = req.user?.isSuperAdmin;
            const clientIp = await (0, ClientIpResolver_1.ResolveRequestClientIp)(req);
            const result = await StaffService_1.staffService.ResetStaffPassword(orgId, staffUserId, parsed.newPassword, actorId, actorName, actorRole, isSuperAdmin, clientIp);
            res.json(ApiResponse_1.ApiResponse.success(result.message, result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetRolePermissionsList(req, res, next) {
        try {
            const orgId = req.organizationId;
            const result = await StaffService_1.staffService.GetRolePermissionsList(orgId);
            res.json(ApiResponse_1.ApiResponse.success('Role permissions list retrieved successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async UpdateRolePermissions(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { roleId } = req.params;
            const permissions = req.body.permissions || {};
            const result = await StaffService_1.staffService.UpdateRolePermissions(orgId, roleId, permissions);
            res.json(ApiResponse_1.ApiResponse.success(`Default permissions for role ${roleId} updated successfully.`, result));
        }
        catch (err) {
            next(err);
        }
    }
}
exports.StaffController = StaffController;
exports.staffController = new StaffController();
