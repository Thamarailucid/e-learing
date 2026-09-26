"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenUtils = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_1 = require("../config/environment");
class TokenUtils {
    static generateAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, environment_1.EnvironmentConfig.jwt.accessSecret, {
            expiresIn: environment_1.EnvironmentConfig.jwt.accessExpiresIn,
        });
    }
    static generateRefreshToken(payload) {
        return jsonwebtoken_1.default.sign(payload, environment_1.EnvironmentConfig.jwt.refreshSecret, {
            expiresIn: environment_1.EnvironmentConfig.jwt.refreshExpiresIn,
        });
    }
    static verifyAccessToken(token) {
        return jsonwebtoken_1.default.verify(token, environment_1.EnvironmentConfig.jwt.accessSecret);
    }
    static verifyRefreshToken(token) {
        return jsonwebtoken_1.default.verify(token, environment_1.EnvironmentConfig.jwt.refreshSecret);
    }
}
exports.TokenUtils = TokenUtils;
