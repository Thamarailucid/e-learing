import { Router } from 'express';
import multer from 'multer';
import { organizationController } from './OrganizationController';
import { AuthenticateRequest } from '../../middleware/AuthenticateRequest';
import { ResolveOrganizationContext } from '../../middleware/ResolveOrganizationContext';
import { AuthorizeRoles, AuthorizePermission } from '../../middleware/AuthorizePermission';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

const router = Router();

// Organization-scoped endpoints
router.use(AuthenticateRequest, ResolveOrganizationContext);

router.get('/GetOrganizationDetails', (req, res, next) => organizationController.GetOrganizationDetails(req, res, next));
router.get('/GetOrganizationThemeSettings', (req, res, next) => organizationController.GetOrganizationThemeSettings(req, res, next));
router.get(
  '/GetOrganizationDashboard',
  AuthorizePermission('can_view_reports', 'MANAGER', 'INSTRUCTOR'),
  (req, res, next) => organizationController.GetOrganizationDashboard(req, res, next)
);

// Admin only endpoints
router.put(
  '/UpdateOrganizationDetails',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'),
  (req, res, next) => organizationController.UpdateOrganizationDetails(req, res, next)
);
router.put(
  '/UpdateOrganizationThemeSettings',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'),
  (req, res, next) => organizationController.UpdateOrganizationThemeSettings(req, res, next)
);
router.post(
  '/UploadOrganizationBranding',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'),
  upload.single('file'),
  (req, res, next) => organizationController.UploadOrganizationBranding(req, res, next)
);

export const OrganizationRoutes = router;
