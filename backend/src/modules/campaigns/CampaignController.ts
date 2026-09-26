import { Request, Response, NextFunction } from 'express';
import { CampaignService } from './CampaignService';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { ResolveRequestClientIp } from '../../utils/ClientIpResolver';

export class CampaignController {
  private service = new CampaignService();

  async CreateCampaignLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const userId = req.user!.userId;
      const { courseId } = req.params;
      const { campaignName, targetInstitution, maxRedemptions, expiresAt, customInviteCode } = req.body;

      if (!courseId) throw ApiError.badRequest('courseId is required.');
      if (!campaignName) throw ApiError.badRequest('campaignName is required.');
      if (!targetInstitution) throw ApiError.badRequest('targetInstitution is required.');

      const result = await this.service.CreateCampaignLink(orgId, courseId, userId, {
        campaignName,
        targetInstitution,
        maxRedemptions,
        expiresAt,
        customInviteCode,
      });

      res.status(201).json(ApiResponse.success('Outreach campaign link created successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async GetCourseCampaignList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { courseId } = req.params;

      if (!courseId) throw ApiError.badRequest('courseId is required.');

      const list = await this.service.GetCourseCampaignList(orgId, courseId);
      res.json(ApiResponse.success('Course campaign list retrieved.', list));
    } catch (err) {
      next(err);
    }
  }

  async GetPublicCampaignDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { inviteCode } = req.params;
      if (!inviteCode) throw ApiError.badRequest('Invite code is required.');

      const details = await this.service.GetPublicCampaignDetails(inviteCode);
      res.json(ApiResponse.success('Campaign details retrieved.', details));
    } catch (err) {
      next(err);
    }
  }

  async RedeemCampaignLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { inviteCode } = req.body;
      const clientIp = await ResolveRequestClientIp(req);

      if (!inviteCode) throw ApiError.badRequest('inviteCode is required.');

      const result = await this.service.RedeemCampaignLink(userId, inviteCode, clientIp);
      res.json(ApiResponse.success(result.message, result));
    } catch (err) {
      next(err);
    }
  }

  async GetCampaignRedemptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { campaignId } = req.params;

      if (!campaignId) throw ApiError.badRequest('campaignId is required.');

      const students = await this.service.GetCampaignRedemptions(orgId, campaignId);
      res.json(ApiResponse.success('Enrolled campaign students list retrieved.', students));
    } catch (err) {
      next(err);
    }
  }

  async ToggleCampaignStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const { campaignId } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') throw ApiError.badRequest('isActive boolean is required.');

      const updated = await this.service.ToggleCampaignStatus(orgId, campaignId, isActive);
      res.json(ApiResponse.success(`Campaign link ${isActive ? 'activated' : 'deactivated'}.`, updated));
    } catch (err) {
      next(err);
    }
  }
}

export const campaignController = new CampaignController();
