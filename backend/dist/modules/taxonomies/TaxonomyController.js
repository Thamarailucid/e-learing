"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taxonomyController = exports.TaxonomyController = void 0;
const zod_1 = require("zod");
const TaxonomyService_1 = require("./TaxonomyService");
const ApiResponse_1 = require("../../utils/ApiResponse");
const CreateCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Category name must be at least 2 characters.'),
    slug: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    icon: zod_1.z.string().optional(),
    displayOrder: zod_1.z.number().optional(),
});
const UpdateCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    description: zod_1.z.string().optional(),
    icon: zod_1.z.string().optional(),
    displayOrder: zod_1.z.number().optional(),
    isActive: zod_1.z.boolean().optional(),
});
const CreateLevelSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Level name must be at least 2 characters.'),
    code: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    badgeColor: zod_1.z.string().optional(),
    displayOrder: zod_1.z.number().optional(),
});
const UpdateLevelSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    description: zod_1.z.string().optional(),
    badgeColor: zod_1.z.string().optional(),
    displayOrder: zod_1.z.number().optional(),
    isActive: zod_1.z.boolean().optional(),
});
class TaxonomyController {
    // Categories
    async GetCategories(req, res, next) {
        try {
            const orgId = req.organizationId;
            const categories = await TaxonomyService_1.taxonomyService.GetCategories(orgId);
            res.json(ApiResponse_1.ApiResponse.success('Categories retrieved successfully.', categories));
        }
        catch (err) {
            next(err);
        }
    }
    async CreateCategory(req, res, next) {
        try {
            const data = CreateCategorySchema.parse(req.body);
            const orgId = req.organizationId;
            const category = await TaxonomyService_1.taxonomyService.CreateCategory(orgId, data);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Category created successfully.', category));
        }
        catch (err) {
            next(err);
        }
    }
    async UpdateCategory(req, res, next) {
        try {
            const data = UpdateCategorySchema.parse(req.body);
            const categoryId = req.params.id;
            const orgId = req.organizationId;
            const category = await TaxonomyService_1.taxonomyService.UpdateCategory(orgId, categoryId, data);
            res.json(ApiResponse_1.ApiResponse.success('Category updated successfully.', category));
        }
        catch (err) {
            next(err);
        }
    }
    async DeleteCategory(req, res, next) {
        try {
            const categoryId = req.params.id;
            const orgId = req.organizationId;
            const result = await TaxonomyService_1.taxonomyService.DeleteCategory(orgId, categoryId);
            res.json(ApiResponse_1.ApiResponse.success('Category deleted successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    // Difficulty Levels
    async GetDifficultyLevels(req, res, next) {
        try {
            const orgId = req.organizationId;
            const levels = await TaxonomyService_1.taxonomyService.GetDifficultyLevels(orgId);
            res.json(ApiResponse_1.ApiResponse.success('Difficulty levels retrieved successfully.', levels));
        }
        catch (err) {
            next(err);
        }
    }
    async CreateDifficultyLevel(req, res, next) {
        try {
            const data = CreateLevelSchema.parse(req.body);
            const orgId = req.organizationId;
            const level = await TaxonomyService_1.taxonomyService.CreateDifficultyLevel(orgId, data);
            res.status(201).json(ApiResponse_1.ApiResponse.success('Difficulty level created successfully.', level));
        }
        catch (err) {
            next(err);
        }
    }
    async UpdateDifficultyLevel(req, res, next) {
        try {
            const data = UpdateLevelSchema.parse(req.body);
            const levelId = req.params.id;
            const orgId = req.organizationId;
            const level = await TaxonomyService_1.taxonomyService.UpdateDifficultyLevel(orgId, levelId, data);
            res.json(ApiResponse_1.ApiResponse.success('Difficulty level updated successfully.', level));
        }
        catch (err) {
            next(err);
        }
    }
    async DeleteDifficultyLevel(req, res, next) {
        try {
            const levelId = req.params.id;
            const orgId = req.organizationId;
            const result = await TaxonomyService_1.taxonomyService.DeleteDifficultyLevel(orgId, levelId);
            res.json(ApiResponse_1.ApiResponse.success('Difficulty level deleted successfully.', result));
        }
        catch (err) {
            next(err);
        }
    }
    // Public
    async GetPublicTaxonomies(req, res, next) {
        try {
            const orgSlug = req.query.orgSlug;
            const taxonomies = await TaxonomyService_1.taxonomyService.GetPublicTaxonomies(orgSlug);
            res.json(ApiResponse_1.ApiResponse.success('Public taxonomies retrieved successfully.', taxonomies));
        }
        catch (err) {
            next(err);
        }
    }
}
exports.TaxonomyController = TaxonomyController;
exports.taxonomyController = new TaxonomyController();
