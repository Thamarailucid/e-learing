import { Request, Response, NextFunction } from 'express';
import { publicService } from './PublicService';
import { ApiResponse } from '../../utils/ApiResponse';

export class PublicController {
  async GetPublicCatalog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const orgSlug = req.query.orgSlug as string | undefined;
      const courses = await publicService.GetPublicCatalog(search, orgSlug);
      res.json(ApiResponse.success('Public courses retrieved.', courses));
    } catch (err) {
      next(err);
    }
  }

  async GetAcademyPublicProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;
      const profile = await publicService.GetAcademyPublicProfile(slug);
      res.json(ApiResponse.success('Academy public profile retrieved.', profile));
    } catch (err) {
      next(err);
    }
  }

  async GetPublicCourseDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { courseIdOrSlug } = req.params;
      const details = await publicService.GetPublicCourseDetails(courseIdOrSlug);
      res.json(ApiResponse.success('Course details retrieved.', details));
    } catch (err) {
      next(err);
    }
  }

  async GetPublicOrganizationByCodeOrSlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { codeOrSlug } = req.params;
      const org = await publicService.GetPublicOrganizationByCodeOrSlug(codeOrSlug);
      res.json(ApiResponse.success('Public organization profile retrieved.', org));
    } catch (err) {
      next(err);
    }
  }
}

export const publicController = new PublicController();
