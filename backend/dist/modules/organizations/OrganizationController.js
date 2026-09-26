"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizationController = exports.OrganizationController = void 0;
const zod_1 = require("zod");
const OrganizationService_1 = require("./OrganizationService");
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const ThemeSchema = zod_1.z.object({
    primaryColor: zod_1.z.string().optional(),
    primary_color: zod_1.z.string().optional(),
    secondaryColor: zod_1.z.string().optional(),
    secondary_color: zod_1.z.string().optional(),
    sidebarColor: zod_1.z.string().optional(),
    sidebar_color: zod_1.z.string().optional(),
    sidebarTextColor: zod_1.z.string().optional(),
    sidebar_text_color: zod_1.z.string().optional(),
    borderColor: zod_1.z.string().optional(),
    border_color: zod_1.z.string().optional(),
    buttonColor: zod_1.z.string().optional(),
    button_color: zod_1.z.string().optional(),
    buttonTextColor: zod_1.z.string().optional(),
    button_text_color: zod_1.z.string().optional(),
    fontFamily: zod_1.z.string().optional(),
    font_family: zod_1.z.string().optional(),
    borderRadiusMd: zod_1.z.string().optional(),
    border_radius_md: zod_1.z.string().optional(),
    certificateTitle: zod_1.z.string().optional(),
    certificate_title: zod_1.z.string().optional(),
    certificateSignatoryName: zod_1.z.string().optional(),
    certificate_signatory_name: zod_1.z.string().optional(),
    certificateSignatoryTitle: zod_1.z.string().optional(),
    certificate_signatory_title: zod_1.z.string().optional(),
    certificateSignatureUrl: zod_1.z.string().nullable().optional(),
    certificate_signature_url: zod_1.z.string().nullable().optional(),
    certificateBackgroundUrl: zod_1.z.string().nullable().optional(),
    certificate_background_url: zod_1.z.string().nullable().optional(),
    certificateAccentColor: zod_1.z.string().optional(),
    certificate_accent_color: zod_1.z.string().optional(),
});
class OrganizationController {
    async GetOrganizationDetails(req, res, next) {
        try {
            const orgId = req.organizationId;
            const data = await OrganizationService_1.organizationService.GetOrganizationDetails(orgId);
            // Role-based response filtering — strip sensitive fields for non-admin roles
            const role = req.user?.role || '';
            const isSuperAdmin = req.user?.isSuperAdmin === true;
            const isAdminLevel = isSuperAdmin || ['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'].includes(role);
            if (isAdminLevel) {
                // Admins & owners get full payload
                res.json(ApiResponse_1.ApiResponse.success('Organization details retrieved.', data));
            }
            else {
                // Students, instructors, staff — only get branding + minimal info
                const filtered = {
                    id: data.id,
                    name: data.name,
                    slug: data.slug,
                    domain: data.domain,
                    logo_url: data.logo_url,
                    favicon_url: data.favicon_url,
                    status: data.status,
                };
                // If org allows showing plan tier to non-admin users, include limited license info
                if (data.show_plan_tier_to_org) {
                    filtered.plan_type = data.plan_type;
                    filtered.license_status = data.license_status;
                    filtered.is_expiring_soon = data.is_expiring_soon;
                    filtered.days_remaining = data.days_remaining;
                }
                res.json(ApiResponse_1.ApiResponse.success('Organization details retrieved.', filtered));
            }
        }
        catch (err) {
            next(err);
        }
    }
    async UpdateOrganizationDetails(req, res, next) {
        try {
            const orgId = req.organizationId;
            const data = await OrganizationService_1.organizationService.UpdateOrganizationDetails(orgId, req.body);
            res.json(ApiResponse_1.ApiResponse.success('Organization details updated.', data));
        }
        catch (err) {
            next(err);
        }
    }
    async GetOrganizationThemeSettings(req, res, next) {
        try {
            const orgId = req.organizationId;
            const data = await OrganizationService_1.organizationService.GetOrganizationThemeSettings(orgId);
            res.json(ApiResponse_1.ApiResponse.success('Organization theme settings retrieved.', data));
        }
        catch (err) {
            next(err);
        }
    }
    async UpdateOrganizationThemeSettings(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = ThemeSchema.parse(req.body);
            const data = await OrganizationService_1.organizationService.UpdateOrganizationThemeSettings(orgId, parsed);
            res.json(ApiResponse_1.ApiResponse.success('Organization theme updated successfully.', data));
        }
        catch (err) {
            next(err);
        }
    }
    async GetOrganizationDashboard(req, res, next) {
        try {
            const orgId = req.organizationId;
            const data = await OrganizationService_1.organizationService.GetOrganizationDashboard(orgId);
            res.json(ApiResponse_1.ApiResponse.success('Organization dashboard metrics retrieved.', data));
        }
        catch (err) {
            next(err);
        }
    }
    async UploadOrganizationBranding(req, res, next) {
        try {
            const orgId = req.organizationId;
            const type = (req.body.type || req.query.type || 'logo');
            if (!req.file) {
                throw ApiError_1.ApiError.badRequest('No image file provided for upload.');
            }
            const data = await OrganizationService_1.organizationService.UploadOrganizationBranding(orgId, type, req.file);
            res.json(ApiResponse_1.ApiResponse.success(`Organization ${type} uploaded successfully.`, data));
        }
        catch (err) {
            next(err);
        }
    }
}
exports.OrganizationController = OrganizationController;
exports.organizationController = new OrganizationController();
