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
        // Single Primary Active Session Verification (Enforced for Students to ensure exam integrity and single-session progress)
        if (payload.sessionId && payload.role === 'STUDENT' && !payload.isSuperAdmin) {
            const schema = environment_1.EnvironmentConfig.database.schema;
            const userRes = await (0, connection_1.executeQuery)(`SELECT current_session_id, is_active FROM ${schema}.users WHERE id = $1`, [payload.userId]);
            if (userRes.rowCount === 0 || !userRes.rows[0].is_active) {
                return next(ApiError_1.ApiError.unauthorized('User account is inactive or not found.', 'ACCOUNT_INACTIVE'));
            }
            const currentSessionId = userRes.rows[0].current_session_id;
            if (currentSessionId && currentSessionId !== payload.sessionId) {
                return next(ApiError_1.ApiError.unauthorized('Your session was terminated because this account was logged into from another device or browser tab.', 'SESSION_TERMINATED'));
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
