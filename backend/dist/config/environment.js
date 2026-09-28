"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentConfig = void 0;
exports.ValidateEnvironmentConfiguration = ValidateEnvironmentConfiguration;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// 1. Load standard .env if present
const standardEnv = path_1.default.resolve(process.cwd(), '.env');
if (fs_1.default.existsSync(standardEnv)) {
    dotenv_1.default.config({ path: standardEnv });
}
// 2. Load environment-specific file (.env.production or .env.development)
const nodeEnv = process.env.NODE_ENV || process.env.APP_ENVIRONMENT || 'development';
const envFile = path_1.default.resolve(process.cwd(), nodeEnv === 'production' ? '.env.production' : '.env.development');
if (fs_1.default.existsSync(envFile)) {
    dotenv_1.default.config({ path: envFile, override: true });
}
exports.EnvironmentConfig = {
    application: {
        name: process.env.APP_NAME || 'Novacodex',
        environment: (process.env.APP_ENVIRONMENT || nodeEnv),
        backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
        apiPrefix: process.env.API_PREFIX || '/api/v1',
        port: parseInt(process.env.PORT || '5000', 10),
        logLevel: process.env.LOG_LEVEL || 'info',
        corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173')
            .split(',')
            .map((origin) => origin.trim()),
    },
    database: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        database: process.env.POSTGRES_DATABASE || 'novacodex_development',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        schema: process.env.POSTGRES_SCHEMA || 'novacodex',
    },
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_fallback_secret',
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1d',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_fallback_secret',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    superAdmin: {
        email: process.env.SUPER_ADMIN_EMAIL || 'admin@novacodex.local',
        password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@Novacodex2026!',
    },
    storage: {
        provider: (process.env.FILE_STORAGE_PROVIDER || 'local'),
        local: {
            basePath: process.env.LOCAL_FILE_STORAGE_PATH || './storage',
            videosPath: process.env.LOCAL_VIDEO_STORAGE_PATH || './storage/videos',
            documentsPath: process.env.LOCAL_DOCUMENT_STORAGE_PATH || './storage/documents',
            assignmentsPath: process.env.LOCAL_ASSIGNMENT_STORAGE_PATH || './storage/assignments',
            certificatesPath: process.env.LOCAL_CERTIFICATE_STORAGE_PATH || './storage/certificates',
        },
        s3: {
            bucketName: process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME || 'gym-managment-doc',
            region: process.env.AWS_REGION || process.env.S3_REGION || 'ap-south-1',
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || '',
            endpoint: process.env.AWS_ENDPOINT || process.env.S3_ENDPOINT,
        },
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
    },
    transcoding: {
        tempDir: process.env.TRANSCODING_TEMP_DIR || '/tmp/novacodex-transcode',
        enabled: process.env.TRANSCODING_ENABLED !== 'false',
    },
};
function ValidateEnvironmentConfiguration() {
    const isProd = exports.EnvironmentConfig.application.environment === 'production';
    const missingKeys = [];
    if (!exports.EnvironmentConfig.database.host)
        missingKeys.push('POSTGRES_HOST');
    if (!exports.EnvironmentConfig.database.database)
        missingKeys.push('POSTGRES_DATABASE');
    if (!exports.EnvironmentConfig.database.user)
        missingKeys.push('POSTGRES_USER');
    if (isProd && !exports.EnvironmentConfig.database.password)
        missingKeys.push('POSTGRES_PASSWORD');
    if (!exports.EnvironmentConfig.jwt.accessSecret)
        missingKeys.push('JWT_ACCESS_SECRET');
    if (!exports.EnvironmentConfig.jwt.refreshSecret)
        missingKeys.push('JWT_REFRESH_SECRET');
    if (!exports.EnvironmentConfig.superAdmin.email)
        missingKeys.push('SUPER_ADMIN_EMAIL');
    if (!exports.EnvironmentConfig.superAdmin.password)
        missingKeys.push('SUPER_ADMIN_PASSWORD');
    if (isProd && exports.EnvironmentConfig.storage.provider === 's3') {
        if (!exports.EnvironmentConfig.storage.s3.bucketName)
            missingKeys.push('S3_BUCKET_NAME');
        if (!exports.EnvironmentConfig.storage.s3.accessKeyId)
            missingKeys.push('S3_ACCESS_KEY_ID');
        if (!exports.EnvironmentConfig.storage.s3.secretAccessKey)
            missingKeys.push('S3_SECRET_ACCESS_KEY');
    }
    if (missingKeys.length > 0) {
        throw new Error(`[Startup Error] Missing critical environment variables: ${missingKeys.join(', ')}`);
    }
}
