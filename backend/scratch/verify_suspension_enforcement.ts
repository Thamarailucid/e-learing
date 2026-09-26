import { dbPool, executeQuery } from '../src/database/connection';
import { EnvironmentConfig } from '../src/config/environment';
import { AuthService } from '../src/modules/auth/AuthService';
import { PasswordUtils } from '../src/utils/PasswordUtils';

async function verifySuspension() {
  const schema = EnvironmentConfig.database.schema;
  const authService = new AuthService();

  console.log('--- 1. Set Up Test Users & Test Org for Suspension Verification ---');

  // Find or create test organization
  const orgRes = await executeQuery(
    `SELECT id, name, status FROM ${schema}.organizations WHERE slug = 'apex-academy'`
  );
  if (orgRes.rowCount === 0) {
    console.error('Apex academy org not found');
    return;
  }
  const orgId = orgRes.rows[0].id;
  const testPassword = 'TestPassword@2026!';
  const passwordHash = await PasswordUtils.hashPassword(testPassword);

  // 1. Create a Test Student
  const studentEmail = 'test_suspended_student@apexacademy.com';
  await executeQuery(
    `INSERT INTO ${schema}.users (email, password_hash, first_name, last_name, is_active, email_verified)
     VALUES ($1, $2, 'Suspended', 'Student', TRUE, TRUE)
     ON CONFLICT (email) DO UPDATE SET password_hash = $2, is_active = TRUE`,
    [studentEmail, passwordHash]
  );
  const studentRes = await executeQuery(`SELECT id FROM ${schema}.users WHERE email = $1`, [studentEmail]);
  const studentUserId = studentRes.rows[0].id;

  // Insert membership with status = 'SUSPENDED'
  await executeQuery(
    `INSERT INTO ${schema}.organization_members (organization_id, user_id, role_id, status)
     VALUES ($1, $2, 'STUDENT', 'SUSPENDED')
     ON CONFLICT (organization_id, user_id) DO UPDATE SET status = 'SUSPENDED'`,
    [orgId, studentUserId]
  );
  console.log('✓ Created/updated test student with status = SUSPENDED');

  // 2. Test Student Login when SUSPENDED
  console.log('\n--- 2. Verify Suspended Student Login is BLOCKED ---');
  let studentBlocked = false;
  try {
    await authService.PostLoginUser(studentEmail, testPassword);
  } catch (err: any) {
    console.log(`✓ PostLoginUser threw expected error: ${err.statusCode} ${err.errorCode} - ${err.message}`);
    if (err.statusCode === 403 && err.errorCode === 'MEMBERSHIP_INACTIVE') {
      studentBlocked = true;
    }
  }
  if (!studentBlocked) {
    throw new Error('FAILED: Suspended student was able to log in or wrong error code returned!');
  }

  // 3. Test Student Profile Fetch when SUSPENDED
  console.log('\n--- 3. Verify Suspended Student Profile Fetch is BLOCKED ---');
  let profileBlocked = false;
  try {
    await authService.GetAuthenticatedUserProfile(studentUserId, orgId);
  } catch (err: any) {
    console.log(`✓ GetAuthenticatedUserProfile threw expected error: ${err.statusCode} ${err.errorCode} - ${err.message}`);
    if (err.statusCode === 403 && err.errorCode === 'MEMBERSHIP_INACTIVE') {
      profileBlocked = true;
    }
  }
  if (!profileBlocked) {
    throw new Error('FAILED: Suspended student profile fetch was NOT blocked!');
  }

  // 4. Test Inactive User Account (users.is_active = false)
  console.log('\n--- 4. Verify Inactive User Account is BLOCKED ---');
  await executeQuery(`UPDATE ${schema}.users SET is_active = FALSE WHERE id = $1`, [studentUserId]);
  let inactiveUserBlocked = false;
  try {
    await authService.PostLoginUser(studentEmail, testPassword);
  } catch (err: any) {
    console.log(`✓ PostLoginUser threw expected error: ${err.statusCode} ${err.errorCode} - ${err.message}`);
    if (err.statusCode === 403 && err.errorCode === 'ACCOUNT_INACTIVE') {
      inactiveUserBlocked = true;
    }
  }
  if (!inactiveUserBlocked) {
    throw new Error('FAILED: Inactive user was able to log in or wrong error returned!');
  }

  // Restore student
  await executeQuery(`UPDATE ${schema}.users SET is_active = TRUE WHERE id = $1`, [studentUserId]);
  await executeQuery(
    `UPDATE ${schema}.organization_members SET status = 'ACTIVE' WHERE organization_id = $1 AND user_id = $2`,
    [orgId, studentUserId]
  );
  console.log('✓ Restored test student to ACTIVE');

  // 5. Test Active Student Login Succeeds with Valid Org ID
  console.log('\n--- 5. Verify Active Student Login Succeeds ---');
  const loginRes = await authService.PostLoginUser(studentEmail, testPassword, undefined, true);
  console.log(`✓ Login succeeded: role=${loginRes.user.role}, activeOrgId=${loginRes.user.activeOrganizationId}, status=${loginRes.user.status}`);
  if (!loginRes.user.activeOrganizationId) {
    throw new Error('FAILED: Active student login returned undefined activeOrganizationId!');
  }

  // 6. Test Suspended Organization
  console.log('\n--- 6. Verify Suspended Organization Login is BLOCKED ---');
  // Create a separate suspended test org
  const testSuspendedOrgSlug = 'test-suspended-org';
  await executeQuery(
    `INSERT INTO ${schema}.organizations (name, slug, domain, status, plan_type)
     VALUES ('Suspended Org Test', $1, 'suspended.test.com', 'SUSPENDED', 'GROWTH')
     ON CONFLICT (slug) DO UPDATE SET status = 'SUSPENDED'`,
    [testSuspendedOrgSlug]
  );
  const suspOrgRes = await executeQuery(`SELECT id FROM ${schema}.organizations WHERE slug = $1`, [testSuspendedOrgSlug]);
  const suspOrgId = suspOrgRes.rows[0].id;

  // Create a user who ONLY belongs to this suspended org
  const suspOrgUserEmail = 'user_in_suspended_org@test.com';
  await executeQuery(
    `INSERT INTO ${schema}.users (email, password_hash, first_name, last_name, is_active, email_verified)
     VALUES ($1, $2, 'Org', 'User', TRUE, TRUE)
     ON CONFLICT (email) DO UPDATE SET password_hash = $2, is_active = TRUE`,
    [suspOrgUserEmail, passwordHash]
  );
  const suspUserRes = await executeQuery(`SELECT id FROM ${schema}.users WHERE email = $1`, [suspOrgUserEmail]);
  const suspUserId = suspUserRes.rows[0].id;

  await executeQuery(
    `INSERT INTO ${schema}.organization_members (organization_id, user_id, role_id, status)
     VALUES ($1, $2, 'STUDENT', 'ACTIVE')
     ON CONFLICT (organization_id, user_id) DO UPDATE SET status = 'ACTIVE'`,
    [suspOrgId, suspUserId]
  );

  let orgSuspendedBlocked = false;
  try {
    await authService.PostLoginUser(suspOrgUserEmail, testPassword);
  } catch (err: any) {
    console.log(`✓ PostLoginUser threw expected error: ${err.statusCode} ${err.errorCode} - ${err.message}`);
    if (err.statusCode === 403 && err.errorCode === 'ORGANIZATION_INACTIVE') {
      orgSuspendedBlocked = true;
    }
  }
  if (!orgSuspendedBlocked) {
    throw new Error('FAILED: User in suspended org was NOT blocked at login!');
  }

  // Clean up test data
  await executeQuery(`DELETE FROM ${schema}.organization_members WHERE user_id IN ($1, $2)`, [studentUserId, suspUserId]);
  await executeQuery(`DELETE FROM ${schema}.users WHERE id IN ($1, $2)`, [studentUserId, suspUserId]);
  await executeQuery(`DELETE FROM ${schema}.organizations WHERE id = $1`, [suspOrgId]);
  console.log('✓ Cleaned up test records');

  console.log('\n======================================================');
  console.log('🎉 ALL SUSPENSION ENFORCEMENT CHECKS PASSED PERFECTLY!');
  console.log('======================================================\n');
}

verifySuspension()
  .then(() => dbPool.end())
  .catch((e) => {
    console.error('Verification failed:', e);
    dbPool.end().then(() => process.exit(1));
  });
