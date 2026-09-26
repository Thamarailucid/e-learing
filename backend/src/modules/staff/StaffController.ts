import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { staffService } from './StaffService';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { ResolveRequestClientIp } from '../../utils/ClientIpResolver';

const CreateStaffSchema = z.object({
  email: z.string().min(3, 'Email address is required'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  roleId: z.enum(['ORGANIZATION_ADMIN', 'MANAGER', 'INSTRUCTOR', 'CONTENT_MANAGER', 'REVIEWER', 'SUPPORT_STAFF', 'ORGANIZATION_OWNER']),
  phone: z.string().optional(),
  password: z.string().min(6).optional(),
  avatarUrl: z.string().optional(),
  permissions: z.record(z.boolean()).optional(),
});

const UpdateStaffSchema = z.object({
  staffUserId: z.string().uuid().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
  roleId: z.enum(['ORGANIZATION_ADMIN', 'MANAGER', 'INSTRUCTOR', 'CONTENT_MANAGER', 'REVIEWER', 'SUPPORT_STAFF', 'ORGANIZATION_OWNER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  permissions: z.record(z.boolean()).optional(),
});

const ResetStaffPasswordSchema = z.object({
  staffUserId: z.string().uuid().optional(),
  newPassword: z.string().min(6).optional(),
});

export class StaffController {
  async GetStaffList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const page = parseInt(req.query.page as string || '1', 10);
      const pageSize = parseInt(req.query.pageSize as string || '20', 10);
      const search = req.query.search as string | undefined;
      const roleId = req.query.roleId as string | undefined;
      const status = req.query.status as string | undefined;

      const result = await staffService.GetStaffList(orgId, page, pageSize, search, roleId, status);
      res.json(ApiResponse.success('Staff list retrieved successfully.', result.data, result.pagination));
    } catch (err) {
      next(err);
    }
  }

  async CreateStaffMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = CreateStaffSchema.parse(req.body);
      const result = await staffService.CreateStaffMember(orgId, parsed, req.user);
      res.status(201).json(ApiResponse.success('Staff member created successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async UpdateStaffMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = UpdateStaffSchema.parse(req.body);
      const staffUserId = req.params.staffUserId || parsed.staffUserId;
      if (!staffUserId) {
        throw ApiError.badRequest('staffUserId parameter is required');
      }
      const result = await staffService.UpdateStaffMember(orgId, staffUserId, {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone: parsed.phone,
        roleId: parsed.roleId,
        status: parsed.status,
        permissions: parsed.permissions,
      }, req.user);
      res.json(ApiResponse.success('Staff member updated successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async ResetStaffPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = ResetStaffPasswordSchema.parse(req.body);
      const staffUserId = req.params.staffUserId || parsed.staffUserId;
      if (!staffUserId) {
        throw ApiError.badRequest('staffUserId parameter is required');
      }
      const actorId = req.user?.userId;
      const actorName = req.user?.email;
      const actorRole = req.user?.role;
      const isSuperAdmin = req.user?.isSuperAdmin;
      const clientIp = await ResolveRequestClientIp(req);
      const result = await staffService.ResetStaffPassword(
        orgId,
        staffUserId,
        parsed.newPassword,
        actorId,
        actorName,
        actorRole,
        isSuperAdmin,
        clientIp
      );
      res.json(ApiResponse.success(result.message, result));
    } catch (err) {
      next(err);
    }
  }

  async GetRolePermissionsList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const result = await staffService.GetRolePermissionsList(orgId);
      res.json(ApiResponse.success('Role permissions list retrieved successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async UpdateRolePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { roleId } = req.params;
      const permissions = req.body.permissions || {};
      const result = await staffService.UpdateRolePermissions(orgId, roleId, permissions);
      res.json(ApiResponse.success(`Default permissions for role ${roleId} updated successfully.`, result));
    } catch (err) {
      next(err);
    }
  }
}

export const staffController = new StaffController();

