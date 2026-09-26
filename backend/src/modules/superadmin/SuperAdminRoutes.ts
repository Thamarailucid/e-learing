import { Router } from 'express';
import { superAdminController } from './SuperAdminController';
import { AuthenticateRequest } from '../../middleware/AuthenticateRequest';
import { RequireSuperAdmin } from '../../middleware/AuthorizePermission';

const router = Router();

router.use(AuthenticateRequest, RequireSuperAdmin);

router.get('/GetSuperAdminDashboard', (req, res, next) => superAdminController.GetSuperAdminDashboard(req, res, next));
router.get('/GetOrganizationList', (req, res, next) => superAdminController.GetOrganizationList(req, res, next));
router.post('/CreateOrganization', (req, res, next) => superAdminController.CreateOrganization(req, res, next));
router.post('/SuspendOrganization/:organizationId', (req, res, next) => superAdminController.SuspendOrganization(req, res, next));
router.post('/ActivateOrganization/:organizationId', (req, res, next) => superAdminController.ActivateOrganization(req, res, next));
router.put('/UpdateOrganizationPlanTier/:organizationId', (req, res, next) => superAdminController.UpdateOrganizationPlanTier(req, res, next));
router.post('/ResetOrganizationOwnerPassword/:organizationId', (req, res, next) => superAdminController.ResetOrganizationOwnerPassword(req, res, next));
router.put('/UpdateOrganizationOwner/:organizationId', (req, res, next) => superAdminController.UpdateOrganizationOwner(req, res, next));
router.put('/UpdateOrganizationProfile/:organizationId', (req, res, next) => superAdminController.UpdateOrganizationProfile(req, res, next));
router.get('/GetPlatformAuditLogList', (req, res, next) => superAdminController.GetPlatformAuditLogList(req, res, next));
router.get('/GetAuditLogFilterOptions', (req, res, next) => superAdminController.GetAuditLogFilterOptions(req, res, next));

import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
router.post('/UploadOrganizationLogo/:organizationId', upload.single('file'), (req, res, next) => superAdminController.UploadOrganizationLogo(req, res, next));

export const SuperAdminRoutes = router;
