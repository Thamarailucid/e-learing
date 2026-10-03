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
                environment_1.EnvironmentConfig.application.corsAllowedOrigins.includes('*') ||
                /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) {
                return callback(null, true);
            }
            return callback(new Error(`Origin ${origin} not permitted by CORS policy.`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id', 'x-client-ip', 'Accept', 'X-Requested-With', 'Origin'],
        exposedHeaders: ['Content-Disposition'],
    }));
    // 2. Request Parsers
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // 3. Static local storage serving for development
    const storagePath = path_1.default.resolve(process.cwd(), environment_1.EnvironmentConfig.storage.local.basePath);
    app.use('/storage', express_1.default.static(storagePath));
    // 4. API Routes
    app.use(environment_1.EnvironmentConfig.application.apiPrefix, (0, routes_1.createApiRouter)());
    // Also expose system/version at root
    app.get('/system/version', (req, res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        let versionData = {
            success: true,
            version: '1.3.0',
            buildTime: Date.now(),
            buildId: 'novacodex-v1.3.0-stable',
            platform: 'NovaCodex Platform',
            minVersion: '1.0.0',
            releaseNotes: 'Coursera Scaffolding, Advanced Attachment Manager, Multi-stage Assessments, and HLS Streaming'
        };
        try {
            // Need fs imported at the top
            const fs = require('fs');
            const publicPath = path_1.default.join(process.cwd(), 'public', 'version.json');
            const distPath = path_1.default.join(process.cwd(), 'dist', 'version.json');
            if (fs.existsSync(publicPath)) {
                versionData = { ...versionData, ...JSON.parse(fs.readFileSync(publicPath, 'utf8')) };
            }
            else if (fs.existsSync(distPath)) {
                versionData = { ...versionData, ...JSON.parse(fs.readFileSync(distPath, 'utf8')) };
            }
        }
        catch (err) {
            // ignore
        }
        res.json(versionData);
    });
    // 5. Global Centralized Error Handler
    app.use(ErrorHandler_1.ErrorHandler);
    return app;
}
