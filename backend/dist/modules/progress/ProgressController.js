"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressController = exports.ProgressController = void 0;
const zod_1 = require("zod");
const ProgressService_1 = require("./ProgressService");
const ApiResponse_1 = require("../../utils/ApiResponse");
const SaveWatchProgressSchema = zod_1.z.object({
    lessonId: zod_1.z.string().uuid(),
    lastPositionSeconds: zod_1.z.number().min(0),
    watchPercentage: zod_1.z.number().min(0).max(100),
});
const SetActiveLessonSchema = zod_1.z.object({
    courseId: zod_1.z.string().uuid(),
    lessonId: zod_1.z.string().uuid(),
});
class ProgressController {
    async SetActiveLesson(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = SetActiveLessonSchema.parse(req.body);
            const result = await ProgressService_1.progressService.SetActiveLesson(orgId, req.user.userId, parsed.courseId, parsed.lessonId);
            res.json(ApiResponse_1.ApiResponse.success('Active lesson updated.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async SaveStudentVideoWatchProgress(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = SaveWatchProgressSchema.parse(req.body);
            const result = await ProgressService_1.progressService.SaveStudentVideoWatchProgress(orgId, req.user.userId, parsed);
            res.json(ApiResponse_1.ApiResponse.success('Watch progress recorded successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async MarkLessonAsCompleted(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { lessonId } = req.params;
            const result = await ProgressService_1.progressService.MarkLessonAsCompleted(orgId, req.user.userId, lessonId);
            res.json(ApiResponse_1.ApiResponse.success('Lesson marked as completed.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetStudentCourseProgress(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { courseId } = req.params;
            const result = await ProgressService_1.progressService.GetStudentCourseProgress(orgId, req.user.userId, courseId);
            res.json(ApiResponse_1.ApiResponse.success('Course progress retrieved successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async CheckCourseCompletionEligibility(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { courseId } = req.params;
            const result = await ProgressService_1.progressService.CheckCourseCompletionEligibility(orgId, req.user.userId, courseId);
            res.json(ApiResponse_1.ApiResponse.success('Completion eligibility checked.', result));
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ProgressController = ProgressController;
exports.progressController = new ProgressController();
