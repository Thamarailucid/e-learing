import { dbPool, executeQuery } from '../src/database/connection';
import { EnvironmentConfig } from '../src/config/environment';
import { ResolveOrganizationContext } from '../src/middleware/ResolveOrganizationContext';
import { PasswordUtils } from '../src/utils/PasswordUtils';

async function testResolveContext() {
  const schema = EnvironmentConfig.database.schema;
  const orgRes = await executeQuery(`SELECT id FROM ${schema}.organizations WHERE slug = 'apex-academy'`);
  const orgId = orgRes.rows[0].id;

  const testEmail = 'test_context_user@apexacademy.com';
  const hash = await PasswordUtils.hashPassword('Pass123!');
  await executeQuery(
    `INSERT INTO ${schema}.users (email, password_hash, first_name, last_name, is_active, email_verified)
     VALUES ($1, $2, 'Context', 'User', TRUE, TRUE)
     ON CONFLICT (email) DO UPDATE SET password_hash = $2, is_active = TRUE`,
    [testEmail, hash]
  );
  const userRes = await executeQuery(`SELECT id FROM ${schema}.users WHERE email = $1`, [testEmail]);
  const userId = userRes.rows[0].id;

  // Set membership to SUSPENDED
  await executeQuery(
    `INSERT INTO ${schema}.organization_members (organization_id, user_id, role_id, status)
     VALUES ($1, $2, 'STUDENT', 'SUSPENDED')
     ON CONFLICT (organization_id, user_id) DO UPDATE SET status = 'SUSPENDED'`,
    [orgId, userId]
  );

  // Simulate request where activeOrganizationId is undefined and no x-organization-id header is sent
  const mockReq: any = {
    user: {
      userId,
      email: testEmail,
      isSuperAdmin: false,
      activeOrganizationId: undefined,
    },
    headers: {},
    params: {},
    query: {},
  };
  const mockRes: any = {};

  let caughtError: any = null;
  await ResolveOrganizationContext(mockReq, mockRes, (err?: any) => {
    if (err) caughtError = err;
  });

  console.log('Result for suspended user in ResolveOrganizationContext:');
  console.log(`Status: ${caughtError?.statusCode}, Code: ${caughtError?.errorCode}, Message: ${caughtError?.message}`);

  if (caughtError?.statusCode !== 403 || caughtError?.errorCode !== 'MEMBERSHIP_INACTIVE') {
    throw new Error(`Expected 403 MEMBERSHIP_INACTIVE, got ${caughtError?.statusCode} ${caughtError?.errorCode}`);
  }
  console.log('✓ Successfully caught 403 MEMBERSHIP_INACTIVE instead of 400 MISSING_ORGANIZATION_CONTEXT!');

  // Cleanup
  await executeQuery(`DELETE FROM ${schema}.organization_members WHERE user_id = $1`, [userId]);
  await executeQuery(`DELETE FROM ${schema}.users WHERE id = $1`, [userId]);
}

testResolveContext()
  .then(() => dbPool.end())
  .catch((e) => {
    console.error('Failed:', e);
    dbPool.end().then(() => process.exit(1));
  });
