"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificateRoutes = void 0;
const express_1 = require("express");
const CertificateController_1 = require("./CertificateController");
const AuthenticateRequest_1 = require("../../middleware/AuthenticateRequest");
const ResolveOrganizationContext_1 = require("../../middleware/ResolveOrganizationContext");
const router = (0, express_1.Router)();
// Public Verification Endpoint (No auth required)
router.get('/VerifyCertificate/:certificateNumber', (req, res, next) => CertificateController_1.certificateController.VerifyCertificate(req, res, next));
// Protected Certificate Endpoints
router.post('/GenerateCertificate', AuthenticateRequest_1.AuthenticateRequest, ResolveOrganizationContext_1.ResolveOrganizationContext, (req, res, next) => CertificateController_1.certificateController.GenerateCertificate(req, res, next));
router.get('/GetStudentCertificateList', AuthenticateRequest_1.AuthenticateRequest, (req, res, next) => CertificateController_1.certificateController.GetStudentCertificateList(req, res, next));
router.get('/GetStudentCertificateOverview', AuthenticateRequest_1.AuthenticateRequest, (req, res, next) => CertificateController_1.certificateController.GetStudentCertificateOverview(req, res, next));
exports.CertificateRoutes = router;
