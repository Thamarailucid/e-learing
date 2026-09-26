"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxonomyRoutes = void 0;
const express_1 = require("express");
const TaxonomyController_1 = require("./TaxonomyController");
const AuthenticateRequest_1 = require("../../middleware/AuthenticateRequest");
const ResolveOrganizationContext_1 = require("../../middleware/ResolveOrganizationContext");
const AuthorizePermission_1 = require("../../middleware/AuthorizePermission");
const router = (0, express_1.Router)();
// Public Combined Taxonomy Lookup (unauthenticated for landing pages & catalogs)
router.get('/GetPublicTaxonomies', (req, res, next) => TaxonomyController_1.taxonomyController.GetPublicTaxonomies(req, res, next));
// Protected routes (Tenant context)
router.use(AuthenticateRequest_1.AuthenticateRequest, ResolveOrganizationContext_1.ResolveOrganizationContext);
// Categories
router.get('/GetCategories', (req, res, next) => TaxonomyController_1.taxonomyController.GetCategories(req, res, next));
router.post('/CreateCategory', (0, AuthorizePermission_1.AuthorizeRoles)('SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => TaxonomyController_1.taxonomyController.CreateCategory(req, res, next));
router.put('/UpdateCategory/:id', (0, AuthorizePermission_1.AuthorizeRoles)('SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'), (req, res, next) => TaxonomyController_1.taxonomyController.UpdateCategory(req, res, next));
router.delete('/DeleteCategory/:id', (0, AuthorizePermission_1.AuthorizeRoles)('SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'), (req, res, next) => TaxonomyController_1.taxonomyController.DeleteCategory(req, res, next));
// Difficulty Levels
router.get('/GetDifficultyLevels', (req, res, next) => TaxonomyController_1.taxonomyController.GetDifficultyLevels(req, res, next));
router.post('/CreateDifficultyLevel', (0, AuthorizePermission_1.AuthorizeRoles)('SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => TaxonomyController_1.taxonomyController.CreateDifficultyLevel(req, res, next));
router.put('/UpdateDifficultyLevel/:id', (0, AuthorizePermission_1.AuthorizeRoles)('SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'), (req, res, next) => TaxonomyController_1.taxonomyController.UpdateDifficultyLevel(req, res, next));
router.delete('/DeleteDifficultyLevel/:id', (0, AuthorizePermission_1.AuthorizeRoles)('SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'), (req, res, next) => TaxonomyController_1.taxonomyController.DeleteDifficultyLevel(req, res, next));
exports.TaxonomyRoutes = router;
