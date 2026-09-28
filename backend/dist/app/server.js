"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const environment_1 = require("../config/environment");
const initializeDatabase_1 = require("../database/initializeDatabase");
const connection_1 = require("../database/connection");
const TranscodingQueue_1 = require("../services/transcoding/TranscodingQueue");
async function startServer() {
    try {
        console.log(`[Novacodex Platform] Booting in ${environment_1.EnvironmentConfig.application.environment} mode...`);
        // 1. Validate Environment
        (0, environment_1.ValidateEnvironmentConfiguration)();
        console.log('[Novacodex Platform] Environment configuration validated.');
        // 2. Initialize Database Schema, Tables, Indexes, and Super Admin
        await (0, initializeDatabase_1.InitializeDatabase)();
        // Recover interrupted HLS transcoding jobs
        TranscodingQueue_1.transcodingQueue.recoverInterruptedJobs().catch(console.error);
        // 3. Create Express App
        const app = (0, app_1.createApp)();
        const port = environment_1.EnvironmentConfig.application.port;
        // 4. Start HTTP Server
        const server = app.listen(port, () => {
            console.log(`[Novacodex Platform] HTTP Server listening on port ${port}`);
            console.log(`[Novacodex Platform] API Base URL: ${environment_1.EnvironmentConfig.application.backendUrl}${environment_1.EnvironmentConfig.application.apiPrefix}`);
            console.log(`[Novacodex Platform] Super Admin ready: ${environment_1.EnvironmentConfig.superAdmin.email}`);
        });
        // 5. Graceful Shutdown
        const handleShutdown = async (signal) => {
            console.log(`\n[Novacodex Platform] Received ${signal}. Initiating graceful shutdown...`);
            server.close(async () => {
                console.log('[Novacodex Platform] HTTP server closed.');
                try {
                    await connection_1.dbPool.end();
                    console.log('[Novacodex Platform] PostgreSQL connection pool closed.');
                }
                catch (dbErr) {
                    console.error('[Novacodex Platform] Error closing PostgreSQL pool:', dbErr);
                }
                process.exit(0);
            });
        };
        process.on('SIGINT', () => handleShutdown('SIGINT'));
        process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    }
    catch (error) {
        console.error('[Novacodex Platform] Fatal startup error:', error.message || error);
        process.exit(1);
    }
}
startServer();
