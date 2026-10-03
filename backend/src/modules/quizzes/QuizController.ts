import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { quizService } from './QuizService';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';

const CreateQuizSchema = z.object({
  courseId: z.string().uuid(),
  sectionId: z.string().uuid().optional(),
  title: z.string().min(2),
  description: z.string().optional(),
  passingScorePercentage: z.number().min(0).max(100).optional(),
  timeLimitMinutes: z.number().min(1).optional(),
  maxAttempts: z.number().min(1).optional(),
  questions: z
    .array(
      z.object({
        questionText: z.string().min(1),
        options: z.array(z.string()).min(2),
        correctAnswer: z.string().min(1),
        explanation: z.string().optional(),
        points: z.number().optional(),
      })
    )
    .optional(),
});

const SubmitQuizSchema = z.object({
  quizId: z.string().uuid(),
  answers: z.record(z.string()),
});

export class QuizController {
  async GetQuizList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { courseId } = req.params;
      const result = await quizService.GetQuizList(orgId, courseId);
      res.json(ApiResponse.success('Quiz list retrieved.', result));
    } catch (err) {
      next(err);
    }
  }

  async GetQuizDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { quizId } = req.params;
      // Hide correct answers for students
      const isStaff = req.user?.isSuperAdmin || (req.user?.role && req.user.role !== 'STUDENT');
      const result = await quizService.GetQuizDetails(orgId, quizId, !isStaff);
      res.json(ApiResponse.success('Quiz details retrieved.', result));
    } catch (err) {
      next(err);
    }
  }

  async CreateQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = CreateQuizSchema.parse(req.body);
      const result = await quizService.CreateQuiz(orgId, parsed);
      res.status(201).json(ApiResponse.success('Quiz created successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async SubmitQuizAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = SubmitQuizSchema.parse(req.body);
      const result = await quizService.SubmitQuizAttempt(orgId, req.user!.userId, parsed.quizId, parsed.answers);
      res.json(ApiResponse.success('Quiz submitted and scored successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async UploadQuizAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { quizId } = req.params;
      const file = req.file || (req.files && Array.isArray(req.files) ? req.files[0] : (req.files as any)?.file?.[0] || (req.files as any)?.attachment?.[0]);
      if (!file) throw ApiError.badRequest('No file provided.');
      const result = await quizService.UploadQuizAttachment(orgId, quizId, file);
      res.json(ApiResponse.success('Quiz attachment uploaded successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async DeleteQuizAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { quizId } = req.params;
      const attachmentUrl = req.body?.attachmentUrl || req.body?.url || (req.query?.url as string);
      if (!attachmentUrl) throw ApiError.badRequest('Attachment URL is required.');
      const result = await quizService.DeleteQuizAttachment(orgId, quizId, attachmentUrl);
      res.json(ApiResponse.success('Quiz attachment deleted successfully.', result));
    } catch (err) {
      next(err);
    }
  }
}

export const quizController = new QuizController();
