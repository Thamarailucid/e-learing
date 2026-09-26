import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { studentService } from './StudentService';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { ResolveRequestClientIp } from '../../utils/ClientIpResolver';

const CreateStudentSchema = z.object({
  email: z.string().min(3, 'Email address is required'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  password: z.string().min(6).optional(),
  avatarUrl: z.string().optional(),
});

const AssignCourseSchema = z.object({
  studentUserId: z.string().uuid(),
  courseId: z.string().uuid(),
});

const UpdateStudentSchema = z.object({
  studentUserId: z.string().uuid().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

const ResetStudentPasswordSchema = z.object({
  studentUserId: z.string().uuid().optional(),
  newPassword: z.string().min(6).optional(),
});

export class StudentController {
  async GetStudentList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const page = parseInt(req.query.page as string || '1', 10);
      const pageSize = parseInt(req.query.pageSize as string || '20', 10);
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      const enrollmentFilter = req.query.enrollmentFilter as string | undefined;

      const result = await studentService.GetStudentList(orgId, page, pageSize, search, status, enrollmentFilter);
      res.json(ApiResponse.success('Student list retrieved successfully.', result.data, result.pagination));
    } catch (err) {
      next(err);
    }
  }

  async CreateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = CreateStudentSchema.parse(req.body);
      const result = await studentService.CreateStudent(orgId, parsed);
      res.status(201).json(ApiResponse.success('Student created successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async UpdateStudentDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = UpdateStudentSchema.parse(req.body);
      const studentUserId = req.params.studentUserId || parsed.studentUserId;
      if (!studentUserId) {
        throw ApiError.badRequest('studentUserId parameter is required');
      }
      const result = await studentService.UpdateStudentDetails(orgId, studentUserId, {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone: parsed.phone,
        status: parsed.status,
      });
      res.json(ApiResponse.success('Student details updated successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async ResetStudentPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = ResetStudentPasswordSchema.parse(req.body);
      const studentUserId = req.params.studentUserId || parsed.studentUserId;
      if (!studentUserId) {
        throw ApiError.badRequest('studentUserId parameter is required');
      }
      const actorId = req.user?.userId;
      const actorName = req.user?.email;
      const clientIp = await ResolveRequestClientIp(req);
      const result = await studentService.ResetStudentPassword(
        orgId,
        studentUserId,
        parsed.newPassword,
        actorId,
        actorName,
        clientIp
      );
      res.json(ApiResponse.success(result.message, result));
    } catch (err) {
      next(err);
    }
  }

  async AssignStudentCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = AssignCourseSchema.parse(req.body);
      const result = await studentService.AssignStudentCourse(orgId, parsed.studentUserId, parsed.courseId);
      res.json(ApiResponse.success('Course assigned to student successfully.', result));
    } catch (err) {
      next(err);
    }
  }
}

export const studentController = new StudentController();

