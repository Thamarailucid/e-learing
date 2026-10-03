import { Router } from 'express';
import multer from 'multer';
import { courseController } from './CourseController';
import { AuthenticateRequest } from '../../middleware/AuthenticateRequest';
import { ResolveOrganizationContext } from '../../middleware/ResolveOrganizationContext';
import { AuthorizeRoles } from '../../middleware/AuthorizePermission';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();

router.use(AuthenticateRequest, ResolveOrganizationContext);

// Read courses
router.get('/GetCourseList', (req, res, next) => courseController.GetCourseList(req, res, next));
router.get('/GetStudentEnrolledCourses', (req, res, next) => courseController.GetStudentEnrolledCourses(req, res, next));
router.get('/GetCourseDetails/:courseId', (req, res, next) => courseController.GetCourseDetails(req, res, next));

// Course authoring (Staff / Instructor / Admin)
router.post(
  '/CreateCourse',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR', 'CONTENT_MANAGER'),
  (req, res, next) => courseController.CreateCourse(req, res, next)
);

router.put(
  '/UpdateCourse/:courseId',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR', 'CONTENT_MANAGER'),
  (req, res, next) => courseController.UpdateCourse(req, res, next)
);

router.post(
  '/PublishCourse/:courseId',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'),
  (req, res, next) => courseController.PublishCourse(req, res, next)
);

router.post(
  '/UnpublishCourse/:courseId',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'),
  (req, res, next) => courseController.UnpublishCourse(req, res, next)
);

router.delete(
  '/DeleteCourse/:courseId',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR', 'CONTENT_MANAGER'),
  (req, res, next) => courseController.DeleteCourse(req, res, next)
);

router.post(
  '/CreateCourseSection',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR', 'CONTENT_MANAGER'),
  (req, res, next) => courseController.CreateCourseSection(req, res, next)
);

router.post(
  '/CreateLesson',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR', 'CONTENT_MANAGER'),
  (req, res, next) => courseController.CreateLesson(req, res, next)
);

router.post(
  '/UploadCourseThumbnail/:courseId',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'),
  upload.single('thumbnail'),
  (req, res, next) => courseController.UploadCourseThumbnail(req, res, next)
);

// Security & Anti-Piracy Violation Logging
router.post('/LogCourseViolation', (req, res, next) => courseController.LogCourseViolation(req, res, next));

const uploadDoc = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

router.delete('/DeleteCourseSection/:sectionId', AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR', 'CONTENT_MANAGER'), (req, res, next) => courseController.DeleteCourseSection(req, res, next));
router.post('/UploadLessonAttachment/:lessonId', AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), uploadDoc.any(), (req, res, next) => courseController.UploadLessonAttachment(req, res, next));
router.post('/DeleteLessonAttachment/:lessonId', AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => courseController.DeleteLessonAttachment(req, res, next));
router.delete('/DeleteLessonAttachment/:lessonId', AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => courseController.DeleteLessonAttachment(req, res, next));
router.post('/ScaffoldCourseraFlow/:courseId', AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'INSTRUCTOR'), (req, res, next) => courseController.ScaffoldCourseraFlow(req, res, next));
router.post('/SubmitCourseFeedback', (req, res, next) => courseController.SubmitCourseFeedback(req, res, next));
router.get('/GetCourseFeedback/:courseId', (req, res, next) => courseController.GetCourseFeedback(req, res, next));

export const CourseRoutes = router;
