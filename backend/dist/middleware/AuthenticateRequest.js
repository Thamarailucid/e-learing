"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticateRequest = AuthenticateRequest;
const TokenUtils_1 = require("../utils/TokenUtils");
const ApiError_1 = require("../utils/ApiError");
const connection_1 = require("../database/connection");
const environment_1 = require("../config/environment");
async function AuthenticateRequest(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(ApiError_1.ApiError.unauthorized('Authentication token is missing. Please provide Authorization: Bearer <token>.'));
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = TokenUtils_1.TokenUtils.verifyAccessToken(token);
        req.user = payload;
        // Real-time Account Status, Session Validity & Password Reset Enforcement
        if (!payload.isSuperAdmin) {
            const schema = environment_1.EnvironmentConfig.database.schema;
            const userRes = await (0, connection_1.executeQuery)(`SELECT current_session_id, is_active, must_reset_password FROM ${schema}.users WHERE id = $1`, [payload.userId]);
            if (userRes.rowCount === 0 || !userRes.rows[0].is_active) {
                return next(ApiError_1.ApiError.forbidden('Your account is currently inactive or suspended.', 'ACCOUNT_INACTIVE'));
            }
            const dbUser = userRes.rows[0];
            // Single-Session Enforcement for Students (Concurrency & Exam Integrity)
            if (payload.role === 'STUDENT' &&
                payload.sessionId &&
                dbUser.current_session_id &&
                dbUser.current_session_id !== payload.sessionId) {
                return next(ApiError_1.ApiError.unauthorized('Your session has ended because your student account was logged into from another device or browser tab.', 'SESSION_TERMINATED'));
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
                    return next(ApiError_1.ApiError.unauthorized('Password reset required. You must set a new permanent password before accessing this resource.', 'PASSWORD_RESET_REQUIRED'));
                }
            }
        }
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(ApiError_1.ApiError.unauthorized('Access token has expired. Please refresh your session.', 'TOKEN_EXPIRED'));
        }
        return next(ApiError_1.ApiError.unauthorized('Invalid or corrupted authentication token.', 'INVALID_TOKEN'));
    }
}
