"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentController = exports.StudentController = void 0;
const zod_1 = require("zod");
const StudentService_1 = require("./StudentService");
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const ClientIpResolver_1 = require("../../utils/ClientIpResolver");
const CreateStudentSchema = zod_1.z.object({
    email: zod_1.z.string().min(3, 'Email address is required'),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    phone: zod_1.z.string().optional(),
    password: zod_1.z.string().min(6).optional(),
    avatarUrl: zod_1.z.string().optional(),
});
const AssignCourseSchema = zod_1.z.object({
    studentUserId: zod_1.z.string().uuid(),
    courseId: zod_1.z.string().uuid(),
});
const UpdateStudentSchema = zod_1.z.object({
    studentUserId: zod_1.z.string().uuid().optional(),
    firstName: zod_1.z.string().min(1).optional(),
    lastName: zod_1.z.string().min(1).optional(),
    phone: zod_1.z.string().optional(),
    avatarUrl: zod_1.z.string().nullable().optional(),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});
const ResetStudentPasswordSchema = zod_1.z.object({
    studentUserId: zod_1.z.string().uuid().optional(),
    newPassword: zod_1.z.string().min(6).optional(),
});
class StudentController {
    async GetStudentList(req, res, next) {
        try {
            const orgId = req.organizationId;
            const page = parseInt(req.query.page || '1', 10);
            const pageSize = parseInt(req.query.pageSize || '20', 10);
            const search = req.query.search;
            const status = req.query.status;
            const enrollmentFilter = req.query.enrollmentFilter;
            const result = await StudentService_1.studentService.GetStudentList(orgId, page, pageSize, search, status, enrollmentFilter);
            res.json(ApiResponse_1.ApiResponse.success('Student list retrieved successfully.', result.data, result.pagination));
        }
        catch (err) {
            next(err);
        }
    }
    async CreateStudent(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = CreateStudentSchema.parse(req.body);
            const result = await StudentService_1.studentService.CreateStudent(orgId, parsed);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Student created successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async UpdateStudentDetails(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = UpdateStudentSchema.parse(req.body);
            const studentUserId = req.params.studentUserId || parsed.studentUserId;
            if (!studentUserId) {
                throw ApiError_1.ApiError.badRequest('studentUserId parameter is required');
            }
            const result = await StudentService_1.studentService.UpdateStudentDetails(orgId, studentUserId, {
                firstName: parsed.firstName,
                lastName: parsed.lastName,
                phone: parsed.phone,
                status: parsed.status,
            });
            res.json(ApiResponse_1.ApiResponse.success('Student details updated successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async ResetStudentPassword(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = ResetStudentPasswordSchema.parse(req.body);
            const studentUserId = req.params.studentUserId || parsed.studentUserId;
            if (!studentUserId) {
                throw ApiError_1.ApiError.badRequest('studentUserId parameter is required');
            }
            const actorId = req.user?.userId;
            const actorName = req.user?.email;
            const clientIp = await (0, ClientIpResolver_1.ResolveRequestClientIp)(req);
            const result = await StudentService_1.studentService.ResetStudentPassword(orgId, studentUserId, parsed.newPassword, actorId, actorName, clientIp);
            res.json(ApiResponse_1.ApiResponse.success(result.message, result));
        }
        catch (err) {
            next(err);
        }
    }
    async AssignStudentCourse(req, res, next) {
        try {
            const orgId = req.organizationId;
            const parsed = AssignCourseSchema.parse(req.body);
            const result = await StudentService_1.studentService.AssignStudentCourse(orgId, parsed.studentUserId, parsed.courseId);
            res.json(ApiResponse_1.ApiResponse.success('Course assigned to student successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
}
exports.StudentController = StudentController;
exports.studentController = new StudentController();
