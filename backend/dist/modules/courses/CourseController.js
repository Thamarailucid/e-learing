"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseController = exports.CourseController = void 0;
const zod_1 = require("zod");
const CourseService_1 = require("./CourseService");
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const CreateCourseSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, 'Title must be at least 3 characters.'),
    description: zod_1.z.string().optional(),
    shortDescription: zod_1.z.string().optional(),
    level: zod_1.z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
    category: zod_1.z.string().optional(),
    thumbnailUrl: zod_1.z.string().optional(),
    isPrivate: zod_1.z.boolean().optional(),
    accessType: zod_1.z.string().optional(),
    minVideoWatchPercentage: zod_1.z.number().min(0).max(100).optional(),
    passQuizPercentage: zod_1.z.number().min(0).max(100).optional(),
});
const CreateSectionSchema = zod_1.z.object({
    courseId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1, 'Section title is required.'),
    orderIndex: zod_1.z.number().optional(),
});
const CreateLessonSchema = zod_1.z.object({
    courseId: zod_1.z.string().uuid(),
    sectionId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1, 'Lesson title is required.'),
    contentType: zod_1.z.enum(['VIDEO', 'DOCUMENT', 'ARTICLE']).optional(),
    videoUrl: zod_1.z.string().optional(),
    videoDurationSeconds: zod_1.z.number().optional(),
    articleContent: zod_1.z.string().optional(),
    documentUrl: zod_1.z.string().optional(),
    orderIndex: zod_1.z.number().optional(),
    isFreePreview: zod_1.z.boolean().optional(),
});
class CourseController {
    async GetCourseList(req, res, next) {
        try {
            const orgId = req.organizationId;
            const page = parseInt(req.query.page || '1', 10);
            const pageSize = parseInt(req.query.pageSize || '20', 10);
            const search = req.query.search;
            const isPublicOnly = req.query.isPublicOnly === 'true';
            const result = await CourseService_1.courseService.GetCourseList(orgId, page, pageSize, search, isPublicOnly);
            res.json(ApiResponse_1.ApiResponse.success('Course list retrieved successfully.', result.data, result.pagination));
        }
        catch (err) {
            next(err);
        }
    }
    async GetCourseDetails(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { courseId } = req.params;
            const result = await CourseService_1.courseService.GetCourseDetails(orgId, courseId);
            res.json(ApiResponse_1.ApiResponse.success('Course details retrieved successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async CreateCourse(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = CreateCourseSchema.parse(req.body);
            const result = await CourseService_1.courseService.CreateCourse(orgId, req.user.userId, parsed);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Course created successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async UpdateCourse(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { courseId } = req.params;
            const result = await CourseService_1.courseService.UpdateCourse(orgId, courseId, req.body);
            res.json(ApiResponse_1.ApiResponse.success('Course updated successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async PublishCourse(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { courseId } = req.params;
            const result = await CourseService_1.courseService.PublishCourse(orgId, courseId);
            res.json(ApiResponse_1.ApiResponse.success('Course published successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async UnpublishCourse(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { courseId } = req.params;
            const result = await CourseService_1.courseService.UnpublishCourse(orgId, courseId);
            res.json(ApiResponse_1.ApiResponse.success('Course unpublished successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async CreateCourseSection(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = CreateSectionSchema.parse(req.body);
            const result = await CourseService_1.courseService.CreateCourseSection(orgId, parsed.courseId, parsed.title, parsed.orderIndex);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Course section created successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async CreateLesson(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = CreateLessonSchema.parse(req.body);
            const result = await CourseService_1.courseService.CreateLesson(orgId, parsed.courseId, parsed.sectionId, parsed);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Lesson created successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async UploadCourseThumbnail(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { courseId } = req.params;
            if (!req.file) {
                throw ApiError_1.ApiError.badRequest('No thumbnail file provided.');
            }
            const result = await CourseService_1.courseService.UploadCourseThumbnail(orgId, courseId, req.file);
            res.json(ApiResponse_1.ApiResponse.success('Course thumbnail uploaded successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async LogCourseViolation(req, res, next) {
        try {
            const orgId = req.organizationId || req.user?.activeOrganizationId;
            const userId = req.user?.userId;
            const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || '127.0.0.1';
            const userAgent = req.headers['user-agent'] || 'Unknown';
            const { courseId, lessonId, violationType, details } = req.body;
            const result = await CourseService_1.courseService.LogCourseViolation({
                organizationId: orgId || null,
                userId: userId || null,
                courseId: courseId || null,
                lessonId: lessonId || null,
                violationType: violationType || 'SECURITY_VIOLATION',
                clientIp,
                userAgent,
                details: details || {},
            });
            res.status(201).json(ApiResponse_1.ApiResponse.success('Security violation logged successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
}
exports.CourseController = CourseController;
exports.courseController = new CourseController();
