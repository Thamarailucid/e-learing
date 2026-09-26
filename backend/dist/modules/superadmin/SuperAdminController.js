"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.superAdminController = exports.SuperAdminController = void 0;
const zod_1 = require("zod");
const SuperAdminService_1 = require("./SuperAdminService");
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const ClientIpResolver_1 = require("../../utils/ClientIpResolver");
const CreateOrgSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Organization name is required.'),
    slug: zod_1.z.string().min(2, 'Valid slug is required.').regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and dashes.'),
    domain: zod_1.z.string().optional(),
    planType: zod_1.z.enum(['STARTER', 'BUSINESS', 'ENTERPRISE']).optional(),
    licenseType: zod_1.z.string().optional(),
    licenseStartDate: zod_1.z.string().optional(),
    licenseEndDate: zod_1.z.string().optional(),
    licenseIsActive: zod_1.z.boolean().optional(),
    showPlanTierToOrg: zod_1.z.boolean().optional(),
    licenseWarningDays: zod_1.z.number().optional(),
    ownerEmail: zod_1.z.string().min(3, 'Owner email is required.'),
    ownerFirstName: zod_1.z.string().min(1, 'Owner first name is required.'),
    ownerLastName: zod_1.z.string().min(1, 'Owner last name is required.'),
    ownerPassword: zod_1.z.string().min(8).optional(),
});
class SuperAdminController {
    async GetSuperAdminDashboard(_req, res, next) {
        try {
            const data = await SuperAdminService_1.superAdminService.GetSuperAdminDashboard();
            res.json(ApiResponse_1.ApiResponse.success('Super Admin dashboard metrics retrieved.', data));
        }
        catch (err) {
            next(err);
        }
    }
    async GetOrganizationList(req, res, next) {
        try {
            const page = parseInt(req.query.page || '1', 10);
            const pageSize = parseInt(req.query.pageSize || '20', 10);
            const search = req.query.search;
            const result = await SuperAdminService_1.superAdminService.GetOrganizationList(page, pageSize, search);
            res.json(ApiResponse_1.ApiResponse.success('Organization list retrieved.', result.data, result.pagination));
        }
        catch (err) {
            next(err);
        }
    }
    async CreateOrganization(req, res, next) {
        try {
            const parsed = CreateOrgSchema.parse(req.body);
            const clientIp = await (0, ClientIpResolver_1.ResolveRequestClientIp)(req);
            const userAgent = req.headers['user-agent'] || undefined;
            const actorUserId = req.user?.userId;
            const result = await SuperAdminService_1.superAdminService.CreateOrganization(parsed, actorUserId, clientIp, userAgent);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Organization created successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async SuspendOrganization(req, res, next) {
        try {
            const { organizationId } = req.params;
            const clientIp = await (0, ClientIpResolver_1.ResolveRequestClientIp)(req);
            const userAgent = req.headers['user-agent'] || undefined;
            const actorUserId = req.user?.userId;
            const result = await SuperAdminService_1.superAdminService.SuspendOrganization(organizationId, actorUserId, clientIp, userAgent);
            res.json(ApiResponse_1.ApiResponse.success('Organization suspended successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async ActivateOrganization(req, res, next) {
        try {
            const { organizationId } = req.params;
            const clientIp = await (0, ClientIpResolver_1.ResolveRequestClientIp)(req);
            const userAgent = req.headers['user-agent'] || undefined;
            const actorUserId = req.user?.userId;
            const result = await SuperAdminService_1.superAdminService.ActivateOrganization(organizationId, actorUserId, clientIp, userAgent);
            res.json(ApiResponse_1.ApiResponse.success('Organization activated successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async UpdateOrganizationPlanTier(req, res, next) {
        try {
            const { organizationId } = req.params;
            const { planType, maxStudents, maxCourses, licenseType, licenseStartDate, licenseEndDate, licenseIsActive, showPlanTierToOrg, licenseWarningDays, } = req.body;
            const clientIp = await (0, ClientIpResolver_1.ResolveRequestClientIp)(req);
            const result = await SuperAdminService_1.superAdminService.UpdateOrganizationPlanTier(organizationId, {
                planType,
                maxStudents,
                maxCourses,
                licenseType,
                licenseStartDate,
                licenseEndDate,
                licenseIsActive,
                showPlanTierToOrg,
                licenseWarningDays,
            }, clientIp);
            res.json(ApiResponse_1.ApiResponse.success('Organization plan tier and license updated successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetPlatformAuditLogList(req, res, next) {
        try {
            const page = parseInt(req.query.page || '1', 10);
            const pageSize = parseInt(req.query.pageSize || '30', 10);
            const search = req.query.search;
            const category = req.query.category;
            const action = req.query.action;
            const resource = req.query.resource;
            const organizationId = req.query.organizationId;
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;
            const result = await SuperAdminService_1.superAdminService.GetPlatformAuditLogList({
                page,
                pageSize,
                search,
                category,
                action,
                resource,
                organizationId,
                startDate,
                endDate,
            });
            res.json(ApiResponse_1.ApiResponse.success('Platform audit logs retrieved.', result.data, result.pagination));
        }
        catch (err) {
            next(err);
        }
    }
    async GetAuditLogFilterOptions(req, res, next) {
        try {
            const result = await SuperAdminService_1.superAdminService.GetPlatformAuditLogFilterOptions();
            res.json(ApiResponse_1.ApiResponse.success('Audit log filter options retrieved.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async UploadOrganizationLogo(req, res, next) {
        try {
            const orgId = req.params.organizationId;
            if (!req.file)
                throw ApiError_1.ApiError.badRequest('No image file uploaded.');
            const result = await SuperAdminService_1.superAdminService.UploadOrganizationLogo(orgId, req.user.userId, req.file);
            res.json(ApiResponse_1.ApiResponse.success('Logo uploaded successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async ResetOrganizationOwnerPassword(req, res, next) {
        try {
            const { organizationId } = req.params;
            const { newPassword, ownerEmail } = req.body;
            const clientIp = await (0, ClientIpResolver_1.ResolveRequestClientIp)(req);
            const result = await SuperAdminService_1.superAdminService.ResetOrganizationOwnerPassword(organizationId, newPassword, ownerEmail, clientIp);
            res.json(ApiResponse_1.ApiResponse.success('Organization owner password reset successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async UpdateOrganizationOwner(req, res, next) {
        try {
            const { organizationId } = req.params;
            const { email, firstName, lastName, phone, password } = req.body;
            const clientIp = await (0, ClientIpResolver_1.ResolveRequestClientIp)(req);
            const userAgent = req.headers['user-agent'] || undefined;
            const actorUserId = req.user?.userId;
            const result = await SuperAdminService_1.superAdminService.UpdateOrganizationOwner(organizationId, {
                email,
                firstName,
                lastName,
                phone,
                password,
            }, actorUserId, clientIp, userAgent);
            res.json(ApiResponse_1.ApiResponse.success('Organization owner account updated successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async UpdateOrganizationProfile(req, res, next) {
        try {
            const { organizationId } = req.params;
            const { name, slug, domain, logoUrl, faviconUrl } = req.body;
            const clientIp = await (0, ClientIpResolver_1.ResolveRequestClientIp)(req);
            const userAgent = req.headers['user-agent'] || undefined;
            const actorUserId = req.user?.userId;
            const result = await SuperAdminService_1.superAdminService.UpdateOrganizationProfile(organizationId, {
                name,
                slug,
                domain,
                logoUrl,
                faviconUrl,
            }, actorUserId, clientIp, userAgent);
            res.json(ApiResponse_1.ApiResponse.success('Organization profile updated successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
}
exports.SuperAdminController = SuperAdminController;
exports.superAdminController = new SuperAdminController();
