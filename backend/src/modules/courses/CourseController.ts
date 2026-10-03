import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { courseService } from './CourseService';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { ResolveRequestClientIp } from '../../utils/ClientIpResolver';

const CreateCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  level: z.string().optional(),
  category: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  isPrivate: z.boolean().optional(),
  accessType: z.string().optional(),
  minVideoWatchPercentage: z.number().min(0).max(100).optional(),
  passQuizPercentage: z.number().min(0).max(100).optional(),
});

const CreateSectionSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1, 'Section title is required.'),
  orderIndex: z.number().optional(),
});

const CreateLessonSchema = z.object({
  courseId: z.string().uuid(),
  sectionId: z.string().uuid(),
  title: z.string().min(1, 'Lesson title is required.'),
  contentType: z.enum(['VIDEO', 'DOCUMENT', 'ARTICLE']).optional(),
  videoUrl: z.string().optional(),
  videoDurationSeconds: z.number().optional(),
  articleContent: z.string().optional(),
  documentUrl: z.string().optional(),
  orderIndex: z.number().optional(),
  isFreePreview: z.boolean().optional(),
});

export class CourseController {
  async GetCourseList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const page = parseInt(req.query.page as string || '1', 10);
      const pageSize = parseInt(req.query.pageSize as string || '20', 10);
      const search = req.query.search as string | undefined;
      const isStudent = req.user?.role === 'STUDENT';
      const isPublicOnly = req.query.isPublicOnly === 'true';
      const studentUserId = isStudent ? req.user?.userId : undefined;
      const category = req.query.category as string | undefined;
      const level = req.query.level as string | undefined;
      const status = req.query.status as string | undefined;
      const accessType = req.query.accessType as string | undefined;

      const result = await courseService.GetCourseList(
        orgId,
        page,
        pageSize,
        search,
        isPublicOnly,
        category,
        level,
        status,
        accessType,
        studentUserId
      );
      res.json(ApiResponse.success('Course list retrieved successfully.', result.data, result.pagination));
    } catch (err) {
      next(err);
    }
  }

  async GetStudentEnrolledCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const userId = req.user!.userId;
      const result = await courseService.GetStudentEnrolledCourses(orgId, userId);
      res.json(ApiResponse.success('Student enrolled courses retrieved successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async GetCourseDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { courseId } = req.params;
      const callerRole = req.user?.role || '';
      const result = await courseService.GetCourseDetails(orgId, courseId, callerRole);
      res.json(ApiResponse.success('Course details retrieved successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async CreateCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = CreateCourseSchema.parse(req.body);
      const result = await courseService.CreateCourse(orgId, req.user!.userId, parsed);
      res.status(201).json(ApiResponse.success('Course created successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async UpdateCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { courseId } = req.params;
      const result = await courseService.UpdateCourse(orgId, courseId, req.body);
      res.json(ApiResponse.success('Course updated successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async PublishCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { courseId } = req.params;
      const result = await courseService.PublishCourse(orgId, courseId);
      res.json(ApiResponse.success('Course published successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async UnpublishCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { courseId } = req.params;
      const result = await courseService.UnpublishCourse(orgId, courseId);
      res.json(ApiResponse.success('Course unpublished successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async CreateCourseSection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = CreateSectionSchema.parse(req.body);
      const result = await courseService.CreateCourseSection(orgId, parsed.courseId, parsed.title, parsed.orderIndex);
      res.status(201).json(ApiResponse.success('Course section created successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async CreateLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = CreateLessonSchema.parse(req.body);
      const result = await courseService.CreateLesson(orgId, parsed.courseId, parsed.sectionId, parsed);
      res.status(201).json(ApiResponse.success('Lesson created successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async UploadCourseThumbnail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { courseId } = req.params;
      if (!req.file) {
        throw ApiError.badRequest('No thumbnail file provided.');
      }
      const result = await courseService.UploadCourseThumbnail(orgId, courseId, req.file);
      res.json(ApiResponse.success('Course thumbnail uploaded successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async LogCourseViolation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId || req.user?.activeOrganizationId;
      const userId = req.user?.userId;
      const clientIp = await ResolveRequestClientIp(req);
      const userAgent = (req.headers['user-agent'] as string) || 'Unknown';
      const { courseId, lessonId, violationType, details } = req.body;

      const result = await courseService.LogCourseViolation({
        organizationId: orgId || null,
        userId: userId || null,
        courseId: courseId || null,
        lessonId: lessonId || null,
        violationType: violationType || 'SECURITY_VIOLATION',
        clientIp,
        userAgent,
        details: details || {},
      });

      res.status(201).json(ApiResponse.success('Security violation logged successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async DeleteCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.organizationId!;
      const { courseId } = req.params;
      const actorUserId = req.user!.userId;
      const clientIp = req.headers['x-client-ip'] as string || req.ip || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Unknown';
      
      const result = await courseService.DeleteCourse(organizationId, courseId, actorUserId, clientIp, userAgent);
      res.status(200).json(ApiResponse.success(result.message, null));
    } catch (err) {
      next(err);
    }
  }

  async DeleteCourseSection(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { sectionId } = req.params;
      const result = await courseService.DeleteCourseSection(orgId, sectionId);
      res.json(ApiResponse.success(result.message, result));
    } catch (err) {
      next(err);
    }
  }

  async DeleteLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { lessonId } = req.params;
      const result = await courseService.DeleteLesson(orgId, lessonId);
      res.json(ApiResponse.success(result.message, result));
    } catch (err) {
      next(err);
    }
  }

  async UploadLessonAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { lessonId } = req.params;
      const file = req.file || (req.files && Array.isArray(req.files) ? req.files[0] : (req.files as any)?.file?.[0] || (req.files as any)?.attachment?.[0]);
      if (!file) throw ApiError.badRequest('No file provided.');
      const result = await courseService.UploadLessonAttachment(orgId, lessonId, file);
      res.json(ApiResponse.success('Attachment uploaded successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async DeleteLessonAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { lessonId } = req.params;
      const attachmentUrl = req.body?.attachmentUrl || req.body?.url || (req.query?.url as string);
      if (!attachmentUrl) throw ApiError.badRequest('Attachment URL is required.');
      const result = await courseService.DeleteLessonAttachment(orgId, lessonId, attachmentUrl);
      res.json(ApiResponse.success('Attachment deleted successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async ScaffoldCourseraFlow(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { courseId } = req.params;
      const result = await courseService.ScaffoldCourseraFlow(orgId, courseId);
      res.json(ApiResponse.success('Coursera flow scaffolded successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async SubmitCourseFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const userId = req.user!.userId;
      const { courseId, rating, feedbackText } = req.body;
      if (!courseId || rating === undefined) throw ApiError.badRequest('courseId and rating are required.');
      const result = await courseService.SubmitCourseFeedback(orgId, userId, courseId, rating, feedbackText);
      res.json(ApiResponse.success('Feedback submitted successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async GetCourseFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const { courseId } = req.params;
      const result = await courseService.GetCourseFeedback(orgId, courseId);
      res.json(ApiResponse.success('Feedback retrieved successfully.', result));
    } catch (err) {
      next(err);
    }
  }
}

export const courseController = new CourseController();
