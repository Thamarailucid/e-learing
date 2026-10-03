import { Router } from 'express';
import fs from 'fs';
import path from 'path';
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

  // System version endpoint
  router.get('/system/version', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    let versionData: any = {
      success: true,
      version: '1.3.0',
      buildTime: Date.now(),
      buildId: 'novacodex-v1.3.0-stable',
      platform: 'NovaCodex Platform',
      minVersion: '1.0.0',
      releaseNotes: 'Coursera Scaffolding, Advanced Attachment Manager, Multi-stage Assessments, and HLS Streaming'
    };

    try {
      const publicPath = path.join(process.cwd(), 'public', 'version.json');
      const distPath = path.join(process.cwd(), 'dist', 'version.json');
      
      if (fs.existsSync(publicPath)) {
        versionData = { ...versionData, ...JSON.parse(fs.readFileSync(publicPath, 'utf8')) };
      } else if (fs.existsSync(distPath)) {
        versionData = { ...versionData, ...JSON.parse(fs.readFileSync(distPath, 'utf8')) };
      }
    } catch (err) {
      // ignore
    }

    res.json(versionData);
  });

  return router;
}
