"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiRouter = createApiRouter;
const express_1 = require("express");
const AuthRoutes_1 = require("../modules/auth/AuthRoutes");
const SuperAdminRoutes_1 = require("../modules/superadmin/SuperAdminRoutes");
const OrganizationRoutes_1 = require("../modules/organizations/OrganizationRoutes");
const StaffRoutes_1 = require("../modules/staff/StaffRoutes");
const StudentRoutes_1 = require("../modules/students/StudentRoutes");
const CourseRoutes_1 = require("../modules/courses/CourseRoutes");
const VideoRoutes_1 = require("../modules/videos/VideoRoutes");
const ProgressRoutes_1 = require("../modules/progress/ProgressRoutes");
const QuizRoutes_1 = require("../modules/quizzes/QuizRoutes");
const CertificateRoutes_1 = require("../modules/certificates/CertificateRoutes");
const PublicRoutes_1 = require("../modules/public/PublicRoutes");
const TaxonomyRoutes_1 = require("../modules/taxonomies/TaxonomyRoutes");
const CampaignRoutes_1 = require("../modules/campaigns/CampaignRoutes");
function createApiRouter() {
    const router = (0, express_1.Router)();
    router.use('/public', PublicRoutes_1.PublicRoutes);
    router.use('/taxonomies', TaxonomyRoutes_1.TaxonomyRoutes);
    router.use('/campaigns', CampaignRoutes_1.CampaignRoutes);
    router.use('/auth', AuthRoutes_1.AuthRoutes);
    router.use('/superadmin', SuperAdminRoutes_1.SuperAdminRoutes);
    router.use('/organizations', OrganizationRoutes_1.OrganizationRoutes);
    router.use('/staff', StaffRoutes_1.StaffRoutes);
    router.use('/students', StudentRoutes_1.StudentRoutes);
    router.use('/courses', CourseRoutes_1.CourseRoutes);
    router.use('/videos', VideoRoutes_1.VideoRoutes);
    router.use('/progress', ProgressRoutes_1.ProgressRoutes);
    router.use('/quizzes', QuizRoutes_1.QuizRoutes);
    router.use('/certificates', CertificateRoutes_1.CertificateRoutes);
    // Health check endpoint
    router.get('/health', (_req, res) => {
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });
    return router;
}
