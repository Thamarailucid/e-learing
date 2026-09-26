import dotenv from 'dotenv';
import path from 'path';

const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export interface IEnvironmentConfig {
  application: {
    name: string;
    environment: 'development' | 'production' | 'test';
    backendUrl: string;
    frontendUrl: string;
    apiPrefix: string;
    port: number;
    logLevel: string;
    corsAllowedOrigins: string[];
  };
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    schema: string;
  };
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  superAdmin: {
    email: string;
    password: string;
  };
  storage: {
    provider: 'local' | 's3';
    local: {
      basePath: string;
      videosPath: string;
      documentsPath: string;
      assignmentsPath: string;
      certificatesPath: string;
    };
    s3: {
      bucketName: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      endpoint?: string;
    };
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
}

export const EnvironmentConfig: IEnvironmentConfig = {
  application: {
    name: process.env.APP_NAME || 'Novacodex',
    environment: (process.env.APP_ENVIRONMENT || nodeEnv) as 'development' | 'production' | 'test',
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
    provider: (process.env.FILE_STORAGE_PROVIDER || 'local') as 'local' | 's3',
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
};

export function ValidateEnvironmentConfiguration(): void {
  const isProd = EnvironmentConfig.application.environment === 'production';
  const missingKeys: string[] = [];

  if (!EnvironmentConfig.database.host) missingKeys.push('POSTGRES_HOST');
  if (!EnvironmentConfig.database.database) missingKeys.push('POSTGRES_DATABASE');
  if (!EnvironmentConfig.database.user) missingKeys.push('POSTGRES_USER');
  if (isProd && !EnvironmentConfig.database.password) missingKeys.push('POSTGRES_PASSWORD');
  if (!EnvironmentConfig.jwt.accessSecret) missingKeys.push('JWT_ACCESS_SECRET');
  if (!EnvironmentConfig.jwt.refreshSecret) missingKeys.push('JWT_REFRESH_SECRET');
  if (!EnvironmentConfig.superAdmin.email) missingKeys.push('SUPER_ADMIN_EMAIL');
  if (!EnvironmentConfig.superAdmin.password) missingKeys.push('SUPER_ADMIN_PASSWORD');

  if (isProd && EnvironmentConfig.storage.provider === 's3') {
    if (!EnvironmentConfig.storage.s3.bucketName) missingKeys.push('S3_BUCKET_NAME');
    if (!EnvironmentConfig.storage.s3.accessKeyId) missingKeys.push('S3_ACCESS_KEY_ID');
    if (!EnvironmentConfig.storage.s3.secretAccessKey) missingKeys.push('S3_SECRET_ACCESS_KEY');
  }

  if (missingKeys.length > 0) {
    throw new Error(`[Startup Error] Missing critical environment variables: ${missingKeys.join(', ')}`);
  }
}
