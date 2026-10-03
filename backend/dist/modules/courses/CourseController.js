"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseController = exports.CourseController = void 0;
const zod_1 = require("zod");
const CourseService_1 = require("./CourseService");
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const ClientIpResolver_1 = require("../../utils/ClientIpResolver");
const CreateCourseSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, 'Title must be at least 3 characters.'),
    description: zod_1.z.string().optional(),
    shortDescription: zod_1.z.string().optional(),
    level: zod_1.z.string().optional(),
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
    contentType: zod_1.z.enum(['VIDEO', 'DOCUMENT', 'ARTICLE', 'QUIZ']).optional(),
    videoUrl: zod_1.z.string().optional(),
    videoDurationSeconds: zod_1.z.number().optional(),
    articleContent: zod_1.z.string().optional(),
    documentUrl: zod_1.z.string().optional(),
    orderIndex: zod_1.z.number().optional(),
    isFreePreview: zod_1.z.boolean().optional(),
});
const UpdateSectionSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Section title is required.'),
    orderIndex: zod_1.z.number().optional(),
});
const UpdateLessonSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Lesson title is required.').optional(),
    contentType: zod_1.z.enum(['VIDEO', 'DOCUMENT', 'ARTICLE', 'QUIZ']).optional(),
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
            const isStudent = req.user?.role === 'STUDENT';
            const isPublicOnly = req.query.isPublicOnly === 'true';
            const studentUserId = isStudent ? req.user?.userId : undefined;
            const category = req.query.category;
            const level = req.query.level;
            const status = req.query.status;
            const accessType = req.query.accessType;
            const result = await CourseService_1.courseService.GetCourseList(orgId, page, pageSize, search, isPublicOnly, category, level, status, accessType, studentUserId);
            res.json(ApiResponse_1.ApiResponse.success('Course list retrieved successfully.', result.data, result.pagination));
        }
        catch (err) {
            next(err);
        }
    }
    async GetStudentEnrolledCourses(req, res, next) {
        try {
            const orgId = req.organizationId;
            const userId = req.user.userId;
            const result = await CourseService_1.courseService.GetStudentEnrolledCourses(orgId, userId);
            res.json(ApiResponse_1.ApiResponse.success('Student enrolled courses retrieved successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetCourseDetails(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { courseId } = req.params;
            const callerRole = req.user?.role || '';
            const result = await CourseService_1.courseService.GetCourseDetails(orgId, courseId, callerRole);
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
    async UpdateCourseSection(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { sectionId } = req.params;
            const parsed = UpdateSectionSchema.parse(req.body);
            const result = await CourseService_1.courseService.UpdateCourseSection(orgId, sectionId, parsed.title, parsed.orderIndex);
            res.json(ApiResponse_1.ApiResponse.success('Course section updated successfully.', result));
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
    async UpdateLesson(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { lessonId } = req.params;
            const parsed = UpdateLessonSchema.parse(req.body);
            const result = await CourseService_1.courseService.UpdateLesson(orgId, lessonId, parsed);
            res.json(ApiResponse_1.ApiResponse.success('Lesson updated successfully.', result));
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
            const clientIp = await (0, ClientIpResolver_1.ResolveRequestClientIp)(req);
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
    async DeleteCourse(req, res, next) {
        try {
            const organizationId = req.organizationId;
            const { courseId } = req.params;
            const actorUserId = req.user.userId;
            const clientIp = req.headers['x-client-ip'] || req.ip || '127.0.0.1';
            const userAgent = req.headers['user-agent'] || 'Unknown';
            const result = await CourseService_1.courseService.DeleteCourse(organizationId, courseId, actorUserId, clientIp, userAgent);
            res.status(200).json(ApiResponse_1.ApiResponse.success(result.message, null));
        }
        catch (err) {
            next(err);
        }
    }
    async DeleteCourseSection(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { sectionId } = req.params;
            const result = await CourseService_1.courseService.DeleteCourseSection(orgId, sectionId);
            res.json(ApiResponse_1.ApiResponse.success(result.message, result));
        }
        catch (err) {
            next(err);
        }
    }
    async DeleteLesson(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { lessonId } = req.params;
            const result = await CourseService_1.courseService.DeleteLesson(orgId, lessonId);
            res.json(ApiResponse_1.ApiResponse.success(result.message, result));
        }
        catch (err) {
            next(err);
        }
    }
    async UploadLessonAttachment(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { lessonId } = req.params;
            const file = req.file || (req.files && Array.isArray(req.files) ? req.files[0] : req.files?.file?.[0] || req.files?.attachment?.[0]);
            if (!file)
                throw ApiError_1.ApiError.badRequest('No file provided.');
            const result = await CourseService_1.courseService.UploadLessonAttachment(orgId, lessonId, file);
            res.json(ApiResponse_1.ApiResponse.success('Attachment uploaded successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async DeleteLessonAttachment(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { lessonId } = req.params;
            const attachmentUrl = req.body?.attachmentUrl || req.body?.url || req.query?.url;
            if (!attachmentUrl)
                throw ApiError_1.ApiError.badRequest('Attachment URL is required.');
            const result = await CourseService_1.courseService.DeleteLessonAttachment(orgId, lessonId, attachmentUrl);
            res.json(ApiResponse_1.ApiResponse.success('Attachment deleted successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async ScaffoldCourseraFlow(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { courseId } = req.params;
            const result = await CourseService_1.courseService.ScaffoldCourseraFlow(orgId, courseId);
            res.json(ApiResponse_1.ApiResponse.success('Coursera flow scaffolded successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async SubmitCourseFeedback(req, res, next) {
        try {
            const orgId = req.organizationId;
            const userId = req.user.userId;
            const { courseId, rating, feedbackText } = req.body;
            if (!courseId || rating === undefined)
                throw ApiError_1.ApiError.badRequest('courseId and rating are required.');
            const result = await CourseService_1.courseService.SubmitCourseFeedback(orgId, userId, courseId, rating, feedbackText);
            res.json(ApiResponse_1.ApiResponse.success('Feedback submitted successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetCourseFeedback(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { courseId } = req.params;
            const result = await CourseService_1.courseService.GetCourseFeedback(orgId, courseId);
            res.json(ApiResponse_1.ApiResponse.success('Feedback retrieved successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
}
exports.CourseController = CourseController;
exports.courseController = new CourseController();
