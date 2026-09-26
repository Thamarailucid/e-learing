import { Router } from 'express';
import { AuthRoutes } from '../modules/auth/AuthRoutes';
import { SuperAdminRoutes } from '../modules/superadmin/SuperAdminRoutes';
import { OrganizationRoutes } from '../modules/organizations/OrganizationRoutes';
import { StaffRoutes } from '../modules/staff/StaffRoutes';
import { StudentRoutes } from '../modules/students/StudentRoutes';
import { CourseRoutes } from '../modules/courses/CourseRoutes';
import { VideoRoutes } from '../modules/videos/VideoRoutes';
import { ProgressRoutes } from '../modules/progress/ProgressRoutes';
import { QuizRoutes } from '../modules/quizzes/QuizRoutes';
import { CertificateRoutes } from '../modules/certificates/CertificateRoutes';
import { PublicRoutes } from '../modules/public/PublicRoutes';
import { TaxonomyRoutes } from '../modules/taxonomies/TaxonomyRoutes';
import { CampaignRoutes } from '../modules/campaigns/CampaignRoutes';

export function createApiRouter(): Router {
  const router = Router();

  router.use('/public', PublicRoutes);
  router.use('/taxonomies', TaxonomyRoutes);
  router.use('/campaigns', CampaignRoutes);
  router.use('/auth', AuthRoutes);
  router.use('/superadmin', SuperAdminRoutes);
  router.use('/organizations', OrganizationRoutes);
  router.use('/staff', StaffRoutes);
  router.use('/students', StudentRoutes);
  router.use('/courses', CourseRoutes);
  router.use('/videos', VideoRoutes);
  router.use('/progress', ProgressRoutes);
  router.use('/quizzes', QuizRoutes);
  router.use('/certificates', CertificateRoutes);

  // Health check endpoint
  router.get('/health', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  return router;
}
