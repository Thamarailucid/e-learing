import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from './AuthService';
import { ApiResponse } from '../../utils/ApiResponse';
import { ResolveRequestClientIp } from '../../utils/ClientIpResolver';

const LoginSchema = z.object({
  email: z.string().min(3, 'Please provide an email address or username.'),
  password: z.string().min(1, 'Password is required.'),
  organizationId: z.string().uuid().optional(),
  clearPreviousSession: z.boolean().optional(),
  clientIp: z.string().optional(),
});

const RegisterSchema = z.object({
  email: z.string().min(3, 'Please provide a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  phone: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  organizationSlug: z.string().optional(),
  organizationCode: z.string().optional(),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required.'),
});

const SwitchOrgSchema = z.object({
  organizationId: z.string().uuid('Valid organization ID is required.'),
});

const ResetFirstTimePasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters long.'),
});

export class AuthController {
  async PostLoginUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = LoginSchema.parse(req.body);
      const clientIp = await ResolveRequestClientIp(req, parsed.clientIp);
      const result = await authService.PostLoginUser(
        parsed.email,
        parsed.password,
        parsed.organizationId,
        parsed.clearPreviousSession,
        clientIp
      );
      res.json(ApiResponse.success('User authenticated successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async PostRegisterUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = RegisterSchema.parse(req.body);
      const result = await authService.PostRegisterUser(parsed);
      res.status(201).json(ApiResponse.success('Account registered successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async PostRefreshAccessToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = RefreshSchema.parse(req.body);
      const result = await authService.PostRefreshAccessToken(parsed.refreshToken);
      res.json(ApiResponse.success('Access token refreshed successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async GetAuthenticatedUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activeOrgId = req.organizationId || (req.query.organizationId as string | undefined);
      const result = await authService.GetAuthenticatedUserProfile(req.user!.userId, activeOrgId);
      res.json(ApiResponse.success('Profile retrieved successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async PostResetFirstTimePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = ResetFirstTimePasswordSchema.parse(req.body);
      const activeOrgId = req.organizationId || (req.body.organizationId as string | undefined);
      const clientIp = await ResolveRequestClientIp(req);
      const result = await authService.PostResetFirstTimePassword(
        req.user!.userId,
        parsed.newPassword,
        activeOrgId,
        clientIp
      );
      res.json(ApiResponse.success(result.message, result));
    } catch (err) {
      next(err);
    }
  }

  async GetAuthenticatedUserOrganizations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.GetAuthenticatedUserOrganizations(req.user!.userId);
      res.json(ApiResponse.success('User organizations retrieved successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async PostSwitchActiveOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = SwitchOrgSchema.parse(req.body);
      const result = await authService.PostSwitchActiveOrganization(req.user!.userId, parsed.organizationId);
      res.json(ApiResponse.success('Active organization switched successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async PostLogoutUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.PostLogoutUser(req.user?.userId);
      res.json(ApiResponse.success('User logged out successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async UpdateUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { firstName, lastName, phone, avatarUrl } = req.body;
      const activeOrgId = req.organizationId || (req.query.organizationId as string | undefined);
      const result = await authService.UpdateUserProfile(
        req.user!.userId,
        { firstName, lastName, phone, avatarUrl },
        activeOrgId
      );
      res.json(ApiResponse.success('Profile updated successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async DeleteProfileAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activeOrgId = req.organizationId || (req.query.organizationId as string | undefined);
      const result = await authService.DeleteProfileAvatar(req.user!.userId, activeOrgId);
      res.json(ApiResponse.success('Profile avatar removed successfully.', result));
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
