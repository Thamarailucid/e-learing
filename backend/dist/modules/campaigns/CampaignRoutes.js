"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignRoutes = void 0;
const express_1 = require("express");
const CampaignController_1 = require("./CampaignController");
const AuthenticateRequest_1 = require("../../middleware/AuthenticateRequest");
const ResolveOrganizationContext_1 = require("../../middleware/ResolveOrganizationContext");
const AuthorizePermission_1 = require("../../middleware/AuthorizePermission");
const router = (0, express_1.Router)();
// 1. Public Campaign Lookup (Student scans QR or opens shared outreach link)
router.get('/GetCampaignDetails/:inviteCode', (req, res, next) => CampaignController_1.campaignController.GetPublicCampaignDetails(req, res, next));
// 2. Student Campaign Redemption (Student claims access to private course)
router.post('/RedeemCampaignLink', AuthenticateRequest_1.AuthenticateRequest, (req, res, next) => CampaignController_1.campaignController.RedeemCampaignLink(req, res, next));
// 3. Organization Staff & Instructor Routes (Enforces can_manage_campaigns & can_manage_courses)
router.post('/CreateCampaignLink/:courseId', AuthenticateRequest_1.AuthenticateRequest, ResolveOrganizationContext_1.ResolveOrganizationContext, (0, AuthorizePermission_1.AuthorizePermission)('can_manage_campaigns'), (req, res, next) => CampaignController_1.campaignController.CreateCampaignLink(req, res, next));
router.get('/GetCourseCampaignList/:courseId', AuthenticateRequest_1.AuthenticateRequest, ResolveOrganizationContext_1.ResolveOrganizationContext, (0, AuthorizePermission_1.AuthorizePermission)('can_manage_campaigns'), (req, res, next) => CampaignController_1.campaignController.GetCourseCampaignList(req, res, next));
router.get('/GetCampaignRedemptions/:campaignId', AuthenticateRequest_1.AuthenticateRequest, ResolveOrganizationContext_1.ResolveOrganizationContext, (0, AuthorizePermission_1.AuthorizePermission)('can_manage_campaigns'), (req, res, next) => CampaignController_1.campaignController.GetCampaignRedemptions(req, res, next));
router.put('/ToggleCampaignStatus/:campaignId', AuthenticateRequest_1.AuthenticateRequest, ResolveOrganizationContext_1.ResolveOrganizationContext, (0, AuthorizePermission_1.AuthorizePermission)('can_manage_campaigns'), (req, res, next) => CampaignController_1.campaignController.ToggleCampaignStatus(req, res, next));
exports.CampaignRoutes = router;
