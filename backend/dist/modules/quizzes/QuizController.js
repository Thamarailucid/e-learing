"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quizController = exports.QuizController = void 0;
const zod_1 = require("zod");
const QuizService_1 = require("./QuizService");
const ApiResponse_1 = require("../../utils/ApiResponse");
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
}
exports.QuizController = QuizController;
exports.quizController = new QuizController();
