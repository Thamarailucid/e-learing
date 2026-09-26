"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.certificateController = exports.CertificateController = void 0;
const zod_1 = require("zod");
const CertificateService_1 = require("./CertificateService");
const ApiResponse_1 = require("../../utils/ApiResponse");
const GenerateCertSchema = zod_1.z.object({
    courseId: zod_1.z.string().uuid(),
});
class CertificateController {
    async GenerateCertificate(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = GenerateCertSchema.parse(req.body);
            const result = await CertificateService_1.certificateService.GenerateCertificate(orgId, req.user.userId, parsed.courseId);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Certificate generated successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async VerifyCertificate(req, res, next) {
        try {
            const { certificateNumber } = req.params;
            const result = await CertificateService_1.certificateService.VerifyCertificate(certificateNumber);
            res.json(ApiResponse_1.ApiResponse.success('Certificate verification completed.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetStudentCertificateList(req, res, next) {
        try {
            const orgId = req.organizationId;
            const result = await CertificateService_1.certificateService.GetStudentCertificateList(req.user.userId, orgId);
            res.json(ApiResponse_1.ApiResponse.success('Certificates retrieved successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetStudentCertificateOverview(req, res, next) {
        try {
            const orgId = req.organizationId || req.headers['x-organization-id'] || undefined;
            const result = await CertificateService_1.certificateService.GetStudentCertificateOverview(req.user.userId, orgId);
            res.json(ApiResponse_1.ApiResponse.success('Certificate overview retrieved successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
}
exports.CertificateController = CertificateController;
exports.certificateController = new CertificateController();
