import { Router } from 'express';
import { progressController } from './ProgressController';
import { AuthenticateRequest } from '../../middleware/AuthenticateRequest';
import { ResolveOrganizationContext } from '../../middleware/ResolveOrganizationContext';

const router = Router();

router.use(AuthenticateRequest, ResolveOrganizationContext);

router.post('/SetActiveLesson', (req, res, next) =>
  progressController.SetActiveLesson(req, res, next)
);

router.post('/SaveStudentVideoWatchProgress', (req, res, next) =>
  progressController.SaveStudentVideoWatchProgress(req, res, next)
);

router.post('/MarkLessonAsCompleted/:lessonId', (req, res, next) =>
  progressController.MarkLessonAsCompleted(req, res, next)
);

router.get('/GetStudentCourseProgress/:courseId', (req, res, next) =>
  progressController.GetStudentCourseProgress(req, res, next)
);

router.get('/CheckCourseCompletionEligibility/:courseId', (req, res, next) =>
  progressController.CheckCourseCompletionEligibility(req, res, next)
);

export const ProgressRoutes = router;
