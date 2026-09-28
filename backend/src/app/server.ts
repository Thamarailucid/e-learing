import { createApp } from './app';
import { EnvironmentConfig, ValidateEnvironmentConfiguration } from '../config/environment';
import { InitializeDatabase } from '../database/initializeDatabase';
import { dbPool } from '../database/connection';
import { transcodingQueue } from '../services/transcoding/TranscodingQueue';

async function startServer(): Promise<void> {
  try {
    console.log(`[Novacodex Platform] Booting in ${EnvironmentConfig.application.environment} mode...`);

    // 1. Validate Environment
    ValidateEnvironmentConfiguration();
    console.log('[Novacodex Platform] Environment configuration validated.');

    // 2. Initialize Database Schema, Tables, Indexes, and Super Admin
    await InitializeDatabase();
    
    // Recover interrupted HLS transcoding jobs
    transcodingQueue.recoverInterruptedJobs().catch(console.error);

    // 3. Create Express App
    const app = createApp();
    const port = EnvironmentConfig.application.port;

    // 4. Start HTTP Server
    const server = app.listen(port, () => {
      console.log(`[Novacodex Platform] HTTP Server listening on port ${port}`);
      console.log(`[Novacodex Platform] API Base URL: ${EnvironmentConfig.application.backendUrl}${EnvironmentConfig.application.apiPrefix}`);
      console.log(`[Novacodex Platform] Super Admin ready: ${EnvironmentConfig.superAdmin.email}`);
    });

    // 5. Graceful Shutdown
    const handleShutdown = async (signal: string) => {
      console.log(`\n[Novacodex Platform] Received ${signal}. Initiating graceful shutdown...`);
      server.close(async () => {
        console.log('[Novacodex Platform] HTTP server closed.');
        try {
          await dbPool.end();
          console.log('[Novacodex Platform] PostgreSQL connection pool closed.');
        } catch (dbErr) {
          console.error('[Novacodex Platform] Error closing PostgreSQL pool:', dbErr);
        }
        process.exit(0);
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  } catch (error: any) {
    console.error('[Novacodex Platform] Fatal startup error:', error.message || error);
    process.exit(1);
  }
}

startServer();
