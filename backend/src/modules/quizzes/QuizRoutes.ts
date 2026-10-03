import { Router } from 'express';
import multer from 'multer';
import { quizController } from './QuizController';
import { AuthenticateRequest } from '../../middleware/AuthenticateRequest';
import { ResolveOrganizationContext } from '../../middleware/ResolveOrganizationContext';
import { AuthorizeRoles } from '../../middleware/AuthorizePermission';

const uploadDoc = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const router = Router();

router.use(AuthenticateRequest, ResolveOrganizationContext);

router.get('/GetQuizList/:courseId', (req, res, next) => quizController.GetQuizList(req, res, next));
router.get('/GetQuizDetails/:quizId', (req, res, next) => quizController.GetQuizDetails(req, res, next));

router.post(
  '/CreateQuiz',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'),
  (req, res, next) => quizController.CreateQuiz(req, res, next)
);

router.post('/UploadQuizAttachment/:quizId', AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), uploadDoc.any(), (req, res, next) => quizController.UploadQuizAttachment(req, res, next));
router.post('/DeleteQuizAttachment/:quizId', AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => quizController.DeleteQuizAttachment(req, res, next));
router.delete('/DeleteQuizAttachment/:quizId', AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => quizController.DeleteQuizAttachment(req, res, next));

router.post('/SubmitQuizAttempt', (req, res, next) => quizController.SubmitQuizAttempt(req, res, next));
router.get('/GetStudentQuizAttempts/:quizId', (req, res, next) => quizController.GetStudentQuizAttempts(req, res, next));

export const QuizRoutes = router;
