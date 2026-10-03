"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quizController = exports.QuizController = void 0;
const zod_1 = require("zod");
const QuizService_1 = require("./QuizService");
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const CreateQuizSchema = zod_1.z.object({
    courseId: zod_1.z.string().uuid(),
    sectionId: zod_1.z.string().uuid().optional(),
    title: zod_1.z.string().min(2),
    description: zod_1.z.string().optional(),
    passingScorePercentage: zod_1.z.number().min(0).max(100).optional(),
    timeLimitMinutes: zod_1.z.number().min(1).optional(),
    maxAttempts: zod_1.z.number().min(1).optional(),
    questions: zod_1.z
        .array(zod_1.z.object({
        questionText: zod_1.z.string().min(1),
        options: zod_1.z.array(zod_1.z.string()).min(2),
        correctAnswer: zod_1.z.string().min(1),
        explanation: zod_1.z.string().optional(),
        points: zod_1.z.number().optional(),
    }))
        .optional(),
});
const UpdateQuizSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).optional(),
    description: zod_1.z.string().optional(),
    passingScorePercentage: zod_1.z.number().min(0).max(100).optional(),
    timeLimitMinutes: zod_1.z.number().min(1).optional(),
    maxAttempts: zod_1.z.number().min(1).optional(),
});
const QuizQuestionSchema = zod_1.z.object({
    questionText: zod_1.z.string().min(1),
    options: zod_1.z.array(zod_1.z.string()).min(2),
    correctAnswer: zod_1.z.string().min(1),
    explanation: zod_1.z.string().optional(),
    points: zod_1.z.number().optional(),
    orderIndex: zod_1.z.number().optional(),
});
const UpdateQuizQuestionSchema = zod_1.z.object({
    questionText: zod_1.z.string().min(1).optional(),
    options: zod_1.z.array(zod_1.z.string()).min(2).optional(),
    correctAnswer: zod_1.z.string().min(1).optional(),
    explanation: zod_1.z.string().optional(),
    points: zod_1.z.number().optional(),
    orderIndex: zod_1.z.number().optional(),
});
const SubmitQuizSchema = zod_1.z.object({
    quizId: zod_1.z.string().uuid(),
    answers: zod_1.z.record(zod_1.z.string()),
});
class QuizController {
    async GetQuizList(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { courseId } = req.params;
            const result = await QuizService_1.quizService.GetQuizList(orgId, courseId);
            res.json(ApiResponse_1.ApiResponse.success('Quiz list retrieved.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetQuizDetails(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { quizId } = req.params;
            // Hide correct answers for students
            const isStaff = req.user?.isSuperAdmin || (req.user?.role && req.user.role !== 'STUDENT');
            const result = await QuizService_1.quizService.GetQuizDetails(orgId, quizId, !isStaff);
            res.json(ApiResponse_1.ApiResponse.success('Quiz details retrieved.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async CreateQuiz(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = CreateQuizSchema.parse(req.body);
            const result = await QuizService_1.quizService.CreateQuiz(orgId, parsed);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Quiz created successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async SubmitQuizAttempt(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = SubmitQuizSchema.parse(req.body);
            const result = await QuizService_1.quizService.SubmitQuizAttempt(orgId, req.user.userId, parsed.quizId, parsed.answers);
            res.json(ApiResponse_1.ApiResponse.success('Quiz submitted and scored successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetStudentQuizAttempts(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { quizId } = req.params;
            const result = await QuizService_1.quizService.GetStudentQuizAttempts(orgId, req.user.userId, quizId);
            res.json(ApiResponse_1.ApiResponse.success('Quiz attempts retrieved successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async UploadQuizAttachment(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { quizId } = req.params;
            const file = req.file || (req.files && Array.isArray(req.files) ? req.files[0] : req.files?.file?.[0] || req.files?.attachment?.[0]);
            if (!file)
                throw ApiError_1.ApiError.badRequest('No file provided.');
            const result = await QuizService_1.quizService.UploadQuizAttachment(orgId, quizId, file);
            res.json(ApiResponse_1.ApiResponse.success('Quiz attachment uploaded successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async DeleteQuizAttachment(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { quizId } = req.params;
            const attachmentUrl = req.body?.attachmentUrl || req.body?.url || req.query?.url;
            if (!attachmentUrl)
                throw ApiError_1.ApiError.badRequest('Attachment URL is required.');
            const result = await QuizService_1.quizService.DeleteQuizAttachment(orgId, quizId, attachmentUrl);
            res.json(ApiResponse_1.ApiResponse.success('Quiz attachment deleted successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async UpdateQuiz(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { quizId } = req.params;
            const parsed = UpdateQuizSchema.parse(req.body);
            const result = await QuizService_1.quizService.UpdateQuiz(orgId, quizId, parsed);
            res.json(ApiResponse_1.ApiResponse.success('Quiz updated successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async AddQuizQuestion(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { quizId } = req.params;
            const parsed = QuizQuestionSchema.parse(req.body);
            const result = await QuizService_1.quizService.AddQuizQuestion(orgId, quizId, parsed);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Quiz question added successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async UpdateQuizQuestion(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { questionId } = req.params;
            const parsed = UpdateQuizQuestionSchema.parse(req.body);
            const result = await QuizService_1.quizService.UpdateQuizQuestion(orgId, questionId, parsed);
            res.json(ApiResponse_1.ApiResponse.success('Quiz question updated successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async DeleteQuizQuestion(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { questionId } = req.params;
            const result = await QuizService_1.quizService.DeleteQuizQuestion(orgId, questionId);
            res.json(ApiResponse_1.ApiResponse.success('Quiz question deleted successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async EnsureModuleQuiz(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { sectionId } = req.params;
            const { courseId } = req.body;
            if (!courseId)
                throw ApiError_1.ApiError.badRequest('courseId is required in body.');
            const result = await QuizService_1.quizService.EnsureModuleQuiz(orgId, sectionId, courseId);
            res.json(ApiResponse_1.ApiResponse.success('Module quiz ensured.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async EnsureFinalCourseQuiz(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { courseId } = req.params;
            const result = await QuizService_1.quizService.EnsureFinalCourseQuiz(orgId, courseId);
            res.json(ApiResponse_1.ApiResponse.success('Final course quiz ensured.', result));
        }
        catch (err) {
            next(err);
        }
    }
}
exports.QuizController = QuizController;
exports.quizController = new QuizController();
