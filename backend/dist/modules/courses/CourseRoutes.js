"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const CourseController_1 = require("./CourseController");
const AuthenticateRequest_1 = require("../../middleware/AuthenticateRequest");
const ResolveOrganizationContext_1 = require("../../middleware/ResolveOrganizationContext");
const AuthorizePermission_1 = require("../../middleware/AuthorizePermission");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
const router = (0, express_1.Router)();
router.use(AuthenticateRequest_1.AuthenticateRequest, ResolveOrganizationContext_1.ResolveOrganizationContext);
// Read courses
router.get('/GetCourseList', (req, res, next) => CourseController_1.courseController.GetCourseList(req, res, next));
router.get('/GetCourseDetails/:courseId', (req, res, next) => CourseController_1.courseController.GetCourseDetails(req, res, next));
// Course authoring (Staff / Instructor / Admin)
router.post('/CreateCourse', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR', 'CONTENT_MANAGER'), (req, res, next) => CourseController_1.courseController.CreateCourse(req, res, next));
router.put('/UpdateCourse/:courseId', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR', 'CONTENT_MANAGER'), (req, res, next) => CourseController_1.courseController.UpdateCourse(req, res, next));
router.post('/PublishCourse/:courseId', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'), (req, res, next) => CourseController_1.courseController.PublishCourse(req, res, next));
router.post('/UnpublishCourse/:courseId', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'), (req, res, next) => CourseController_1.courseController.UnpublishCourse(req, res, next));
router.post('/CreateCourseSection', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR', 'CONTENT_MANAGER'), (req, res, next) => CourseController_1.courseController.CreateCourseSection(req, res, next));
router.post('/CreateLesson', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR', 'CONTENT_MANAGER'), (req, res, next) => CourseController_1.courseController.CreateLesson(req, res, next));
router.post('/UploadCourseThumbnail/:courseId', (0, AuthorizePermission_1.AuthorizeRoles)('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), upload.single('thumbnail'), (req, res, next) => CourseController_1.courseController.UploadCourseThumbnail(req, res, next));
// Security & Anti-Piracy Violation Logging
router.post('/LogCourseViolation', (req, res, next) => CourseController_1.courseController.LogCourseViolation(req, res, next));
exports.CourseRoutes = router;
