"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRoutes = void 0;
const express_1 = require("express");
const AuthController_1 = require("./AuthController");
const AuthenticateRequest_1 = require("../../middleware/AuthenticateRequest");
const router = (0, express_1.Router)();
router.post('/PostLoginUser', (req, res, next) => AuthController_1.authController.PostLoginUser(req, res, next));
router.post('/PostRegisterUser', (req, res, next) => AuthController_1.authController.PostRegisterUser(req, res, next));
router.post('/PostRefreshAccessToken', (req, res, next) => AuthController_1.authController.PostRefreshAccessToken(req, res, next));
router.post('/PostLogoutUser', (req, res, next) => AuthController_1.authController.PostLogoutUser(req, res, next));
// Protected Auth Routes
router.get('/GetAuthenticatedUserProfile', AuthenticateRequest_1.AuthenticateRequest, (req, res, next) => AuthController_1.authController.GetAuthenticatedUserProfile(req, res, next));
router.get('/GetAuthenticatedUserOrganizations', AuthenticateRequest_1.AuthenticateRequest, (req, res, next) => AuthController_1.authController.GetAuthenticatedUserOrganizations(req, res, next));
router.post('/PostSwitchActiveOrganization', AuthenticateRequest_1.AuthenticateRequest, (req, res, next) => AuthController_1.authController.PostSwitchActiveOrganization(req, res, next));
router.post('/PostResetFirstTimePassword', AuthenticateRequest_1.AuthenticateRequest, (req, res, next) => AuthController_1.authController.PostResetFirstTimePassword(req, res, next));
exports.AuthRoutes = router;
