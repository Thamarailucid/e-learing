"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = ErrorHandler;
const zod_1 = require("zod");
const ApiError_1 = require("../utils/ApiError");
const environment_1 = require("../config/environment");
function ErrorHandler(err, _req, res, _next) {
    if (environment_1.EnvironmentConfig.application.logLevel === 'debug') {
        console.error('[Error Occurred]:', err);
    }
    // 1. Zod Validation Errors
    if (err instanceof zod_1.ZodError) {
        const validationErrors = err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
        }));
        res.status(400).json({
            success: false,
            message: 'Request validation failed.',
            errorCode: 'VALIDATION_ERROR',
            validationErrors,
        });
        return;
    }
    // 2. Custom ApiError
    if (err instanceof ApiError_1.ApiError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errorCode: err.errorCode,
            validationErrors: err.validationErrors,
            data: err.data || null,
        });
        return;
    }
    // 3. Syntax / JSON Parsing Errors
    if (err instanceof SyntaxError && 'body' in err) {
        res.status(400).json({
            success: false,
            message: 'Malformed JSON payload received.',
            errorCode: 'INVALID_JSON',
            validationErrors: [],
        });
        return;
    }
    // 4. Fallback Internal Server Error
    res.status(500).json({
        success: false,
        message: err.message || 'An unexpected internal server error occurred.',
        errorCode: 'INTERNAL_SERVER_ERROR',
        validationErrors: [],
    });
}
