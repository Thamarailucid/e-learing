import { Pool, QueryResult, QueryResultRow } from 'pg';
import { EnvironmentConfig } from '../config/environment';

export const dbPool = new Pool({
  host: EnvironmentConfig.database.host,
  port: EnvironmentConfig.database.port,
  database: EnvironmentConfig.database.database,
  user: EnvironmentConfig.database.user,
  password: EnvironmentConfig.database.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

dbPool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]: Unexpected error on idle client', err);
});

export async function executeQuery<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await dbPool.query<T>(text, params);
  const duration = Date.now() - start;
  if (EnvironmentConfig.application.logLevel === 'debug') {
    console.debug(`[DB Query Executed] in ${duration}ms: ${text.slice(0, 100).trim()}...`);
  }
  return res;
}
