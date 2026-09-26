import { Router } from 'express';
import { studentController } from './StudentController';
import { AuthenticateRequest } from '../../middleware/AuthenticateRequest';
import { ResolveOrganizationContext } from '../../middleware/ResolveOrganizationContext';
import { AuthorizeRoles, AuthorizePermission } from '../../middleware/AuthorizePermission';

const router = Router();

router.use(AuthenticateRequest, ResolveOrganizationContext);

router.get(
  '/GetStudentList',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER', 'INSTRUCTOR'),
  (req, res, next) => studentController.GetStudentList(req, res, next)
);

router.post(
  '/CreateStudent',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER'),
  (req, res, next) => studentController.CreateStudent(req, res, next)
);

router.put(
  '/UpdateStudentDetails',
  AuthorizePermission('can_edit_students'),
  (req, res, next) => studentController.UpdateStudentDetails(req, res, next)
);

router.put(
  '/UpdateStudentDetails/:studentUserId',
  AuthorizePermission('can_edit_students'),
  (req, res, next) => studentController.UpdateStudentDetails(req, res, next)
);

router.post(
  '/ResetStudentPassword',
  AuthorizePermission('can_reset_student_passwords'),
  (req, res, next) => studentController.ResetStudentPassword(req, res, next)
);

router.post(
  '/ResetStudentPassword/:studentUserId',
  AuthorizePermission('can_reset_student_passwords'),
  (req, res, next) => studentController.ResetStudentPassword(req, res, next)
);

router.post(
  '/AssignStudentCourse',
  AuthorizeRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'MANAGER', 'INSTRUCTOR'),
  (req, res, next) => studentController.AssignStudentCourse(req, res, next)
);

export const StudentRoutes = router;

