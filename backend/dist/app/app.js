"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const environment_1 = require("../config/environment");
const routes_1 = require("./routes");
const ErrorHandler_1 = require("../middleware/ErrorHandler");
function createApp() {
    const app = (0, express_1.default)();
    // 1. CORS Policy
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (environment_1.EnvironmentConfig.application.environment === 'development' ||
                environment_1.EnvironmentConfig.application.corsAllowedOrigins.includes(origin) ||
                environment_1.EnvironmentConfig.application.corsAllowedOrigins.includes('*')) {
                return callback(null, true);
            }
            return callback(new Error(`Origin ${origin} not permitted by CORS policy.`));
        },
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id'],
    }));
    // 2. Request Parsers
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // 3. Static local storage serving for development
    const storagePath = path_1.default.resolve(process.cwd(), environment_1.EnvironmentConfig.storage.local.basePath);
    app.use('/storage', express_1.default.static(storagePath));
    // 4. API Routes
    app.use(environment_1.EnvironmentConfig.application.apiPrefix, (0, routes_1.createApiRouter)());
    // 5. Global Centralized Error Handler
    app.use(ErrorHandler_1.ErrorHandler);
    return app;
}
