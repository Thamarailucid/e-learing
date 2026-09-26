"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicController = exports.PublicController = void 0;
const PublicService_1 = require("./PublicService");
const ApiResponse_1 = require("../../utils/ApiResponse");
class PublicController {
    async GetPublicCatalog(req, res, next) {
        try {
            const search = req.query.search;
            const orgSlug = req.query.orgSlug;
            const courses = await PublicService_1.publicService.GetPublicCatalog(search, orgSlug);
            res.json(ApiResponse_1.ApiResponse.success('Public courses retrieved.', courses));
        }
        catch (err) {
            next(err);
        }
    }
    async GetAcademyPublicProfile(req, res, next) {
        try {
            const { slug } = req.params;
            const profile = await PublicService_1.publicService.GetAcademyPublicProfile(slug);
            res.json(ApiResponse_1.ApiResponse.success('Academy public profile retrieved.', profile));
        }
        catch (err) {
            next(err);
        }
    }
    async GetPublicCourseDetails(req, res, next) {
        try {
            const { courseIdOrSlug } = req.params;
            const details = await PublicService_1.publicService.GetPublicCourseDetails(courseIdOrSlug);
            res.json(ApiResponse_1.ApiResponse.success('Course details retrieved.', details));
        }
        catch (err) {
            next(err);
        }
    }
    async GetPublicOrganizationByCodeOrSlug(req, res, next) {
        try {
            const { codeOrSlug } = req.params;
            const org = await PublicService_1.publicService.GetPublicOrganizationByCodeOrSlug(codeOrSlug);
            res.json(ApiResponse_1.ApiResponse.success('Public organization profile retrieved.', org));
        }
        catch (err) {
            next(err);
        }
    }
}
exports.PublicController = PublicController;
exports.publicController = new PublicController();
