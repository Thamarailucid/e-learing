import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { taxonomyService } from './TaxonomyService';
import { ApiResponse } from '../../utils/ApiResponse';

const CreateCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters.'),
  slug: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  displayOrder: z.number().optional(),
});

const UpdateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  displayOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

const CreateLevelSchema = z.object({
  name: z.string().min(2, 'Level name must be at least 2 characters.'),
  code: z.string().optional(),
  description: z.string().optional(),
  badgeColor: z.string().optional(),
  displayOrder: z.number().optional(),
});

const UpdateLevelSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  badgeColor: z.string().optional(),
  displayOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

export class TaxonomyController {
  // Categories
  async GetCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId;
      const categories = await taxonomyService.GetCategories(orgId);
      res.json(ApiResponse.success('Categories retrieved successfully.', categories));
    } catch (err) {
      next(err);
    }
  }

  async CreateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = CreateCategorySchema.parse(req.body);
      const orgId = req.organizationId;
      const category = await taxonomyService.CreateCategory(orgId, data);
      res.status(201).json(ApiResponse.success('Category created successfully.', category));
    } catch (err) {
      next(err);
    }
  }

  async UpdateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = UpdateCategorySchema.parse(req.body);
      const categoryId = req.params.id;
      const orgId = req.organizationId;
      const category = await taxonomyService.UpdateCategory(orgId, categoryId, data);
      res.json(ApiResponse.success('Category updated successfully.', category));
    } catch (err) {
      next(err);
    }
  }

  async DeleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = req.params.id;
      const orgId = req.organizationId;
      const result = await taxonomyService.DeleteCategory(orgId, categoryId);
      res.json(ApiResponse.success('Category deleted successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  // Difficulty Levels
  async GetDifficultyLevels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId;
      const levels = await taxonomyService.GetDifficultyLevels(orgId);
      res.json(ApiResponse.success('Difficulty levels retrieved successfully.', levels));
    } catch (err) {
      next(err);
    }
  }

  async CreateDifficultyLevel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = CreateLevelSchema.parse(req.body);
      const orgId = req.organizationId;
      const level = await taxonomyService.CreateDifficultyLevel(orgId, data);
      res.status(201).json(ApiResponse.success('Difficulty level created successfully.', level));
    } catch (err) {
      next(err);
    }
  }

  async UpdateDifficultyLevel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = UpdateLevelSchema.parse(req.body);
      const levelId = req.params.id;
      const orgId = req.organizationId;
      const level = await taxonomyService.UpdateDifficultyLevel(orgId, levelId, data);
      res.json(ApiResponse.success('Difficulty level updated successfully.', level));
    } catch (err) {
      next(err);
    }
  }

  async DeleteDifficultyLevel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const levelId = req.params.id;
      const orgId = req.organizationId;
      const result = await taxonomyService.DeleteDifficultyLevel(orgId, levelId);
      res.json(ApiResponse.success('Difficulty level deleted successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  // Public
  async GetPublicTaxonomies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgSlug = req.query.orgSlug as string | undefined;
      const taxonomies = await taxonomyService.GetPublicTaxonomies(orgSlug);
      res.json(ApiResponse.success('Public taxonomies retrieved successfully.', taxonomies));
    } catch (err) {
      next(err);
    }
  }
}

export const taxonomyController = new TaxonomyController();
