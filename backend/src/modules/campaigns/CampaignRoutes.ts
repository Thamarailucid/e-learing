import { Router } from 'express';
import { campaignController } from './CampaignController';
import { AuthenticateRequest } from '../../middleware/AuthenticateRequest';
import { ResolveOrganizationContext } from '../../middleware/ResolveOrganizationContext';
import { AuthorizePermission } from '../../middleware/AuthorizePermission';

const router = Router();

// 1. Public Campaign Lookup (Student scans QR or opens shared outreach link)
router.get('/GetCampaignDetails/:inviteCode', (req, res, next) =>
  campaignController.GetPublicCampaignDetails(req, res, next)
);

// 2. Student Campaign Redemption (Student claims access to private course)
router.post('/RedeemCampaignLink', AuthenticateRequest, (req, res, next) =>
  campaignController.RedeemCampaignLink(req, res, next)
);

// 3. Organization Staff & Instructor Routes (Enforces can_manage_campaigns & can_manage_courses)
router.post(
  '/CreateCampaignLink/:courseId',
  AuthenticateRequest,
  ResolveOrganizationContext,
  AuthorizePermission('can_manage_campaigns'),
  (req, res, next) => campaignController.CreateCampaignLink(req, res, next)
);

router.get(
  '/GetCourseCampaignList/:courseId',
  AuthenticateRequest,
  ResolveOrganizationContext,
  AuthorizePermission('can_manage_campaigns'),
  (req, res, next) => campaignController.GetCourseCampaignList(req, res, next)
);

router.get(
  '/GetCampaignRedemptions/:campaignId',
  AuthenticateRequest,
  ResolveOrganizationContext,
  AuthorizePermission('can_manage_campaigns'),
  (req, res, next) => campaignController.GetCampaignRedemptions(req, res, next)
);

router.put(
  '/ToggleCampaignStatus/:campaignId',
  AuthenticateRequest,
  ResolveOrganizationContext,
  AuthorizePermission('can_manage_campaigns'),
  (req, res, next) => campaignController.ToggleCampaignStatus(req, res, next)
);

router.put(
  '/UpdateCampaignLink/:campaignId',
  AuthenticateRequest,
  ResolveOrganizationContext,
  AuthorizePermission('can_manage_campaigns'),
  (req, res, next) => campaignController.UpdateCampaignLink(req, res, next)
);

router.delete(
  '/DeleteCampaignLink/:campaignId',
  AuthenticateRequest,
  ResolveOrganizationContext,
  AuthorizePermission('can_manage_campaigns'),
  (req, res, next) => campaignController.DeleteCampaignLink(req, res, next)
);

export const CampaignRoutes = router;
