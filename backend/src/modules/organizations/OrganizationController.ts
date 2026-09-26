import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { organizationService } from './OrganizationService';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';

const ThemeSchema = z.object({
  primaryColor: z.string().optional(),
  primary_color: z.string().optional(),
  secondaryColor: z.string().optional(),
  secondary_color: z.string().optional(),
  sidebarColor: z.string().optional(),
  sidebar_color: z.string().optional(),
  sidebarTextColor: z.string().optional(),
  sidebar_text_color: z.string().optional(),
  borderColor: z.string().optional(),
  border_color: z.string().optional(),
  buttonColor: z.string().optional(),
  button_color: z.string().optional(),
  buttonTextColor: z.string().optional(),
  button_text_color: z.string().optional(),
  fontFamily: z.string().optional(),
  font_family: z.string().optional(),
  borderRadiusMd: z.string().optional(),
  border_radius_md: z.string().optional(),
  certificateTitle: z.string().optional(),
  certificate_title: z.string().optional(),
  certificateSignatoryName: z.string().optional(),
  certificate_signatory_name: z.string().optional(),
  certificateSignatoryTitle: z.string().optional(),
  certificate_signatory_title: z.string().optional(),
  certificateSignatureUrl: z.string().nullable().optional(),
  certificate_signature_url: z.string().nullable().optional(),
  certificateBackgroundUrl: z.string().nullable().optional(),
  certificate_background_url: z.string().nullable().optional(),
  certificateAccentColor: z.string().optional(),
  certificate_accent_color: z.string().optional(),
});

export class OrganizationController {
  async GetOrganizationDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const data = await organizationService.GetOrganizationDetails(orgId);

      // Role-based response filtering — strip sensitive fields for non-admin roles
      const role = req.user?.role || '';
      const isSuperAdmin = req.user?.isSuperAdmin === true;
      const isAdminLevel = isSuperAdmin || ['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'].includes(role);

      if (isAdminLevel) {
        // Admins & owners get full payload
        res.json(ApiResponse.success('Organization details retrieved.', data));
      } else {
        // Students, instructors, staff — only get branding + minimal info
        const filtered: Record<string, any> = {
          id: data.id,
          name: data.name,
          slug: data.slug,
          domain: data.domain,
          logo_url: data.logo_url,
          favicon_url: data.favicon_url,
          status: data.status,
        };

        // If org allows showing plan tier to non-admin users, include limited license info
        if (data.show_plan_tier_to_org) {
          filtered.plan_type = data.plan_type;
          filtered.license_status = data.license_status;
          filtered.is_expiring_soon = data.is_expiring_soon;
          filtered.days_remaining = data.days_remaining;
        }

        res.json(ApiResponse.success('Organization details retrieved.', filtered));
      }
    } catch (err) {
      next(err);
    }
  }

  async UpdateOrganizationDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const data = await organizationService.UpdateOrganizationDetails(orgId, req.body);
      res.json(ApiResponse.success('Organization details updated.', data));
    } catch (err) {
      next(err);
    }
  }

  async GetOrganizationThemeSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const data = await organizationService.GetOrganizationThemeSettings(orgId);
      res.json(ApiResponse.success('Organization theme settings retrieved.', data));
    } catch (err) {
      next(err);
    }
  }

  async UpdateOrganizationThemeSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = ThemeSchema.parse(req.body);
      const data = await organizationService.UpdateOrganizationThemeSettings(orgId, parsed);
      res.json(ApiResponse.success('Organization theme updated successfully.', data));
    } catch (err) {
      next(err);
    }
  }

  async GetOrganizationDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const data = await organizationService.GetOrganizationDashboard(orgId);
      res.json(ApiResponse.success('Organization dashboard metrics retrieved.', data));
    } catch (err) {
      next(err);
    }
  }

  async UploadOrganizationBranding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const type = (req.body.type || req.query.type || 'logo') as
        | 'logo'
        | 'favicon'
        | 'certificate_background'
        | 'certificate_signature';
      if (!req.file) {
        throw ApiError.badRequest('No image file provided for upload.');
      }
      const data = await organizationService.UploadOrganizationBranding(orgId, type, req.file);
      res.json(ApiResponse.success(`Organization ${type} uploaded successfully.`, data));
    } catch (err) {
      next(err);
    }
  }
}

export const organizationController = new OrganizationController();
