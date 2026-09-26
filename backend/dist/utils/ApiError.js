"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
class ApiError extends Error {
    statusCode;
    errorCode;
    validationErrors;
    data;
    constructor(statusCode, message, errorCode = 'INTERNAL_ERROR', validationErrors = [], data) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.validationErrors = validationErrors;
        this.data = data;
        Object.setPrototypeOf(this, ApiError.prototype);
    }
    static badRequest(message, errorCode = 'BAD_REQUEST', errors = []) {
        return new ApiError(400, message, errorCode, errors);
    }
    static unauthorized(message = 'Unauthorized access.', errorCode = 'UNAUTHORIZED') {
        return new ApiError(401, message, errorCode);
    }
    static forbidden(message = 'You do not have permission to perform this action.', errorCode = 'FORBIDDEN') {
        return new ApiError(403, message, errorCode);
    }
    static notFound(message = 'Resource not found.', errorCode = 'NOT_FOUND') {
        return new ApiError(404, message, errorCode);
    }
    static conflict(message, errorCode = 'CONFLICT', data) {
        return new ApiError(409, message, errorCode, [], data);
    }
    static internal(message = 'Internal server error occurred.', errorCode = 'INTERNAL_SERVER_ERROR') {
        return new ApiError(500, message, errorCode);
    }
}
exports.ApiError = ApiError;
