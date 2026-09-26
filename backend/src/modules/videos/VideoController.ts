import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { videoService } from './VideoService';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';

const CreateInteractiveQuestionSchema = z.object({
  lessonId: z.string().uuid(),
  timestampSeconds: z.number().min(0),
  questionText: z.string().min(3),
  questionType: z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER']).optional(),
  options: z.array(z.string()).min(2, 'At least 2 options are required for MCQ.'),
  correctAnswer: z.string().min(1),
  explanation: z.string().optional(),
  isRequired: z.boolean().optional(),
  displayMode: z.enum(['FIXED', 'RANDOM', 'QUESTION_POOL']).optional(),
});

const SubmitAnswerSchema = z.object({
  questionId: z.string().uuid(),
  submittedAnswer: z.string().min(1),
});

export class VideoController {
  async UploadCourseVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { lessonId } = req.params;
      if (!req.file) throw ApiError.badRequest('No video file provided for upload.');

      const result = await videoService.UploadCourseVideo(orgId, lessonId, req.file);
      res.status(201).json(ApiResponse.success('Course video uploaded successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async GenerateVideoPlaybackUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { lessonId } = req.params;
      const result = await videoService.GenerateVideoPlaybackUrl(orgId, req.user!.userId, lessonId);
      res.json(ApiResponse.success('Video playback authorized.', result));
    } catch (err) {
      next(err);
    }
  }

  async GetVideoInteractiveQuestionList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { lessonId } = req.params;
      const result = await videoService.GetVideoInteractiveQuestionList(orgId, lessonId);
      res.json(ApiResponse.success('Interactive questions retrieved.', result));
    } catch (err) {
      next(err);
    }
  }

  async CreateVideoInteractiveQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = CreateInteractiveQuestionSchema.parse(req.body);
      const result = await videoService.CreateVideoInteractiveQuestion(orgId, parsed);
      res.status(201).json(ApiResponse.success('Interactive question added to video timeline.', result));
    } catch (err) {
      next(err);
    }
  }

  async SubmitVideoInteractiveQuestionAnswer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = SubmitAnswerSchema.parse(req.body);
      const result = await videoService.SubmitVideoInteractiveQuestionAnswer(orgId, parsed.questionId, parsed.submittedAnswer);
      res.json(ApiResponse.success('Answer evaluated successfully.', result));
    } catch (err) {
      next(err);
    }
  }
}

export const videoController = new VideoController();
