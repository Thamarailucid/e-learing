"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const OrganizationController_1 = require("./OrganizationController");
const AuthenticateRequest_1 = require("../../middleware/AuthenticateRequest");
const ResolveOrganizationContext_1 = require("../../middleware/ResolveOrganizationContext");
const AuthorizePermission_1 = require("../../middleware/AuthorizePermission");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});
const router = (0, express_1.Router)();
// Organization-scoped endpoints
router.use(AuthenticateRequest_1.AuthenticateRequest, ResolveOrganizationContext_1.ResolveOrganizationContext);
router.get('/GetOrganizationDetails', (req, res, next) => OrganizationController_1.organizationController.GetOrganizationDetails(req, res, next));
router.get('/GetOrganizationThemeSettings', (req, res, next) => OrganizationController_1.organizationController.GetOrganizationThemeSettings(req, res, next));
router.get('/GetOrganizationDashboard', (0, AuthorizePermission_1.AuthorizePermission)('can_view_reports', 'MANAGER', 'INSTRUCTOR'), (req, res, next) => OrganizationController_1.organizationController.GetOrganizationDashboard(req, res, next));
// Admin only endpoints
router.put('/UpdateOrganizationDetails', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'), (req, res, next) => OrganizationController_1.organizationController.UpdateOrganizationDetails(req, res, next));
router.put('/UpdateOrganizationThemeSettings', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'), (req, res, next) => OrganizationController_1.organizationController.UpdateOrganizationThemeSettings(req, res, next));
router.post('/UploadOrganizationBranding', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'), upload.single('file'), (req, res, next) => OrganizationController_1.organizationController.UploadOrganizationBranding(req, res, next));
exports.OrganizationRoutes = router;
