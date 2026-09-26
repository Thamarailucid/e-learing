"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
class ApiResponse {
    static success(message, data, pagination) {
        const response = {
            success: true,
            message,
        };
        if (data !== undefined) {
            response.data = data;
        }
        if (pagination !== undefined) {
            response.pagination = pagination;
        }
        return response;
    }
}
exports.ApiResponse = ApiResponse;
