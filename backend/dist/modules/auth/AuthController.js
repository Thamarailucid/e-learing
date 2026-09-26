"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const zod_1 = require("zod");
const AuthService_1 = require("./AuthService");
const ApiResponse_1 = require("../../utils/ApiResponse");
const ClientIpResolver_1 = require("../../utils/ClientIpResolver");
const LoginSchema = zod_1.z.object({
    email: zod_1.z.string().min(3, 'Please provide an email address or username.'),
    password: zod_1.z.string().min(1, 'Password is required.'),
    organizationId: zod_1.z.string().uuid().optional(),
    clearPreviousSession: zod_1.z.boolean().optional(),
    clientIp: zod_1.z.string().optional(),
});
const RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().min(3, 'Please provide a valid email address.'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters long.'),
    firstName: zod_1.z.string().min(1, 'First name is required.'),
    lastName: zod_1.z.string().min(1, 'Last name is required.'),
    phone: zod_1.z.string().optional(),
    organizationId: zod_1.z.string().uuid().optional(),
    organizationSlug: zod_1.z.string().optional(),
    organizationCode: zod_1.z.string().optional(),
});
const RefreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required.'),
});
const SwitchOrgSchema = zod_1.z.object({
    organizationId: zod_1.z.string().uuid('Valid organization ID is required.'),
});
const ResetFirstTimePasswordSchema = zod_1.z.object({
    newPassword: zod_1.z.string().min(6, 'Password must be at least 6 characters long.'),
});
class AuthController {
    async PostLoginUser(req, res, next) {
        try {
            const parsed = LoginSchema.parse(req.body);
            const clientIp = await (0, ClientIpResolver_1.ResolveRequestClientIp)(req, parsed.clientIp);
            const result = await AuthService_1.authService.PostLoginUser(parsed.email, parsed.password, parsed.organizationId, parsed.clearPreviousSession, clientIp);
            res.json(ApiResponse_1.ApiResponse.success('User authenticated successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async PostRegisterUser(req, res, next) {
        try {
            const parsed = RegisterSchema.parse(req.body);
            const result = await AuthService_1.authService.PostRegisterUser(parsed);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Account registered successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async PostRefreshAccessToken(req, res, next) {
        try {
            const parsed = RefreshSchema.parse(req.body);
            const result = await AuthService_1.authService.PostRefreshAccessToken(parsed.refreshToken);
            res.json(ApiResponse_1.ApiResponse.success('Access token refreshed successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetAuthenticatedUserProfile(req, res, next) {
        try {
            const activeOrgId = req.organizationId || req.query.organizationId;
            const result = await AuthService_1.authService.GetAuthenticatedUserProfile(req.user.userId, activeOrgId);
            res.json(ApiResponse_1.ApiResponse.success('Profile retrieved successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async PostResetFirstTimePassword(req, res, next) {
        try {
            const parsed = ResetFirstTimePasswordSchema.parse(req.body);
            const activeOrgId = req.organizationId || req.body.organizationId;
            const clientIp = await (0, ClientIpResolver_1.ResolveRequestClientIp)(req);
            const result = await AuthService_1.authService.PostResetFirstTimePassword(req.user.userId, parsed.newPassword, activeOrgId, clientIp);
            res.json(ApiResponse_1.ApiResponse.success(result.message, result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetAuthenticatedUserOrganizations(req, res, next) {
        try {
            const result = await AuthService_1.authService.GetAuthenticatedUserOrganizations(req.user.userId);
            res.json(ApiResponse_1.ApiResponse.success('User organizations retrieved successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async PostSwitchActiveOrganization(req, res, next) {
        try {
            const parsed = SwitchOrgSchema.parse(req.body);
            const result = await AuthService_1.authService.PostSwitchActiveOrganization(req.user.userId, parsed.organizationId);
            res.json(ApiResponse_1.ApiResponse.success('Active organization switched successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async PostLogoutUser(req, res, next) {
        try {
            await AuthService_1.authService.PostLogoutUser(req.user?.userId);
            res.json(ApiResponse_1.ApiResponse.success('User logged out successfully.'));
        }
        catch (err) {
            next(err);
        }
    }
    async UpdateUserProfile(req, res, next) {
        try {
            const { firstName, lastName, phone, avatarUrl } = req.body;
            const activeOrgId = req.organizationId || req.query.organizationId;
            const result = await AuthService_1.authService.UpdateUserProfile(req.user.userId, { firstName, lastName, phone, avatarUrl }, activeOrgId);
            res.json(ApiResponse_1.ApiResponse.success('Profile updated successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async DeleteProfileAvatar(req, res, next) {
        try {
            const activeOrgId = req.organizationId || req.query.organizationId;
            const result = await AuthService_1.authService.DeleteProfileAvatar(req.user.userId, activeOrgId);
            res.json(ApiResponse_1.ApiResponse.success('Profile avatar removed successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
