import { Router } from 'express';
import { quizController } from './QuizController';
import { AuthenticateRequest } from '../../middleware/AuthenticateRequest';
import { ResolveOrganizationContext } from '../../middleware/ResolveOrganizationContext';
import { AuthorizeRoles } from '../../middleware/AuthorizePermission';

const router = Router();

router.use(AuthenticateRequest, ResolveOrganizationContext);

router.get('/GetQuizList/:courseId', (req, res, next) => quizController.GetQuizList(req, res, next));
router.get('/GetQuizDetails/:quizId', (req, res, next) => quizController.GetQuizDetails(req, res, next));

router.post(
  '/CreateQuiz',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'),
  (req, res, next) => quizController.CreateQuiz(req, res, next)
);

router.post('/SubmitQuizAttempt', (req, res, next) => quizController.SubmitQuizAttempt(req, res, next));

export const QuizRoutes = router;
