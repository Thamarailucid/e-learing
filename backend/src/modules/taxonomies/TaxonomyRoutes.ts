import { Router } from 'express';
import { taxonomyController } from './TaxonomyController';
import { AuthenticateRequest } from '../../middleware/AuthenticateRequest';
import { ResolveOrganizationContext } from '../../middleware/ResolveOrganizationContext';
import { AuthorizeRoles } from '../../middleware/AuthorizePermission';

const router = Router();

// Public Combined Taxonomy Lookup (unauthenticated for landing pages & catalogs)
router.get('/GetPublicTaxonomies', (req, res, next) =>
  taxonomyController.GetPublicTaxonomies(req, res, next)
);

// Protected routes (Tenant context)
router.use(AuthenticateRequest, ResolveOrganizationContext);

// Categories
router.get('/GetCategories', (req, res, next) =>
  taxonomyController.GetCategories(req, res, next)
);
router.post(
  '/CreateCategory',
  AuthorizeRoles('SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'),
  (req, res, next) => taxonomyController.CreateCategory(req, res, next)
);
router.put(
  '/UpdateCategory/:id',
  AuthorizeRoles('SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'),
  (req, res, next) => taxonomyController.UpdateCategory(req, res, next)
);
router.delete(
  '/DeleteCategory/:id',
  AuthorizeRoles('SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'),
  (req, res, next) => taxonomyController.DeleteCategory(req, res, next)
);

// Difficulty Levels
router.get('/GetDifficultyLevels', (req, res, next) =>
  taxonomyController.GetDifficultyLevels(req, res, next)
);
router.post(
  '/CreateDifficultyLevel',
  AuthorizeRoles('SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'),
  (req, res, next) => taxonomyController.CreateDifficultyLevel(req, res, next)
);
router.put(
  '/UpdateDifficultyLevel/:id',
  AuthorizeRoles('SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'),
  (req, res, next) => taxonomyController.UpdateDifficultyLevel(req, res, next)
);
router.delete(
  '/DeleteDifficultyLevel/:id',
  AuthorizeRoles('SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'),
  (req, res, next) => taxonomyController.DeleteDifficultyLevel(req, res, next)
);

export const TaxonomyRoutes = router;
