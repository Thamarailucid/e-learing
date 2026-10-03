import { Router } from 'express';
import multer from 'multer';
import { videoController } from './VideoController';
import { AuthenticateRequest } from '../../middleware/AuthenticateRequest';
import { ResolveOrganizationContext } from '../../middleware/ResolveOrganizationContext';
import { AuthorizeRoles } from '../../middleware/AuthorizePermission';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

const router = Router();

router.use(AuthenticateRequest, ResolveOrganizationContext);

// Video streaming authorization
router.get('/GenerateVideoPlaybackUrl/:lessonId', (req, res, next) =>
  videoController.GenerateVideoPlaybackUrl(req, res, next)
);

// Transcoding Status & Retry
router.get('/GetTranscodingStatus/:lessonId', (req, res, next) =>
  videoController.GetTranscodingStatus(req, res, next)
);

router.post(
  '/RetryTranscoding/:lessonId',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'),
  (req, res, next) => videoController.RetryTranscoding(req, res, next)
);


// Video Upload (Staff only)
router.post(
  '/UploadCourseVideo/:lessonId',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'),
  upload.any(),
  (req, res, next) => videoController.UploadCourseVideo(req, res, next)
);

// Interactive Video Questions
router.get('/GetVideoInteractiveQuestionList/:lessonId', (req, res, next) =>
  videoController.GetVideoInteractiveQuestionList(req, res, next)
);

router.post(
  '/CreateVideoInteractiveQuestion',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'),
  (req, res, next) => videoController.CreateVideoInteractiveQuestion(req, res, next)
);

router.post('/SubmitVideoInteractiveQuestionAnswer', (req, res, next) =>
  videoController.SubmitVideoInteractiveQuestionAnswer(req, res, next)
);

export const VideoRoutes = router;
