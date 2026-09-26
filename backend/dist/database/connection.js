"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbPool = void 0;
exports.executeQuery = executeQuery;
const pg_1 = require("pg");
const environment_1 = require("../config/environment");
exports.dbPool = new pg_1.Pool({
    host: environment_1.EnvironmentConfig.database.host,
    port: environment_1.EnvironmentConfig.database.port,
    database: environment_1.EnvironmentConfig.database.database,
    user: environment_1.EnvironmentConfig.database.user,
    password: environment_1.EnvironmentConfig.database.password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
exports.dbPool.on('error', (err) => {
    console.error('[PostgreSQL Pool Error]: Unexpected error on idle client', err);
});
async function executeQuery(text, params) {
    const start = Date.now();
    const res = await exports.dbPool.query(text, params);
    const duration = Date.now() - start;
    if (environment_1.EnvironmentConfig.application.logLevel === 'debug') {
        console.debug(`[DB Query Executed] in ${duration}ms: ${text.slice(0, 100).trim()}...`);
    }
    return res;
}
