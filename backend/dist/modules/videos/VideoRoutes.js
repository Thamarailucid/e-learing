"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const VideoController_1 = require("./VideoController");
const AuthenticateRequest_1 = require("../../middleware/AuthenticateRequest");
const ResolveOrganizationContext_1 = require("../../middleware/ResolveOrganizationContext");
const AuthorizePermission_1 = require("../../middleware/AuthorizePermission");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});
const router = (0, express_1.Router)();
router.use(AuthenticateRequest_1.AuthenticateRequest, ResolveOrganizationContext_1.ResolveOrganizationContext);
// Video streaming authorization
router.get('/GenerateVideoPlaybackUrl/:lessonId', (req, res, next) => VideoController_1.videoController.GenerateVideoPlaybackUrl(req, res, next));
// Transcoding Status & Retry
router.get('/GetTranscodingStatus/:lessonId', (req, res, next) => VideoController_1.videoController.GetTranscodingStatus(req, res, next));
router.post('/RetryTranscoding/:lessonId', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => VideoController_1.videoController.RetryTranscoding(req, res, next));
// Video Upload (Staff only)
router.post('/UploadCourseVideo/:lessonId', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), upload.any(), (req, res, next) => VideoController_1.videoController.UploadCourseVideo(req, res, next));
// Interactive Video Questions
router.get('/GetVideoInteractiveQuestionList/:lessonId', (req, res, next) => VideoController_1.videoController.GetVideoInteractiveQuestionList(req, res, next));
router.post('/CreateVideoInteractiveQuestion', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => VideoController_1.videoController.CreateVideoInteractiveQuestion(req, res, next));
router.post('/SubmitVideoInteractiveQuestionAnswer', (req, res, next) => VideoController_1.videoController.SubmitVideoInteractiveQuestionAnswer(req, res, next));
exports.VideoRoutes = router;
