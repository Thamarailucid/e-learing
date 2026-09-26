import { Router } from 'express';
import { publicController } from './PublicController';
import { staffInviteController } from '../staff/StaffInviteController';

const router = Router();

// Publicly accessible endpoints (No authentication required)
router.get('/GetPublicCatalog', (req, res, next) => publicController.GetPublicCatalog(req, res, next));
router.get('/GetAcademyPublicProfile/:slug', (req, res, next) => publicController.GetAcademyPublicProfile(req, res, next));
router.get('/GetPublicCourseDetails/:courseIdOrSlug', (req, res, next) => publicController.GetPublicCourseDetails(req, res, next));
router.get('/GetPublicOrganizationByCodeOrSlug/:codeOrSlug', (req, res, next) => publicController.GetPublicOrganizationByCodeOrSlug(req, res, next));

// Public Staff Invitation Lookup & Self-Registration
router.get('/GetStaffInviteDetails/:token', (req, res, next) => staffInviteController.GetStaffInviteDetails(req, res, next));
router.post('/RegisterStaffViaInvite', (req, res, next) => staffInviteController.RegisterStaffViaInvite(req, res, next));

export const PublicRoutes = router;
