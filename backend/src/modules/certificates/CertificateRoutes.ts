import { Router } from 'express';
import { certificateController } from './CertificateController';
import { AuthenticateRequest } from '../../middleware/AuthenticateRequest';
import { ResolveOrganizationContext } from '../../middleware/ResolveOrganizationContext';

const router = Router();

// Public Verification Endpoint (No auth required)
router.get('/VerifyCertificate/:certificateNumber', (req, res, next) =>
  certificateController.VerifyCertificate(req, res, next)
);

// Protected Certificate Endpoints
router.post(
  '/GenerateCertificate',
  AuthenticateRequest,
  ResolveOrganizationContext,
  (req, res, next) => certificateController.GenerateCertificate(req, res, next)
);

router.get(
  '/GetStudentCertificateList',
  AuthenticateRequest,
  (req, res, next) => certificateController.GetStudentCertificateList(req, res, next)
);

router.get(
  '/GetStudentCertificateOverview',
  AuthenticateRequest,
  (req, res, next) => certificateController.GetStudentCertificateOverview(req, res, next)
);

export const CertificateRoutes = router;
