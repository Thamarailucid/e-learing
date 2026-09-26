"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffRoutes = void 0;
const express_1 = require("express");
const StaffController_1 = require("./StaffController");
const StaffInviteController_1 = require("./StaffInviteController");
const AuthenticateRequest_1 = require("../../middleware/AuthenticateRequest");
const ResolveOrganizationContext_1 = require("../../middleware/ResolveOrganizationContext");
const AuthorizePermission_1 = require("../../middleware/AuthorizePermission");
const router = (0, express_1.Router)();
router.use(AuthenticateRequest_1.AuthenticateRequest, ResolveOrganizationContext_1.ResolveOrganizationContext);
router.get('/GetStaffList', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER'), (req, res, next) => StaffController_1.staffController.GetStaffList(req, res, next));
router.post('/CreateStaffMember', (0, AuthorizePermission_1.AuthorizePermission)('can_manage_staff'), (req, res, next) => StaffController_1.staffController.CreateStaffMember(req, res, next));
router.put('/UpdateStaffMember', (0, AuthorizePermission_1.AuthorizePermission)('can_manage_staff'), (req, res, next) => StaffController_1.staffController.UpdateStaffMember(req, res, next));
router.put('/UpdateStaffMember/:staffUserId', (0, AuthorizePermission_1.AuthorizePermission)('can_manage_staff'), (req, res, next) => StaffController_1.staffController.UpdateStaffMember(req, res, next));
router.post('/ResetStaffPassword', (0, AuthorizePermission_1.AuthorizePermission)('can_manage_staff'), (req, res, next) => StaffController_1.staffController.ResetStaffPassword(req, res, next));
router.post('/ResetStaffPassword/:staffUserId', (0, AuthorizePermission_1.AuthorizePermission)('can_manage_staff'), (req, res, next) => StaffController_1.staffController.ResetStaffPassword(req, res, next));
// --- Role Permissions Template Management ---
router.get('/GetRolePermissionsList', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER'), (req, res, next) => StaffController_1.staffController.GetRolePermissionsList(req, res, next));
router.put('/UpdateRolePermissions/:roleId', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'), (req, res, next) => StaffController_1.staffController.UpdateRolePermissions(req, res, next));
// --- Bulk Staff Invite Links & QR Codes ---
router.post('/CreateStaffInviteLink', (0, AuthorizePermission_1.AuthorizePermission)('can_manage_staff'), (req, res, next) => StaffInviteController_1.staffInviteController.CreateStaffInviteLink(req, res, next));
router.get('/GetStaffInviteList', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER'), (req, res, next) => StaffInviteController_1.staffInviteController.GetStaffInviteList(req, res, next));
router.put('/ToggleStaffInviteStatus/:inviteId', (0, AuthorizePermission_1.AuthorizePermission)('can_manage_staff'), (req, res, next) => StaffInviteController_1.staffInviteController.ToggleStaffInviteStatus(req, res, next));
router.get('/GetStaffInviteRegistrations/:inviteId', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER'), (req, res, next) => StaffInviteController_1.staffInviteController.GetStaffInviteRegistrations(req, res, next));
exports.StaffRoutes = router;
