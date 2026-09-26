import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { staffInviteService } from './StaffInviteService';
import { ApiResponse } from '../../utils/ApiResponse';
import { ResolveRequestClientIp } from '../../utils/ClientIpResolver';

const CreateStaffInviteSchema = z.object({
  title: z.string().min(2, 'Title is required (minimum 2 characters).'),
  roleId: z.enum(['ORGANIZATION_ADMIN', 'MANAGER', 'INSTRUCTOR', 'CONTENT_MANAGER', 'REVIEWER', 'SUPPORT_STAFF']),
  permissions: z.record(z.boolean()).optional(),
  maxRegistrations: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  customInviteCode: z.string().optional(),
});

const RegisterStaffViaInviteSchema = z.object({
  inviteCode: z.string().min(3, 'Invitation code is required.'),
  email: z.string().email('Valid email address is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').optional(),
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  phone: z.string().optional(),
});

export class StaffInviteController {
  async CreateStaffInviteLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const actorId = req.user!.userId;
      const parsed = CreateStaffInviteSchema.parse(req.body);
      const result = await staffInviteService.CreateStaffInviteLink(orgId, actorId, parsed);
      res.status(201).json(ApiResponse.success('Staff invitation link created successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async GetStaffInviteList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const result = await staffInviteService.GetStaffInviteList(orgId);
      res.json(ApiResponse.success('Staff invitation links retrieved successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async ToggleStaffInviteStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { inviteId } = req.params;
      const { isActive } = req.body;
      const result = await staffInviteService.ToggleStaffInviteStatus(orgId, inviteId, Boolean(isActive));
      res.json(ApiResponse.success('Staff invitation status updated successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async GetStaffInviteRegistrations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { inviteId } = req.params;
      const result = await staffInviteService.GetStaffInviteRegistrations(orgId, inviteId);
      res.json(ApiResponse.success('Staff members enrolled via invite retrieved successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async GetStaffInviteDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const result = await staffInviteService.GetStaffInviteDetails(token);
      res.json(ApiResponse.success('Staff invitation details retrieved.', result));
    } catch (err) {
      next(err);
    }
  }

  async RegisterStaffViaInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = RegisterStaffViaInviteSchema.parse(req.body);
      const clientIp = await ResolveRequestClientIp(req);
      const result = await staffInviteService.RegisterStaffViaInvite(parsed.inviteCode, parsed, clientIp);
      res.status(201).json(ApiResponse.success('Staff account registered successfully. Welcome to the academy team!', result));
    } catch (err) {
      next(err);
    }
  }
}

export const staffInviteController = new StaffInviteController();
