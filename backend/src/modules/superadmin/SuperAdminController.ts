import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { superAdminService } from './SuperAdminService';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { ResolveRequestClientIp } from '../../utils/ClientIpResolver';

const CreateOrgSchema = z.object({
  name: z.string().min(2, 'Organization name is required.'),
  slug: z.string().min(2, 'Valid slug is required.').regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and dashes.'),
  domain: z.string().optional(),
  planType: z.enum(['STARTER', 'BUSINESS', 'ENTERPRISE']).optional(),
  licenseType: z.string().optional(),
  licenseStartDate: z.string().optional(),
  licenseEndDate: z.string().optional(),
  licenseIsActive: z.boolean().optional(),
  showPlanTierToOrg: z.boolean().optional(),
  licenseWarningDays: z.number().optional(),
  ownerEmail: z.string().min(3, 'Owner email is required.'),
  ownerFirstName: z.string().min(1, 'Owner first name is required.'),
  ownerLastName: z.string().min(1, 'Owner last name is required.'),
  ownerPassword: z.string().min(8).optional(),
});

export class SuperAdminController {
  async GetSuperAdminDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await superAdminService.GetSuperAdminDashboard();
      res.json(ApiResponse.success('Super Admin dashboard metrics retrieved.', data));
    } catch (err) {
      next(err);
    }
  }

  async GetOrganizationList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const pageSize = parseInt(req.query.pageSize as string || '20', 10);
      const search = req.query.search as string | undefined;
      const result = await superAdminService.GetOrganizationList(page, pageSize, search);
      res.json(ApiResponse.success('Organization list retrieved.', result.data, result.pagination));
    } catch (err) {
      next(err);
    }
  }

  async CreateOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = CreateOrgSchema.parse(req.body);
      const clientIp = await ResolveRequestClientIp(req);
      const userAgent = (req.headers['user-agent'] as string) || undefined;
      const actorUserId = req.user?.userId;
      const result = await superAdminService.CreateOrganization(parsed, actorUserId, clientIp, userAgent);
      res.status(201).json(ApiResponse.success('Organization created successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async SuspendOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;
      const clientIp = await ResolveRequestClientIp(req);
      const userAgent = (req.headers['user-agent'] as string) || undefined;
      const actorUserId = req.user?.userId;
      const result = await superAdminService.SuspendOrganization(organizationId, actorUserId, clientIp, userAgent);
      res.json(ApiResponse.success('Organization suspended successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async ActivateOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;
      const clientIp = await ResolveRequestClientIp(req);
      const userAgent = (req.headers['user-agent'] as string) || undefined;
      const actorUserId = req.user?.userId;
      const result = await superAdminService.ActivateOrganization(organizationId, actorUserId, clientIp, userAgent);
      res.json(ApiResponse.success('Organization activated successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async UpdateOrganizationPlanTier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        planType,
        maxStudents,
        maxCourses,
        licenseType,
        licenseStartDate,
        licenseEndDate,
        licenseIsActive,
        showPlanTierToOrg,
        licenseWarningDays,
      } = req.body;
      const clientIp = await ResolveRequestClientIp(req);
      const result = await superAdminService.UpdateOrganizationPlanTier(organizationId, {
        planType,
        maxStudents,
        maxCourses,
        licenseType,
        licenseStartDate,
        licenseEndDate,
        licenseIsActive,
        showPlanTierToOrg,
        licenseWarningDays,
      }, clientIp);
      res.json(ApiResponse.success('Organization plan tier and license updated successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async GetPlatformAuditLogList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const pageSize = parseInt(req.query.pageSize as string || '30', 10);
      const search = req.query.search as string | undefined;
      const category = req.query.category as string | undefined;
      const action = req.query.action as string | undefined;
      const resource = req.query.resource as string | undefined;
      const organizationId = req.query.organizationId as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const result = await superAdminService.GetPlatformAuditLogList({
        page,
        pageSize,
        search,
        category,
        action,
        resource,
        organizationId,
        startDate,
        endDate,
      });
      res.json(ApiResponse.success('Platform audit logs retrieved.', result.data, result.pagination));
    } catch (err) {
      next(err);
    }
  }

  async GetAuditLogFilterOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await superAdminService.GetPlatformAuditLogFilterOptions();
      res.json(ApiResponse.success('Audit log filter options retrieved.', result));
    } catch (err) {
      next(err);
    }
  }

  async UploadOrganizationLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.params.organizationId;
      if (!req.file) throw ApiError.badRequest('No image file uploaded.');
      const result = await superAdminService.UploadOrganizationLogo(orgId, req.user!.userId, req.file);
      res.json(ApiResponse.success('Logo uploaded successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async ResetOrganizationOwnerPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { newPassword, ownerEmail } = req.body;
      const clientIp = await ResolveRequestClientIp(req);
      const result = await superAdminService.ResetOrganizationOwnerPassword(organizationId, newPassword, ownerEmail, clientIp);
      res.json(ApiResponse.success('Organization owner password reset successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async UpdateOrganizationOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { email, firstName, lastName, phone, password } = req.body;
      const clientIp = await ResolveRequestClientIp(req);
      const userAgent = (req.headers['user-agent'] as string) || undefined;
      const actorUserId = req.user?.userId;
      const result = await superAdminService.UpdateOrganizationOwner(organizationId, {
        email,
        firstName,
        lastName,
        phone,
        password,
      }, actorUserId, clientIp, userAgent);
      res.json(ApiResponse.success('Organization owner account updated successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async UpdateOrganizationProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { name, slug, domain, logoUrl, faviconUrl } = req.body;
      const clientIp = await ResolveRequestClientIp(req);
      const userAgent = (req.headers['user-agent'] as string) || undefined;
      const actorUserId = req.user?.userId;
      const result = await superAdminService.UpdateOrganizationProfile(organizationId, {
        name,
        slug,
        domain,
        logoUrl,
        faviconUrl,
      }, actorUserId, clientIp, userAgent);
      res.json(ApiResponse.success('Organization profile updated successfully.', result));
    } catch (err) {
      next(err);
    }
  }
}

export const superAdminController = new SuperAdminController();
