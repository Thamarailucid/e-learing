"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignController = exports.CampaignController = void 0;
const CampaignService_1 = require("./CampaignService");
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
class CampaignController {
    service = new CampaignService_1.CampaignService();
    async CreateCampaignLink(req, res, next) {
        try {
            const orgId = req.organizationId;
            const userId = req.user.userId;
            const { courseId } = req.params;
            const { campaignName, targetInstitution, maxRedemptions, expiresAt, customInviteCode } = req.body;
            if (!courseId)
                throw ApiError_1.ApiError.badRequest('courseId is required.');
            if (!campaignName)
                throw ApiError_1.ApiError.badRequest('campaignName is required.');
            if (!targetInstitution)
                throw ApiError_1.ApiError.badRequest('targetInstitution is required.');
            const result = await this.service.CreateCampaignLink(orgId, courseId, userId, {
                campaignName,
                targetInstitution,
                maxRedemptions,
                expiresAt,
                customInviteCode,
            });
            res.status(201).json(ApiResponse_1.ApiResponse.success('Outreach campaign link created successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetCourseCampaignList(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { courseId } = req.params;
            if (!courseId)
                throw ApiError_1.ApiError.badRequest('courseId is required.');
            const list = await this.service.GetCourseCampaignList(orgId, courseId);
            res.json(ApiResponse_1.ApiResponse.success('Course campaign list retrieved.', list));
        }
        catch (err) {
            next(err);
        }
    }
    async GetPublicCampaignDetails(req, res, next) {
        try {
            const { inviteCode } = req.params;
            if (!inviteCode)
                throw ApiError_1.ApiError.badRequest('Invite code is required.');
            const details = await this.service.GetPublicCampaignDetails(inviteCode);
            res.json(ApiResponse_1.ApiResponse.success('Campaign details retrieved.', details));
        }
        catch (err) {
            next(err);
        }
    }
    async RedeemCampaignLink(req, res, next) {
        try {
            const userId = req.user.userId;
            const { inviteCode } = req.body;
            const forwarded = req.headers['x-forwarded-for'];
            const clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
            if (!inviteCode)
                throw ApiError_1.ApiError.badRequest('inviteCode is required.');
            const result = await this.service.RedeemCampaignLink(userId, inviteCode, clientIp);
            res.json(ApiResponse_1.ApiResponse.success(result.message, result));
        }
        catch (err) {
            next(err);
        }
    }
    async GetCampaignRedemptions(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { campaignId } = req.params;
            if (!campaignId)
                throw ApiError_1.ApiError.badRequest('campaignId is required.');
            const students = await this.service.GetCampaignRedemptions(orgId, campaignId);
            res.json(ApiResponse_1.ApiResponse.success('Enrolled campaign students list retrieved.', students));
        }
        catch (err) {
            next(err);
        }
    }
    async ToggleCampaignStatus(req, res, next) {
        try {
            const orgId = req.organizationId;
            const { campaignId } = req.params;
            const { isActive } = req.body;
            if (typeof isActive !== 'boolean')
                throw ApiError_1.ApiError.badRequest('isActive boolean is required.');
            const updated = await this.service.ToggleCampaignStatus(orgId, campaignId, isActive);
            res.json(ApiResponse_1.ApiResponse.success(`Campaign link ${isActive ? 'activated' : 'deactivated'}.`, updated));
        }
        catch (err) {
            next(err);
        }
    }
}
exports.CampaignController = CampaignController;
exports.campaignController = new CampaignController();
