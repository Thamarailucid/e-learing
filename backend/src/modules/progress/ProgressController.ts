import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { progressService } from './ProgressService';
import { ApiResponse } from '../../utils/ApiResponse';

const SaveWatchProgressSchema = z.object({
  lessonId: z.string().uuid(),
  lastPositionSeconds: z.number().min(0),
  watchPercentage: z.number().min(0).max(100),
});

const SetActiveLessonSchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid(),
});

export class ProgressController {
  async SetActiveLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = SetActiveLessonSchema.parse(req.body);
      const result = await progressService.SetActiveLesson(orgId, req.user!.userId, parsed.courseId, parsed.lessonId);
      res.json(ApiResponse.success('Active lesson updated.', result));
    } catch (err) {
      next(err);
    }
  }

  async SaveStudentVideoWatchProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = SaveWatchProgressSchema.parse(req.body);
      const result = await progressService.SaveStudentVideoWatchProgress(orgId, req.user!.userId, parsed);
      res.json(ApiResponse.success('Watch progress recorded successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async MarkLessonAsCompleted(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { lessonId } = req.params;
      const result = await progressService.MarkLessonAsCompleted(orgId, req.user!.userId, lessonId);
      res.json(ApiResponse.success('Lesson marked as completed.', result));
    } catch (err) {
      next(err);
    }
  }

  async GetStudentCourseProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { courseId } = req.params;
      const result = await progressService.GetStudentCourseProgress(orgId, req.user!.userId, courseId);
      res.json(ApiResponse.success('Course progress retrieved successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async CheckCourseCompletionEligibility(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { courseId } = req.params;
      const result = await progressService.CheckCourseCompletionEligibility(orgId, req.user!.userId, courseId);
      res.json(ApiResponse.success('Completion eligibility checked.', result));
    } catch (err) {
      next(err);
    }
  }
}

export const progressController = new ProgressController();
