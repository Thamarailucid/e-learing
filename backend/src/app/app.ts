import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import { EnvironmentConfig } from '../config/environment';
import { createApiRouter } from './routes';
import { ErrorHandler } from '../middleware/ErrorHandler';

export function createApp(): Application {
  const app = express();

  // 1. CORS Policy
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          EnvironmentConfig.application.environment === 'development' ||
          EnvironmentConfig.application.corsAllowedOrigins.includes(origin) ||
          EnvironmentConfig.application.corsAllowedOrigins.includes('*') ||
          /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)
        ) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not permitted by CORS policy.`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id', 'x-client-ip', 'Accept', 'X-Requested-With', 'Origin'],
      exposedHeaders: ['Content-Disposition'],
    })
  );

  // 2. Request Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 3. Static local storage serving for development
  const storagePath = path.resolve(process.cwd(), EnvironmentConfig.storage.local.basePath);
  app.use('/storage', express.static(storagePath));

  // 4. API Routes
  app.use(EnvironmentConfig.application.apiPrefix, createApiRouter());

  // Also expose system/version at root
  app.get('/system/version', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    let versionData: any = {
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
      const publicPath = path.join(process.cwd(), 'public', 'version.json');
      const distPath = path.join(process.cwd(), 'dist', 'version.json');
      
      if (fs.existsSync(publicPath)) {
        versionData = { ...versionData, ...JSON.parse(fs.readFileSync(publicPath, 'utf8')) };
      } else if (fs.existsSync(distPath)) {
        versionData = { ...versionData, ...JSON.parse(fs.readFileSync(distPath, 'utf8')) };
      }
    } catch (err) {
      // ignore
    }

    res.json(versionData);
  });

  // 5. Global Centralized Error Handler
  app.use(ErrorHandler);

  return app;
}
