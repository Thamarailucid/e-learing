"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const QuizController_1 = require("./QuizController");
const AuthenticateRequest_1 = require("../../middleware/AuthenticateRequest");
const ResolveOrganizationContext_1 = require("../../middleware/ResolveOrganizationContext");
const AuthorizePermission_1 = require("../../middleware/AuthorizePermission");
const uploadDoc = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});
const router = (0, express_1.Router)();
router.use(AuthenticateRequest_1.AuthenticateRequest, ResolveOrganizationContext_1.ResolveOrganizationContext);
router.get('/GetQuizList/:courseId', (req, res, next) => QuizController_1.quizController.GetQuizList(req, res, next));
router.get('/GetQuizDetails/:quizId', (req, res, next) => QuizController_1.quizController.GetQuizDetails(req, res, next));
router.post('/CreateQuiz', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => QuizController_1.quizController.CreateQuiz(req, res, next));
router.put('/UpdateQuiz/:quizId', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => QuizController_1.quizController.UpdateQuiz(req, res, next));
router.post('/AddQuizQuestion/:quizId', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => QuizController_1.quizController.AddQuizQuestion(req, res, next));
router.put('/UpdateQuizQuestion/:questionId', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => QuizController_1.quizController.UpdateQuizQuestion(req, res, next));
router.delete('/DeleteQuizQuestion/:questionId', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => QuizController_1.quizController.DeleteQuizQuestion(req, res, next));
router.post('/UploadQuizAttachment/:quizId', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), uploadDoc.any(), (req, res, next) => QuizController_1.quizController.UploadQuizAttachment(req, res, next));
router.post('/DeleteQuizAttachment/:quizId', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => QuizController_1.quizController.DeleteQuizAttachment(req, res, next));
router.delete('/DeleteQuizAttachment/:quizId', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => QuizController_1.quizController.DeleteQuizAttachment(req, res, next));
router.post('/SubmitQuizAttempt', (req, res, next) => QuizController_1.quizController.SubmitQuizAttempt(req, res, next));
router.get('/GetStudentQuizAttempts/:quizId', (req, res, next) => QuizController_1.quizController.GetStudentQuizAttempts(req, res, next));
router.post('/EnsureModuleQuiz/:sectionId', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => QuizController_1.quizController.EnsureModuleQuiz(req, res, next));
router.post('/EnsureFinalCourseQuiz/:courseId', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => QuizController_1.quizController.EnsureFinalCourseQuiz(req, res, next));
exports.QuizRoutes = router;
