import { Router } from 'express';
import { authController } from './AuthController';
import { AuthenticateRequest } from '../../middleware/AuthenticateRequest';

const router = Router();

router.post('/PostLoginUser', (req, res, next) => authController.PostLoginUser(req, res, next));
router.post('/PostRegisterUser', (req, res, next) => authController.PostRegisterUser(req, res, next));
router.post('/PostRefreshAccessToken', (req, res, next) => authController.PostRefreshAccessToken(req, res, next));
router.post('/PostLogoutUser', (req, res, next) => authController.PostLogoutUser(req, res, next));

// Protected Auth Routes
router.get('/GetAuthenticatedUserProfile', AuthenticateRequest, (req, res, next) =>
  authController.GetAuthenticatedUserProfile(req, res, next)
);
router.get('/GetAuthenticatedUserOrganizations', AuthenticateRequest, (req, res, next) =>
  authController.GetAuthenticatedUserOrganizations(req, res, next)
);
router.post('/PostSwitchActiveOrganization', AuthenticateRequest, (req, res, next) =>
  authController.PostSwitchActiveOrganization(req, res, next)
);
router.post('/PostResetFirstTimePassword', AuthenticateRequest, (req, res, next) =>
  authController.PostResetFirstTimePassword(req, res, next)
);
router.put('/UpdateUserProfile', AuthenticateRequest, (req, res, next) =>
  authController.UpdateUserProfile(req, res, next)
);
router.delete('/DeleteProfileAvatar', AuthenticateRequest, (req, res, next) =>
  authController.DeleteProfileAvatar(req, res, next)
);

export const AuthRoutes = router;
