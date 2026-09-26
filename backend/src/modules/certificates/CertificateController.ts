import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { certificateService } from './CertificateService';
import { ApiResponse } from '../../utils/ApiResponse';

const GenerateCertSchema = z.object({
  courseId: z.string().uuid(),
});

export class CertificateController {
  async GenerateCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId!;
      const parsed = GenerateCertSchema.parse(req.body);
      const result = await certificateService.GenerateCertificate(orgId, req.user!.userId, parsed.courseId);
      res.status(201).json(ApiResponse.success('Certificate generated successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async VerifyCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { certificateNumber } = req.params;
      const result = await certificateService.VerifyCertificate(certificateNumber);
      res.json(ApiResponse.success('Certificate verification completed.', result));
    } catch (err) {
      next(err);
    }
  }

  async GetStudentCertificateList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId;
      const result = await certificateService.GetStudentCertificateList(req.user!.userId, orgId);
      res.json(ApiResponse.success('Certificates retrieved successfully.', result));
    } catch (err) {
      next(err);
    }
  }

  async GetStudentCertificateOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.organizationId || (req.headers['x-organization-id'] as string) || undefined;
      const result = await certificateService.GetStudentCertificateOverview(req.user!.userId, orgId);
      res.json(ApiResponse.success('Certificate overview retrieved successfully.', result));
    } catch (err) {
      next(err);
    }
  }
}

export const certificateController = new CertificateController();
