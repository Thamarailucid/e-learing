import { Router } from 'express';
import { staffController } from './StaffController';
import { staffInviteController } from './StaffInviteController';
import { AuthenticateRequest } from '../../middleware/AuthenticateRequest';
import { ResolveOrganizationContext } from '../../middleware/ResolveOrganizationContext';
import { AuthorizeRoles, AuthorizePermission } from '../../middleware/AuthorizePermission';

const router = Router();

router.use(AuthenticateRequest, ResolveOrganizationContext);

router.get(
  '/GetStaffList',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER'),
  (req, res, next) => staffController.GetStaffList(req, res, next)
);

router.post(
  '/CreateStaffMember',
  AuthorizePermission('can_manage_staff'),
  (req, res, next) => staffController.CreateStaffMember(req, res, next)
);

router.put(
  '/UpdateStaffMember',
  AuthorizePermission('can_manage_staff'),
  (req, res, next) => staffController.UpdateStaffMember(req, res, next)
);

router.put(
  '/UpdateStaffMember/:staffUserId',
  AuthorizePermission('can_manage_staff'),
  (req, res, next) => staffController.UpdateStaffMember(req, res, next)
);

router.post(
  '/ResetStaffPassword',
  AuthorizePermission('can_manage_staff'),
  (req, res, next) => staffController.ResetStaffPassword(req, res, next)
);

router.post(
  '/ResetStaffPassword/:staffUserId',
  AuthorizePermission('can_manage_staff'),
  (req, res, next) => staffController.ResetStaffPassword(req, res, next)
);

// --- Role Permissions Template Management ---
router.get(
  '/GetRolePermissionsList',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER'),
  (req, res, next) => staffController.GetRolePermissionsList(req, res, next)
);

router.put(
  '/UpdateRolePermissions/:roleId',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'),
  (req, res, next) => staffController.UpdateRolePermissions(req, res, next)
);

// --- Bulk Staff Invite Links & QR Codes ---
router.post(
  '/CreateStaffInviteLink',
  AuthorizePermission('can_manage_bulk_staff'),
  (req, res, next) => staffInviteController.CreateStaffInviteLink(req, res, next)
);

router.get(
  '/GetStaffInviteList',
  AuthorizePermission('can_manage_bulk_staff', 'can_manage_staff', 'MANAGER'),
  (req, res, next) => staffInviteController.GetStaffInviteList(req, res, next)
);

router.put(
  '/ToggleStaffInviteStatus/:inviteId',
  AuthorizePermission('can_manage_bulk_staff'),
  (req, res, next) => staffInviteController.ToggleStaffInviteStatus(req, res, next)
);

router.get(
  '/GetStaffInviteRegistrations/:inviteId',
  AuthorizePermission('can_manage_bulk_staff', 'can_manage_staff', 'MANAGER'),
  (req, res, next) => staffInviteController.GetStaffInviteRegistrations(req, res, next)
);

export const StaffRoutes = router;

