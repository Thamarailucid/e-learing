"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffInviteController = exports.StaffInviteController = void 0;
const zod_1 = require("zod");
const StaffInviteService_1 = require("./StaffInviteService");
const ApiResponse_1 = require("../../utils/ApiResponse");
const ClientIpResolver_1 = require("../../utils/ClientIpResolver");
const CreateStaffInviteSchema = zod_1.z.object({
    title: zod_1.z.string().min(2, 'Title is required (minimum 2 characters).'),
    roleId: zod_1.z.enum(['ORGANIZATION_ADMIN', 'MANAGER', 'INSTRUCTOR', 'CONTENT_MANAGER', 'REVIEWER', 'SUPPORT_STAFF']),
    permissions: zod_1.z.record(zod_1.z.boolean()).optional(),
    maxRegistrations: zod_1.z.number().int().positive().optional(),
    expiresAt: zod_1.z.string().datetime().optional(),
    customInviteCode: zod_1.z.string().optional(),
});
const RegisterStaffViaInviteSchema = zod_1.z.object({
    inviteCode: zod_1.z.string().min(3, 'Invitation code is required.'),
    email: zod_1.z.string().email('Valid email address is required.'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters.').optional(),
    firstName: zod_1.z.string().min(1, 'First name is required.'),
    lastName: zod_1.z.string().min(1, 'Last name is required.'),
    phone: zod_1.z.string().optional(),
});
class StaffInviteController {
    async CreateStaffInviteLink(req, res, next) {
        try {
            const orgId = req.organizationId;
            const actorId = req.user.userId;
            const parsed = CreateStaffInviteSchema.parse(req.body);
            const result = await StaffInviteService_1.staffInviteService.CreateStaffInviteLink(orgId, actorId, parsed);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Staff invitation link created successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetStaffInviteList(req, res, next) {
        try {
            const orgId = req.organizationId;
            const result = await StaffInviteService_1.staffInviteService.GetStaffInviteList(orgId);
            res.json(ApiResponse_1.ApiResponse.success('Staff invitation links retrieved successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async ToggleStaffInviteStatus(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { inviteId } = req.params;
            const { isActive } = req.body;
            const result = await StaffInviteService_1.staffInviteService.ToggleStaffInviteStatus(orgId, inviteId, Boolean(isActive));
            res.json(ApiResponse_1.ApiResponse.success('Staff invitation status updated successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetStaffInviteRegistrations(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { inviteId } = req.params;
            const result = await StaffInviteService_1.staffInviteService.GetStaffInviteRegistrations(orgId, inviteId);
            res.json(ApiResponse_1.ApiResponse.success('Staff members enrolled via invite retrieved successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetStaffInviteDetails(req, res, next) {
        try {
            const { token } = req.params;
            const result = await StaffInviteService_1.staffInviteService.GetStaffInviteDetails(token);
            res.json(ApiResponse_1.ApiResponse.success('Staff invitation details retrieved.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async RegisterStaffViaInvite(req, res, next) {
        try {
            const parsed = RegisterStaffViaInviteSchema.parse(req.body);
            const clientIp = await (0, ClientIpResolver_1.ResolveRequestClientIp)(req);
            const result = await StaffInviteService_1.staffInviteService.RegisterStaffViaInvite(parsed.inviteCode, parsed, clientIp);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Staff account registered successfully. Welcome to the academy team!', result));
        }
        catch (err) {
            next(err);
        }
    }
}
exports.StaffInviteController = StaffInviteController;
exports.staffInviteController = new StaffInviteController();
