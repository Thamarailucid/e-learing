"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoController = exports.VideoController = void 0;
const zod_1 = require("zod");
const VideoService_1 = require("./VideoService");
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const CreateInteractiveQuestionSchema = zod_1.z.object({
    lessonId: zod_1.z.string().uuid(),
    timestampSeconds: zod_1.z.number().min(0),
    questionText: zod_1.z.string().min(3),
    questionType: zod_1.z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER']).optional(),
    options: zod_1.z.array(zod_1.z.string()).min(2, 'At least 2 options are required for MCQ.'),
    correctAnswer: zod_1.z.string().min(1),
    explanation: zod_1.z.string().optional(),
    isRequired: zod_1.z.boolean().optional(),
    displayMode: zod_1.z.enum(['FIXED', 'RANDOM', 'QUESTION_POOL']).optional(),
});
const SubmitAnswerSchema = zod_1.z.object({
    questionId: zod_1.z.string().uuid(),
    submittedAnswer: zod_1.z.string().min(1),
});
class VideoController {
    async UploadCourseVideo(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { lessonId } = req.params;
            const file = req.file || (req.files && Array.isArray(req.files) ? req.files[0] : req.files?.video?.[0] || req.files?.file?.[0]);
            if (!file)
                throw ApiError_1.ApiError.badRequest('No video file provided for upload.');
            const result = await VideoService_1.videoService.UploadCourseVideo(orgId, lessonId, file);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Course video uploaded successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async GenerateVideoPlaybackUrl(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { lessonId } = req.params;
            const result = await VideoService_1.videoService.GenerateVideoPlaybackUrl(orgId, req.user.userId, lessonId);
            res.json(ApiResponse_1.ApiResponse.success('Video playback authorized.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetVideoInteractiveQuestionList(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { lessonId } = req.params;
            const result = await VideoService_1.videoService.GetVideoInteractiveQuestionList(orgId, lessonId);
            res.json(ApiResponse_1.ApiResponse.success('Interactive questions retrieved.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async CreateVideoInteractiveQuestion(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = CreateInteractiveQuestionSchema.parse(req.body);
            const result = await VideoService_1.videoService.CreateVideoInteractiveQuestion(orgId, parsed);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Interactive question added to video timeline.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async SubmitVideoInteractiveQuestionAnswer(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = SubmitAnswerSchema.parse(req.body);
            const result = await VideoService_1.videoService.SubmitVideoInteractiveQuestionAnswer(orgId, parsed.questionId, parsed.submittedAnswer);
            res.json(ApiResponse_1.ApiResponse.success('Answer evaluated successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetTranscodingStatus(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { lessonId } = req.params;
            const result = await VideoService_1.videoService.GetTranscodingStatus(orgId, lessonId);
            res.json(ApiResponse_1.ApiResponse.success('Transcoding status retrieved.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async RetryTranscoding(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { lessonId } = req.params;
            const result = await VideoService_1.videoService.RetryTranscoding(orgId, lessonId);
            res.json(ApiResponse_1.ApiResponse.success('Transcoding retried.', result));
        }
        catch (err) {
            next(err);
        }
    }
}
exports.VideoController = VideoController;
exports.videoController = new VideoController();
