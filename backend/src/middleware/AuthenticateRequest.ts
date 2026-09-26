import { Request, Response, NextFunction } from 'express';
import { TokenUtils } from '../utils/TokenUtils';
import { ApiError } from '../utils/ApiError';
import { executeQuery } from '../database/connection';
import { EnvironmentConfig } from '../config/environment';

export async function AuthenticateRequest(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Authentication token is missing. Please provide Authorization: Bearer <token>.'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = TokenUtils.verifyAccessToken(token);
    req.user = payload;

    // Real-time Account Status, Session Validity & Password Reset Enforcement
    if (!payload.isSuperAdmin) {
      const schema = EnvironmentConfig.database.schema;
      const userRes = await executeQuery(
        `SELECT current_session_id, is_active, must_reset_password FROM ${schema}.users WHERE id = $1`,
        [payload.userId]
      );

      if (userRes.rowCount === 0 || !userRes.rows[0].is_active) {
        return next(ApiError.forbidden('Your account is currently inactive or suspended.', 'ACCOUNT_INACTIVE'));
      }

      const dbUser = userRes.rows[0];

      // Single-Session Enforcement for Students (Concurrency & Exam Integrity)
      if (
        payload.role === 'STUDENT' &&
        payload.sessionId &&
        dbUser.current_session_id &&
        dbUser.current_session_id !== payload.sessionId
      ) {
        return next(
          ApiError.unauthorized(
            'Your session has ended because your student account was logged into from another device or browser tab.',
            'SESSION_TERMINATED'
          )
        );
      }

      // Mandatory Password Reset Enforcement:
      // Strictly for STUDENT and STAFF accounts whose password was reset or newly created.
      // Organization Owners and Organization Admins are NOT quarantined.
      const userRole = (payload.role || '').toUpperCase();
      const isStudentOrStaff = ['STUDENT', 'INSTRUCTOR', 'STAFF', 'CONTENT_MANAGER', 'MANAGER', 'REVIEWER'].includes(userRole);

      if (isStudentOrStaff && dbUser.must_reset_password) {
        const allowedResetPaths = [
          '/auth/PostResetFirstTimePassword',
          '/auth/GetAuthenticatedUserProfile',
          '/auth/PostLogoutUser',
          '/auth/PostRefreshAccessToken',
        ];
        const isAllowedPath = allowedResetPaths.some((p) => req.originalUrl?.includes(p) || req.path?.includes(p));
        if (!isAllowedPath) {
          return next(
            ApiError.unauthorized(
              'Password reset required. You must set a new permanent password before accessing this resource.',
              'PASSWORD_RESET_REQUIRED'
            )
          );
        }
      }
    }

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Access token has expired. Please refresh your session.', 'TOKEN_EXPIRED'));
    }
    return next(ApiError.unauthorized('Invalid or corrupted authentication token.', 'INVALID_TOKEN'));
  }
}
