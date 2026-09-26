"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicRoutes = void 0;
const express_1 = require("express");
const PublicController_1 = require("./PublicController");
const StaffInviteController_1 = require("../staff/StaffInviteController");
const router = (0, express_1.Router)();
// Publicly accessible endpoints (No authentication required)
router.get('/GetPublicCatalog', (req, res, next) => PublicController_1.publicController.GetPublicCatalog(req, res, next));
router.get('/GetAcademyPublicProfile/:slug', (req, res, next) => PublicController_1.publicController.GetAcademyPublicProfile(req, res, next));
router.get('/GetPublicCourseDetails/:courseIdOrSlug', (req, res, next) => PublicController_1.publicController.GetPublicCourseDetails(req, res, next));
router.get('/GetPublicOrganizationByCodeOrSlug/:codeOrSlug', (req, res, next) => PublicController_1.publicController.GetPublicOrganizationByCodeOrSlug(req, res, next));
// Public Staff Invitation Lookup & Self-Registration
router.get('/GetStaffInviteDetails/:token', (req, res, next) => StaffInviteController_1.staffInviteController.GetStaffInviteDetails(req, res, next));
router.post('/RegisterStaffViaInvite', (req, res, next) => StaffInviteController_1.staffInviteController.RegisterStaffViaInvite(req, res, next));
exports.PublicRoutes = router;
