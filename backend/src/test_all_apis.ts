import { EnvironmentConfig } from './config/environment';
import { executeQuery } from './database/connection';

const BASE_URL = `http://localhost:${EnvironmentConfig.application.port}${EnvironmentConfig.application.apiPrefix}`;

interface TestResult {
  name: string;
  endpoint: string;
  method: string;
  status: number;
  expectedStatus: number;
  success: boolean;
  message?: string;
}

const results: TestResult[] = [];

async function request(method: string, path: string, body?: any, token?: string, orgId?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (orgId) headers['x-organization-id'] = orgId;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function runApiAudit() {
  console.log('======================================================');
  console.log('🚀 STARTING COMPREHENSIVE BACKEND API & DB AUDIT');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('======================================================\n');

  // 1. Audit DB Schema
  console.log('--- 1. Database Schema Audit ---');
  const schema = EnvironmentConfig.database.schema;
  const tablesRes = await executeQuery(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
    [schema]
  );
  console.log(`✓ Tables in schema "${schema}" (${tablesRes.rowCount}):`);
  console.log(tablesRes.rows.map((r: any) => `  - ${r.table_name}`).join('\n'));

  // 2. Health Endpoint
  console.log('\n--- 2. Public & Health Endpoints ---');
  const health = await request('GET', '/health');
  results.push({
    name: 'Health Check',
    endpoint: '/health',
    method: 'GET',
    status: health.status,
    expectedStatus: 200,
    success: health.status === 200,
  });

  // Public Catalog
  const catalog = await request('GET', '/public/GetPublicCatalog');
  results.push({
    name: 'Public Catalog',
    endpoint: '/public/GetPublicCatalog',
    method: 'GET',
    status: catalog.status,
    expectedStatus: 200,
    success: catalog.status === 200,
    message: `Courses found: ${catalog.data?.data?.length ?? 0}`,
  });

  // Academy Public Profile
  const academyProfile = await request('GET', '/public/GetAcademyPublicProfile/apex-academy');
  results.push({
    name: 'Academy Public Profile (apex-academy)',
    endpoint: '/public/GetAcademyPublicProfile/apex-academy',
    method: 'GET',
    status: academyProfile.status,
    expectedStatus: 200,
    success: academyProfile.status === 200,
    message: `Academy Name: ${academyProfile.data?.data?.academy?.name ?? 'none'}`,
  });

  // Public Course Details
  const courseDetails = await request('GET', '/public/GetPublicCourseDetails/fullstack-typescript-react-mastery');
  results.push({
    name: 'Public Course Details',
    endpoint: '/public/GetPublicCourseDetails/fullstack-typescript-react-mastery',
    method: 'GET',
    status: courseDetails.status,
    expectedStatus: 200,
    success: courseDetails.status === 200,
    message: `Title: ${courseDetails.data?.data?.course?.title}`,
  });

  // 3. Authentication Endpoints
  console.log('\n--- 3. Authentication & Profile ---');
  const adminLogin = await request('POST', '/auth/PostLoginUser', {
    email: EnvironmentConfig.superAdmin.email,
    password: EnvironmentConfig.superAdmin.password,
    clearPreviousSession: true,
  });
  results.push({
    name: 'Super Admin Login',
    endpoint: '/auth/PostLoginUser',
    method: 'POST',
    status: adminLogin.status,
    expectedStatus: 200,
    success: adminLogin.status === 200,
  });
  const adminToken = adminLogin.data?.data?.tokens?.accessToken;

  const ownerLogin = await request('POST', '/auth/PostLoginUser', {
    email: 'owner@apexacademy.com',
    password: 'OrgOwner@2026!',
    clearPreviousSession: true,
  });
  results.push({
    name: 'Organization Owner Login',
    endpoint: '/auth/PostLoginUser',
    method: 'POST',
    status: ownerLogin.status,
    expectedStatus: 200,
    success: ownerLogin.status === 200,
  });
  let ownerToken = ownerLogin.data?.data?.tokens?.accessToken;
  const ownerOrgId = ownerLogin.data?.data?.user?.activeOrganizationId;

  const meRes = await request('GET', '/auth/GetAuthenticatedUserProfile', undefined, adminToken);
  results.push({
    name: 'Authenticated User Profile',
    endpoint: '/auth/GetAuthenticatedUserProfile',
    method: 'GET',
    status: meRes.status,
    expectedStatus: 200,
    success: meRes.status === 200,
    message: `Email: ${meRes.data?.data?.email}`,
  });

  // 4. Super Admin Endpoints
  console.log('\n--- 4. Super Admin Operations ---');
  const saDashboard = await request('GET', '/superadmin/GetSuperAdminDashboard', undefined, adminToken);
  results.push({
    name: 'Super Admin Dashboard',
    endpoint: '/superadmin/GetSuperAdminDashboard',
    method: 'GET',
    status: saDashboard.status,
    expectedStatus: 200,
    success: saDashboard.status === 200,
    message: `Total Orgs: ${saDashboard.data?.data?.totalOrganizations}`,
  });

  const saOrgs = await request('GET', '/superadmin/GetOrganizationList', undefined, adminToken);
  const targetOrg = saOrgs.data?.data?.[0];
  results.push({
    name: 'Super Admin Organization List (with Owner Login ID & Profile)',
    endpoint: '/superadmin/GetOrganizationList',
    method: 'GET',
    status: saOrgs.status,
    expectedStatus: 200,
    success: saOrgs.status === 200 && !!targetOrg?.owner_email && !!targetOrg?.owner_user_id,
    message: `Owner Login ID: ${targetOrg?.owner_email} (${targetOrg?.owner_user_id}) | Active: ${targetOrg?.owner_is_active}`,
  });

  if (targetOrg?.id) {
    // Test Updating Organization Owner details
    const updateOwnerRes = await request('PUT', `/superadmin/UpdateOrganizationOwner/${targetOrg.id}`, {
      firstName: 'Apex',
      lastName: 'Director',
      phone: '+1 555-0199',
    }, adminToken);
    results.push({
      name: 'Super Admin Update Organization Owner Details',
      endpoint: '/superadmin/UpdateOrganizationOwner/:orgId',
      method: 'PUT',
      status: updateOwnerRes.status,
      expectedStatus: 200,
      success: updateOwnerRes.status === 200 && updateOwnerRes.data?.data?.owner?.first_name === 'Apex',
      message: `Updated name: ${updateOwnerRes.data?.data?.owner?.first_name} ${updateOwnerRes.data?.data?.owner?.last_name}`,
    });

    // Test Resetting Organization Owner Password
    const resetOwnerRes = await request('POST', `/superadmin/ResetOrganizationOwnerPassword/${targetOrg.id}`, {
      newPassword: 'OrgOwner@2026!',
    }, adminToken);
    results.push({
      name: 'Super Admin Reset Organization Owner Password',
      endpoint: '/superadmin/ResetOrganizationOwnerPassword/:orgId',
      method: 'POST',
      status: resetOwnerRes.status,
      expectedStatus: 200,
      success: resetOwnerRes.status === 200 && !!resetOwnerRes.data?.data?.newPassword,
      message: `Reset owner: ${resetOwnerRes.data?.data?.ownerEmail} for ${resetOwnerRes.data?.data?.organizationName}`,
    });

    // Owner Logs In with New Password
    const ownerLoginAfterReset = await request('POST', '/auth/PostLoginUser', {
      email: 'owner@apexacademy.com',
      password: 'OrgOwner@2026!',
      clearPreviousSession: true,
    });
    ownerToken = ownerLoginAfterReset.data?.data?.tokens?.accessToken;
    results.push({
      name: 'Owner Login with New Password succeeds without quarantine',
      endpoint: '/auth/PostLoginUser',
      method: 'POST',
      status: ownerLoginAfterReset.status,
      expectedStatus: 200,
      success: ownerLoginAfterReset.status === 200 && Boolean(ownerToken),
    });
  }

  const saLogs = await request('GET', '/superadmin/GetPlatformAuditLogList', undefined, adminToken);
  results.push({
    name: 'Super Admin Audit Logs',
    endpoint: '/superadmin/GetPlatformAuditLogList',
    method: 'GET',
    status: saLogs.status,
    expectedStatus: 200,
    success: saLogs.status === 200,
  });

  // 5. Tenant / Organization Endpoints
  console.log('\n--- 5. Organization Endpoints ---');
  let sampleCourseId: string | undefined;
  let sampleLessonId: string | undefined;

  if (ownerOrgId) {
    const orgDetails = await request('GET', '/organizations/GetOrganizationDetails', undefined, ownerToken, ownerOrgId);
    results.push({
      name: 'Organization Details',
      endpoint: '/organizations/GetOrganizationDetails',
      method: 'GET',
      status: orgDetails.status,
      expectedStatus: 200,
      success: orgDetails.status === 200,
    });

    const orgTheme = await request('GET', '/organizations/GetOrganizationThemeSettings', undefined, ownerToken, ownerOrgId);
    results.push({
      name: 'Organization Theme Settings',
      endpoint: '/organizations/GetOrganizationThemeSettings',
      method: 'GET',
      status: orgTheme.status,
      expectedStatus: 200,
      success: orgTheme.status === 200,
      message: `Primary color: ${orgTheme.data?.data?.primaryColor}`,
    });

    const orgDashboard = await request('GET', '/organizations/GetOrganizationDashboard', undefined, ownerToken, ownerOrgId);
    results.push({
      name: 'Organization Dashboard',
      endpoint: '/organizations/GetOrganizationDashboard',
      method: 'GET',
      status: orgDashboard.status,
      expectedStatus: 200,
      success: orgDashboard.status === 200,
      message: `Total students: ${orgDashboard.data?.data?.totalStudents}`,
    });

    // 6. Courses & Curriculum
    console.log('\n--- 6. Courses & Curriculum ---');
    const coursesRes = await request('GET', '/courses/GetCourseList', undefined, ownerToken, ownerOrgId);
    results.push({
      name: 'Organization Course List',
      endpoint: '/courses/GetCourseList',
      method: 'GET',
      status: coursesRes.status,
      expectedStatus: 200,
      success: coursesRes.status === 200,
      message: `Courses count: ${coursesRes.data?.data?.length ?? 0}`,
    });
    sampleCourseId = coursesRes.data?.data?.[0]?.id;

    if (sampleCourseId) {
      const singleCourseRes = await request('GET', `/courses/GetCourseDetails/${sampleCourseId}`, undefined, ownerToken, ownerOrgId);
      results.push({
        name: 'Single Course Details with Sections & Lessons',
        endpoint: '/courses/GetCourseDetails/:courseId',
        method: 'GET',
        status: singleCourseRes.status,
        expectedStatus: 200,
        success: singleCourseRes.status === 200,
        message: `Sections: ${singleCourseRes.data?.data?.sections?.length ?? 0}`,
      });
      sampleLessonId = singleCourseRes.data?.data?.sections?.[0]?.lessons?.[0]?.id;
    }

    // 7. Students & Staff
    console.log('\n--- 7. Students & Staff ---');
    const studentsRes = await request('GET', '/students/GetStudentList', undefined, ownerToken, ownerOrgId);
    results.push({
      name: 'Organization Students List',
      endpoint: '/students/GetStudentList',
      method: 'GET',
      status: studentsRes.status,
      expectedStatus: 200,
      success: studentsRes.status === 200,
      message: `Students count: ${studentsRes.data?.data?.length ?? 0}`,
    });

    const staffRes = await request('GET', '/staff/GetStaffList', undefined, ownerToken, ownerOrgId);
    results.push({
      name: 'Organization Staff List',
      endpoint: '/staff/GetStaffList',
      method: 'GET',
      status: staffRes.status,
      expectedStatus: 200,
      success: staffRes.status === 200,
      message: `Staff count: ${staffRes.data?.data?.length ?? 0}`,
    });
  }

  // 8. Videos & Lessons
  console.log('\n--- 8. Video & Interactive Questions ---');
  if (sampleLessonId && ownerOrgId) {
    const videoUrlRes = await request('GET', `/videos/GenerateVideoPlaybackUrl/${sampleLessonId}`, undefined, ownerToken, ownerOrgId);
    results.push({
      name: 'Video Playback URL',
      endpoint: '/videos/GenerateVideoPlaybackUrl/:lessonId',
      method: 'GET',
      status: videoUrlRes.status,
      expectedStatus: 200,
      success: videoUrlRes.status === 200,
      message: `Video title: ${videoUrlRes.data?.data?.title}`,
    });

    const questionsRes = await request('GET', `/videos/GetVideoInteractiveQuestionList/${sampleLessonId}`, undefined, ownerToken, ownerOrgId);
    results.push({
      name: 'Video Interactive Questions',
      endpoint: '/videos/GetVideoInteractiveQuestionList/:lessonId',
      method: 'GET',
      status: questionsRes.status,
      expectedStatus: 200,
      success: questionsRes.status === 200,
      message: `Questions count: ${questionsRes.data?.data?.length ?? 0}`,
    });
  }

  // 9. Quizzes & Progress
  console.log('\n--- 9. Quizzes & Progress ---');
  if (sampleCourseId && ownerOrgId) {
    const quizzesRes = await request('GET', `/quizzes/GetQuizList/${sampleCourseId}`, undefined, ownerToken, ownerOrgId);
    results.push({
      name: 'Course Quiz List',
      endpoint: '/quizzes/GetQuizList/:courseId',
      method: 'GET',
      status: quizzesRes.status,
      expectedStatus: 200,
      success: quizzesRes.status === 200,
      message: `Quizzes count: ${quizzesRes.data?.data?.length ?? 0}`,
    });

    const progressRes = await request('GET', `/progress/GetStudentCourseProgress/${sampleCourseId}`, undefined, ownerToken, ownerOrgId);
    results.push({
      name: 'Student Course Progress',
      endpoint: '/progress/GetStudentCourseProgress/:courseId',
      method: 'GET',
      status: progressRes.status,
      expectedStatus: 200,
      success: progressRes.status === 200,
    });
  }

  // 10. Certificates & Template Customization
  console.log('\n--- 10. Certificates & Template Customization ---');
  if (ownerOrgId) {
    const updateCertThemeRes = await request(
      'PUT',
      '/organizations/UpdateOrganizationThemeSettings',
      {
        certificateTitle: 'Professional Certificate of Completion',
        certificateSignatoryName: 'Dr. Vikram Malhotra',
        certificateSignatoryTitle: 'Dean of Academic Affairs',
        certificateAccentColor: '#4f46e5',
      },
      ownerToken,
      ownerOrgId
    );
    results.push({
      name: 'Update Organization Certificate Template Design',
      endpoint: '/organizations/UpdateOrganizationThemeSettings',
      method: 'PUT',
      status: updateCertThemeRes.status,
      expectedStatus: 200,
      success:
        updateCertThemeRes.status === 200 &&
        updateCertThemeRes.data?.data?.certificateTitle === 'Professional Certificate of Completion' &&
        updateCertThemeRes.data?.data?.certificateSignatoryName === 'Dr. Vikram Malhotra',
      message: `Title: ${updateCertThemeRes.data?.data?.certificateTitle} | Signatory: ${updateCertThemeRes.data?.data?.certificateSignatoryName}`,
    });
  }

  const certVerify = await request('GET', '/certificates/VerifyCertificate/NONEXISTENT-999');
  results.push({
    name: 'Certificate Verification (handles missing cleanly)',
    endpoint: '/certificates/VerifyCertificate/:number',
    method: 'GET',
    status: certVerify.status,
    expectedStatus: 200,
    success: certVerify.status === 200,
    message: certVerify.data?.message || certVerify.data?.data?.message,
  });

  // 11. Course Taxonomies (Categories & Difficulty Levels CRUD)
  console.log('\n--- 11. Course Taxonomies CRUD ---');
  const pubTax = await request('GET', '/taxonomies/GetPublicTaxonomies');
  results.push({
    name: 'Public Taxonomies (Categories & Levels)',
    endpoint: '/taxonomies/GetPublicTaxonomies',
    method: 'GET',
    status: pubTax.status,
    expectedStatus: 200,
    success: pubTax.status === 200,
    message: `Categories: ${pubTax.data?.data?.categories?.length ?? 0}, Levels: ${pubTax.data?.data?.difficultyLevels?.length ?? 0}`,
  });

  const catList = await request('GET', '/taxonomies/GetCategories', undefined, ownerToken, ownerOrgId);
  results.push({
    name: 'Tenant Course Categories',
    endpoint: '/taxonomies/GetCategories',
    method: 'GET',
    status: catList.status,
    expectedStatus: 200,
    success: catList.status === 200,
    message: `Total categories: ${catList.data?.data?.length ?? 0}`,
  });

  const newCat = await request(
    'POST',
    '/taxonomies/CreateCategory',
    {
      name: 'Automated Test Category',
      slug: `autotest-${Date.now()}`,
      description: 'Audit test generated category',
      icon: 'cpu',
      displayOrder: 99,
    },
    ownerToken,
    ownerOrgId
  );
  results.push({
    name: 'Create Custom Category',
    endpoint: '/taxonomies/CreateCategory',
    method: 'POST',
    status: newCat.status,
    expectedStatus: 201,
    success: newCat.status === 201,
    message: `Created ID: ${newCat.data?.data?.id}`,
  });

  const createdCatId = newCat.data?.data?.id;
  if (createdCatId) {
    const updateCat = await request(
      'PUT',
      `/taxonomies/UpdateCategory/${createdCatId}`,
      {
        name: 'Automated Test Category (Updated)',
        displayOrder: 95,
      },
      ownerToken,
      ownerOrgId
    );
    results.push({
      name: 'Update Custom Category',
      endpoint: '/taxonomies/UpdateCategory/:id',
      method: 'PUT',
      status: updateCat.status,
      expectedStatus: 200,
      success: updateCat.status === 200,
    });

    const delCat = await request(
      'DELETE',
      `/taxonomies/DeleteCategory/${createdCatId}`,
      undefined,
      ownerToken,
      ownerOrgId
    );
    results.push({
      name: 'Delete Custom Category',
      endpoint: '/taxonomies/DeleteCategory/:id',
      method: 'DELETE',
      status: delCat.status,
      expectedStatus: 200,
      success: delCat.status === 200,
    });
  }

  const lvlList = await request('GET', '/taxonomies/GetDifficultyLevels', undefined, ownerToken, ownerOrgId);
  results.push({
    name: 'Tenant Difficulty Levels',
    endpoint: '/taxonomies/GetDifficultyLevels',
    method: 'GET',
    status: lvlList.status,
    expectedStatus: 200,
    success: lvlList.status === 200,
    message: `Total levels: ${lvlList.data?.data?.length ?? 0}`,
  });

  const newLvl = await request(
    'POST',
    '/taxonomies/CreateDifficultyLevel',
    {
      name: 'Audit Test Mastery',
      code: `AUDIT_LVL_${Date.now()}`,
      description: 'Audit test generated level',
      badgeColor: 'purple',
      displayOrder: 99,
    },
    ownerToken,
    ownerOrgId
  );
  results.push({
    name: 'Create Custom Difficulty Level',
    endpoint: '/taxonomies/CreateDifficultyLevel',
    method: 'POST',
    status: newLvl.status,
    expectedStatus: 201,
    success: newLvl.status === 201,
    message: `Created ID: ${newLvl.data?.data?.id}`,
  });

  const createdLvlId = newLvl.data?.data?.id;
  if (createdLvlId) {
    const updateLvl = await request(
      'PUT',
      `/taxonomies/UpdateDifficultyLevel/${createdLvlId}`,
      {
        name: 'Audit Test Mastery (Updated)',
        badgeColor: 'gold',
      },
      ownerToken,
      ownerOrgId
    );
    results.push({
      name: 'Update Custom Difficulty Level',
      endpoint: '/taxonomies/UpdateDifficultyLevel/:id',
      method: 'PUT',
      status: updateLvl.status,
      expectedStatus: 200,
      success: updateLvl.status === 200,
    });

    const delLvl = await request(
      'DELETE',
      `/taxonomies/DeleteDifficultyLevel/${createdLvlId}`,
      undefined,
      ownerToken,
      ownerOrgId
    );
    results.push({
      name: 'Delete Custom Difficulty Level',
      endpoint: '/taxonomies/DeleteDifficultyLevel/:id',
      method: 'DELETE',
      status: delLvl.status,
      expectedStatus: 200,
      success: delLvl.status === 200,
    });
  }

  // 12. Single Primary Login, Concurrent Session Invalidation & UTC/IST Timezone Audit
  console.log('\n--- 12. Single Primary Session & Timezone Audit ---');

  // 12.1 Student Primary Login (Initial Session A)
  const studentLoginA = await request('POST', '/auth/PostLoginUser', {
    email: 'student@apexacademy.com',
    password: 'Student@2026!',
    clearPreviousSession: true,
  });
  const tokenA = studentLoginA.data?.data?.tokens?.accessToken;
  const sessionA = studentLoginA.data?.data?.user?.sessionId;
  const lastLoginUtc = studentLoginA.data?.data?.user?.lastLoginAt;
  const lastLoginIst = studentLoginA.data?.data?.user?.lastLoginAtIst;

  results.push({
    name: 'Primary Session A Login (Single Login)',
    endpoint: '/auth/PostLoginUser',
    method: 'POST',
    status: studentLoginA.status,
    expectedStatus: 200,
    success: studentLoginA.status === 200 && !!sessionA,
    message: `Session A: ${sessionA?.slice(0, 8)}... | UTC: ${lastLoginUtc} | IST: ${lastLoginIst}`,
  });

  // 12.2 Authenticated Request using Session A
  const sessionAProfile = await request('GET', '/auth/GetAuthenticatedUserProfile', undefined, tokenA);
  results.push({
    name: 'Session A Active Verification',
    endpoint: '/auth/GetAuthenticatedUserProfile',
    method: 'GET',
    status: sessionAProfile.status,
    expectedStatus: 200,
    success: sessionAProfile.status === 200,
    message: `User: ${sessionAProfile.data?.data?.first_name} | Profile IST: ${sessionAProfile.data?.data?.lastLoginAtIst}`,
  });

  // 12.3 Duplicate Login Attempt on another device/tab without clearing -> MUST return 409 Conflict
  const duplicateAttempt = await request('POST', '/auth/PostLoginUser', {
    email: 'student@apexacademy.com',
    password: 'Student@2026!',
    clearPreviousSession: false,
  });
  results.push({
    name: 'Duplicate Login Conflict Detection (409)',
    endpoint: '/auth/PostLoginUser',
    method: 'POST',
    status: duplicateAttempt.status,
    expectedStatus: 409,
    success: duplicateAttempt.status === 409 && duplicateAttempt.data?.errorCode === 'SESSION_CONFLICT',
    message: `Code: ${duplicateAttempt.data?.errorCode} | HasActiveSession: ${duplicateAttempt.data?.data?.hasActiveSession}`,
  });

  // 12.4 Clear Other Session & Log In (Session B takes over primary status)
  const studentLoginB = await request('POST', '/auth/PostLoginUser', {
    email: 'student@apexacademy.com',
    password: 'Student@2026!',
    clearPreviousSession: true,
  });
  const tokenB = studentLoginB.data?.data?.tokens?.accessToken;
  const sessionB = studentLoginB.data?.data?.user?.sessionId;

  results.push({
    name: 'Clear Previous Session & Establish Session B',
    endpoint: '/auth/PostLoginUser',
    method: 'POST',
    status: studentLoginB.status,
    expectedStatus: 200,
    success: studentLoginB.status === 200 && !!sessionB && sessionB !== sessionA,
    message: `New Session B: ${sessionB?.slice(0, 8)}... (different from A)`,
  });

  // 12.5 Invalidation of Old Session A -> MUST return 401 SESSION_TERMINATED
  const oldSessionCall = await request('GET', '/auth/GetAuthenticatedUserProfile', undefined, tokenA);
  results.push({
    name: 'Old Session A Invalidation (401 SESSION_TERMINATED)',
    endpoint: '/auth/GetAuthenticatedUserProfile',
    method: 'GET',
    status: oldSessionCall.status,
    expectedStatus: 401,
    success: oldSessionCall.status === 401 && oldSessionCall.data?.errorCode === 'SESSION_TERMINATED',
    message: `Blocked with: ${oldSessionCall.data?.errorCode} - "${oldSessionCall.data?.message}"`,
  });

  // 12.6 New Session B is Active and Authorized
  const newSessionCall = await request('GET', '/auth/GetAuthenticatedUserProfile', undefined, tokenB);
  results.push({
    name: 'New Session B Active Authorization',
    endpoint: '/auth/GetAuthenticatedUserProfile',
    method: 'GET',
    status: newSessionCall.status,
    expectedStatus: 200,
    success: newSessionCall.status === 200,
    message: `Session B Active: ${newSessionCall.data?.data?.email}`,
  });

  // 13. Student & Staff Management, Client IP Resolution, Dynamic Secure Passwords, and RBAC Switch Control
  console.log('\n--- 13. Student & Staff Management, Client IP, Dynamic Passwords & RBAC Switches ---');

  // 13.1 Login with custom Client IP & Audit Log Verification
  const testClientIp = '103.21.244.2';
  const ipLoginRes = await request('POST', '/auth/PostLoginUser', {
    email: 'owner@apexacademy.com',
    password: 'OrgOwner@2026!',
    clearPreviousSession: true,
    clientIp: testClientIp,
  });
  results.push({
    name: 'Client IP Tracking on Login',
    endpoint: '/auth/PostLoginUser (with clientIp)',
    method: 'POST',
    status: ipLoginRes.status,
    expectedStatus: 200,
    success: ipLoginRes.status === 200 && ipLoginRes.data?.data?.user?.lastLoginIp === testClientIp,
    message: `Recorded IP: ${ipLoginRes.data?.data?.user?.lastLoginIp}`,
  });
  const currentOwnerToken = ipLoginRes.data?.data?.tokens?.accessToken || ownerToken;

  // 13.2 Create Student with Auto-Generated Password
  const randomStudentEmail = `learner_${Date.now()}@example.com`;
  const createStudentRes = await request(
    'POST',
    '/students/CreateStudent',
    {
      email: randomStudentEmail,
      firstName: 'Aarav',
      lastName: 'Patel',
      phone: '+91 91234 56789',
    },
    currentOwnerToken,
    ownerOrgId
  );
  const createdStudentId = createStudentRes.data?.data?.user_id;
  const generatedStudentPwd = createStudentRes.data?.data?.initialPassword;
  results.push({
    name: 'Create Student with Dynamic Secure Password',
    endpoint: '/students/CreateStudent',
    method: 'POST',
    status: createStudentRes.status,
    expectedStatus: 201,
    success: createStudentRes.status === 201 && createStudentRes.data?.data?.isGeneratedPassword === true && typeof generatedStudentPwd === 'string' && generatedStudentPwd.length >= 10,
    message: `Generated Password: ${generatedStudentPwd}`,
  });

  // 13.3 Get Student List (Includes UID, Phone, Last Login IP, and IST Timestamp)
  const studentListRes = await request(
    'GET',
    '/students/GetStudentList?page=1&pageSize=10',
    undefined,
    currentOwnerToken,
    ownerOrgId
  );
  results.push({
    name: 'Get Student List with User ID & IP metadata',
    endpoint: '/students/GetStudentList',
    method: 'GET',
    status: studentListRes.status,
    expectedStatus: 200,
    success: studentListRes.status === 200 && Array.isArray(studentListRes.data?.data) && studentListRes.data?.data?.length > 0,
    message: `Total Students: ${studentListRes.data?.pagination?.totalRecords}`,
  });

  // 13.4 Update Student Details
  const updateStudentRes = await request(
    'PUT',
    '/students/UpdateStudentDetails',
    {
      studentUserId: createdStudentId,
      firstName: 'Aarav (Updated)',
      lastName: 'Patel',
      phone: '+91 99999 88888',
      status: 'ACTIVE',
    },
    currentOwnerToken,
    ownerOrgId
  );
  results.push({
    name: 'Update Student Details (Name, Phone, Status)',
    endpoint: '/students/UpdateStudentDetails',
    method: 'PUT',
    status: updateStudentRes.status,
    expectedStatus: 200,
    success: updateStudentRes.status === 200 && updateStudentRes.data?.data?.first_name === 'Aarav (Updated)',
  });

  // 13.5 Reset Student Password (Auto-generated or custom)
  const resetStudentPwdRes = await request(
    'POST',
    '/students/ResetStudentPassword',
    {
      studentUserId: createdStudentId,
    },
    currentOwnerToken,
    ownerOrgId
  );
  const newStudentPwd = resetStudentPwdRes.data?.data?.temporaryPassword;
  results.push({
    name: 'Reset Student Password (Secure Temporary Password)',
    endpoint: '/students/ResetStudentPassword',
    method: 'POST',
    status: resetStudentPwdRes.status,
    expectedStatus: 200,
    success: resetStudentPwdRes.status === 200 && !!newStudentPwd && newStudentPwd.length >= 10,
    message: `Temporary Password: ${newStudentPwd}`,
  });

  // 13.6 Create Staff Member with Granular Permission Switch (can_edit_students: false)
  const randomStaffEmail = `staff_${Date.now()}@example.com`;
  const createStaffRes = await request(
    'POST',
    '/staff/CreateStaffMember',
    {
      email: randomStaffEmail,
      firstName: 'Meera',
      lastName: 'Sharma',
      roleId: 'INSTRUCTOR',
      permissions: {
        can_edit_students: false,
        can_reset_student_passwords: false,
        can_manage_courses: true,
        can_manage_staff: false,
        can_view_reports: false,
      },
    },
    currentOwnerToken,
    ownerOrgId
  );
  const createdStaffId = createStaffRes.data?.data?.user_id;
  const staffGeneratedPwd = createStaffRes.data?.data?.initialPassword;
  results.push({
    name: 'Create Staff Member with Granular Permission Switches',
    endpoint: '/staff/CreateStaffMember',
    method: 'POST',
    status: createStaffRes.status,
    expectedStatus: 201,
    success: createStaffRes.status === 201 && createStaffRes.data?.data?.permissions?.can_edit_students === false,
    message: `Generated Pwd: ${staffGeneratedPwd}`,
  });

  // 13.7 Log In as New Staff Member with Generated Password
  const staffLoginRes = await request('POST', '/auth/PostLoginUser', {
    email: randomStaffEmail,
    password: staffGeneratedPwd,
    clearPreviousSession: true,
  });
  const meeraTempToken = staffLoginRes.data?.data?.tokens?.accessToken;
  results.push({
    name: 'Staff Login with Generated Password',
    endpoint: '/auth/PostLoginUser (Staff)',
    method: 'POST',
    status: staffLoginRes.status,
    expectedStatus: 200,
    success: staffLoginRes.status === 200 && staffLoginRes.data?.data?.user?.permissions?.can_edit_students === false,
  });

  // Staff completes mandatory password reset to clear quarantine
  const staffResetPerm = await request(
    'POST',
    '/auth/PostResetFirstTimePassword',
    { newPassword: 'PermanentMeeraPass@2026!' },
    meeraTempToken,
    ownerOrgId
  );
  const staffToken = staffResetPerm.data?.data?.tokens?.accessToken || meeraTempToken;

  // 13.8 Switch OFF Enforcement (Negative Test): Staff calling UpdateStudentDetails must get 403 Forbidden!
  const forbiddenCallRes = await request(
    'PUT',
    '/students/UpdateStudentDetails',
    {
      studentUserId: createdStudentId,
      firstName: 'Unauthorized Edit Attempt',
    },
    staffToken,
    ownerOrgId
  );
  results.push({
    name: 'RBAC Switch OFF Enforcement (403 Forbidden on Student Edit)',
    endpoint: '/students/UpdateStudentDetails',
    method: 'PUT',
    status: forbiddenCallRes.status,
    expectedStatus: 403,
    success: forbiddenCallRes.status === 403,
    message: `Blocked with: "${forbiddenCallRes.data?.message}"`,
  });

  // 13.9 Update Staff Member to Enable can_edit_students switch
  const updateStaffRes = await request(
    'PUT',
    '/staff/UpdateStaffMember',
    {
      staffUserId: createdStaffId,
      permissions: {
        can_edit_students: true,
        can_reset_student_passwords: false,
        can_manage_courses: true,
        can_manage_staff: false,
        can_view_reports: false,
      },
    },
    currentOwnerToken,
    ownerOrgId
  );
  results.push({
    name: 'Update Staff Member Permission Switches',
    endpoint: '/staff/UpdateStaffMember',
    method: 'PUT',
    status: updateStaffRes.status,
    expectedStatus: 200,
    success: updateStaffRes.status === 200 && updateStaffRes.data?.data?.permissions?.can_edit_students === true,
  });

  // 13.10 Switch ON Enforcement (Positive Test): Staff now allowed to update student details
  const allowedCallRes = await request(
    'PUT',
    '/students/UpdateStudentDetails',
    {
      studentUserId: createdStudentId,
      firstName: 'Aarav (Authorized Staff Edit)',
    },
    staffToken,
    ownerOrgId
  );
  results.push({
    name: 'RBAC Switch ON Enforcement (Authorized Student Edit by Staff)',
    endpoint: '/students/UpdateStudentDetails',
    method: 'PUT',
    status: allowedCallRes.status,
    expectedStatus: 200,
    success: allowedCallRes.status === 200,
    message: `Updated name: ${allowedCallRes.data?.data?.first_name}`,
  });

  // 13.11 Reset Staff Password
  const resetStaffPwdRes = await request(
    'POST',
    '/staff/ResetStaffPassword',
    {
      staffUserId: createdStaffId,
    },
    currentOwnerToken,
    ownerOrgId
  );
  results.push({
    name: 'Reset Staff Member Password',
    endpoint: '/staff/ResetStaffPassword',
    method: 'POST',
    status: resetStaffPwdRes.status,
    expectedStatus: 200,
    success: resetStaffPwdRes.status === 200 && !!resetStaffPwdRes.data?.data?.temporaryPassword,
    message: `New Temporary Password: ${resetStaffPwdRes.data?.data?.temporaryPassword}`,
  });

  // 13.12 First-Time Login with Temporary Password triggers mustResetPassword = true
  const staffTempLoginRes = await request('POST', '/auth/PostLoginUser', {
    email: randomStaffEmail,
    password: resetStaffPwdRes.data?.data?.temporaryPassword,
    clearPreviousSession: true,
  });
  const tempStaffToken = staffTempLoginRes.data?.data?.tokens?.accessToken;
  results.push({
    name: 'Temporary Password Login triggers mustResetPassword: true',
    endpoint: '/auth/PostLoginUser (Temporary)',
    method: 'POST',
    status: staffTempLoginRes.status,
    expectedStatus: 200,
    success: staffTempLoginRes.status === 200 && staffTempLoginRes.data?.data?.user?.mustResetPassword === true,
    message: `mustResetPassword: ${staffTempLoginRes.data?.data?.user?.mustResetPassword}`,
  });

  // 13.13 Mandatory First-Time Password Reset endpoint
  const permanentPwd = 'StaffPermanentPass2026!';
  const firstTimeResetRes = await request(
    'POST',
    '/auth/PostResetFirstTimePassword',
    {
      newPassword: permanentPwd,
    },
    tempStaffToken,
    ownerOrgId
  );
  results.push({
    name: 'PostResetFirstTimePassword sets Permanent Password & clears mustResetPassword',
    endpoint: '/auth/PostResetFirstTimePassword',
    method: 'POST',
    status: firstTimeResetRes.status,
    expectedStatus: 200,
    success: firstTimeResetRes.status === 200 && firstTimeResetRes.data?.data?.user?.mustResetPassword === false,
    message: `New tokens issued, mustResetPassword is now false`,
  });

  // 13.14 Login with Permanent Password succeeds with mustResetPassword: false
  const permanentLoginRes = await request('POST', '/auth/PostLoginUser', {
    email: randomStaffEmail,
    password: permanentPwd,
    clearPreviousSession: true,
  });
  results.push({
    name: 'Permanent Password Login succeeds without reset requirement',
    endpoint: '/auth/PostLoginUser (Permanent)',
    method: 'POST',
    status: permanentLoginRes.status,
    expectedStatus: 200,
    success: permanentLoginRes.status === 200 && permanentLoginRes.data?.data?.user?.mustResetPassword === false,
  });

  // 14. License Management, Dynamic Expiry Calculation, and Super Admin IP Audit
  console.log('\n--- 14. License Management, Dynamic Expiry Calculation & IP Audit ---');

  // 14.1 GetOrganizationList includes owner IP and dynamic license calculations
  const orgListRes = await request('GET', '/superadmin/GetOrganizationList', undefined, adminToken);
  const apexOrg = orgListRes.data?.data?.find((o: any) => o.slug === 'apex-academy');
  results.push({
    name: 'Super Admin GetOrganizationList returns Owner IP and License Fields',
    endpoint: '/superadmin/GetOrganizationList',
    method: 'GET',
    status: orgListRes.status,
    expectedStatus: 200,
    success: orgListRes.status === 200 &&
      apexOrg?.owner_last_login_ip !== undefined &&
      apexOrg?.license_status !== undefined &&
      apexOrg?.show_plan_tier_to_org !== undefined,
    message: `Owner IP: ${apexOrg?.owner_last_login_ip || 'N/A'} | License Status: ${apexOrg?.license_status} | ShowToOrg: ${apexOrg?.show_plan_tier_to_org}`,
  });

  // 14.2 Set License to EXPIRING_SOON (1 day remaining with 2 warning days) and switch show_plan_tier_to_org to false
  const tomorrowIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const updateExpiringSoonRes = await request(
    'PUT',
    `/superadmin/UpdateOrganizationPlanTier/${ownerOrgId}`,
    {
      planType: 'BUSINESS',
      maxStudents: 2000,
      maxCourses: 100,
      licenseType: 'ANNUAL',
      licenseStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      licenseEndDate: tomorrowIso,
      licenseIsActive: true,
      showPlanTierToOrg: false,
      licenseWarningDays: 2,
    },
    adminToken
  );
  results.push({
    name: 'Super Admin Updates License to Expiring Soon & Hides Plan from Org',
    endpoint: `/superadmin/UpdateOrganizationPlanTier/${ownerOrgId}`,
    method: 'PUT',
    status: updateExpiringSoonRes.status,
    expectedStatus: 200,
    success: updateExpiringSoonRes.status === 200 && updateExpiringSoonRes.data?.data?.show_plan_tier_to_org === false,
    message: `License Type: ${updateExpiringSoonRes.data?.data?.license_type} | ShowToOrg: ${updateExpiringSoonRes.data?.data?.show_plan_tier_to_org}`,
  });

  // 14.3 Academy GetOrganizationDetails verifies EXPIRING_SOON status and showPlanTierToOrg = false
  const orgDetailsExpiringRes = await request(
    'GET',
    '/organizations/GetOrganizationDetails',
    undefined,
    currentOwnerToken,
    ownerOrgId
  );
  results.push({
    name: 'Academy Portal receives Expiring Soon Status and Hidden Plan Switch',
    endpoint: '/organizations/GetOrganizationDetails',
    method: 'GET',
    status: orgDetailsExpiringRes.status,
    expectedStatus: 200,
    success: orgDetailsExpiringRes.status === 200 &&
      orgDetailsExpiringRes.data?.data?.license_status === 'EXPIRING_SOON' &&
      orgDetailsExpiringRes.data?.data?.is_expiring_soon === true &&
      orgDetailsExpiringRes.data?.data?.show_plan_tier_to_org === false,
    message: `Status: ${orgDetailsExpiringRes.data?.data?.license_status} | Days Remaining: ${orgDetailsExpiringRes.data?.data?.days_remaining}`,
  });

  // 14.4 Restore License to Active 1-Year Validity and make Plan visible
  const nextYearIso = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const restoreActiveRes = await request(
    'PUT',
    `/superadmin/UpdateOrganizationPlanTier/${ownerOrgId}`,
    {
      planType: 'ENTERPRISE',
      maxStudents: 50000,
      maxCourses: 500,
      licenseType: 'ENTERPRISE',
      licenseStartDate: new Date().toISOString(),
      licenseEndDate: nextYearIso,
      licenseIsActive: true,
      showPlanTierToOrg: true,
      licenseWarningDays: 2,
    },
    adminToken
  );
  results.push({
    name: 'Super Admin Restores License to Active 1-Year & Makes Plan Visible',
    endpoint: `/superadmin/UpdateOrganizationPlanTier/${ownerOrgId}`,
    method: 'PUT',
    status: restoreActiveRes.status,
    expectedStatus: 200,
    success: restoreActiveRes.status === 200 &&
      restoreActiveRes.data?.data?.show_plan_tier_to_org === true &&
      restoreActiveRes.data?.data?.plan_type === 'ENTERPRISE',
    message: `Plan: ${restoreActiveRes.data?.data?.plan_type} | ShowToOrg: ${restoreActiveRes.data?.data?.show_plan_tier_to_org}`,
  });

  // 14.5 Academy GetOrganizationDetails verifies ACTIVE status and showPlanTierToOrg = true
  const orgDetailsActiveRes = await request(
    'GET',
    '/organizations/GetOrganizationDetails',
    undefined,
    currentOwnerToken,
    ownerOrgId
  );
  results.push({
    name: 'Academy Portal receives Active License Status & Visible Plan',
    endpoint: '/organizations/GetOrganizationDetails',
    method: 'GET',
    status: orgDetailsActiveRes.status,
    expectedStatus: 200,
    success: orgDetailsActiveRes.status === 200 &&
      orgDetailsActiveRes.data?.data?.license_status === 'ACTIVE' &&
      orgDetailsActiveRes.data?.data?.is_expired === false &&
      orgDetailsActiveRes.data?.data?.show_plan_tier_to_org === true,
    message: `Status: ${orgDetailsActiveRes.data?.data?.license_status} | Days Remaining: ${orgDetailsActiveRes.data?.data?.days_remaining}`,
  });

  // 15. Private Proprietary Courses, Outreach Campaigns & Student Registration QR Links
  console.log('\n--- 15. Private Courses, Anti-Piracy, Outreach Campaigns & QR Registration ---');

  // 15.1 Create a Private Proprietary Course
  const createPrivateCourseRes = await request(
    'POST',
    '/courses/CreateCourse',
    {
      title: 'Proprietary System Architecture Masterclass',
      description: 'Private confidential course for accredited partner colleges only.',
      shortDescription: 'Private academy lecture with anti-piracy shield',
      level: 'ADVANCED',
      category: 'Software Engineering',
      isPrivate: true,
      accessType: 'INVITE_ONLY',
      minVideoWatchPercentage: 85,
      passQuizPercentage: 75,
    },
    currentOwnerToken,
    ownerOrgId
  );
  const privateCourseId = createPrivateCourseRes.data?.data?.id;
  results.push({
    name: 'Create Private Proprietary Course (with isPrivate = true & accessType = INVITE_ONLY)',
    endpoint: '/courses/CreateCourse',
    method: 'POST',
    status: createPrivateCourseRes.status,
    expectedStatus: 201,
    success: createPrivateCourseRes.status === 201 && Boolean(createPrivateCourseRes.data?.data?.is_private),
    message: `Course ID: ${privateCourseId} | isPrivate: ${createPrivateCourseRes.data?.data?.is_private}`,
  });

  // Add a sample lesson to this private course so we can test video playback URL verification
  let privateLessonId: string | null = null;
  if (privateCourseId) {
    // Publish the private course
    await request('POST', `/courses/PublishCourse/${privateCourseId}`, undefined, currentOwnerToken, ownerOrgId);

    // Get section
    const privateDetailsRes = await request('GET', `/courses/GetCourseDetails/${privateCourseId}`, undefined, currentOwnerToken, ownerOrgId);
    const firstSec = privateDetailsRes.data?.data?.sections?.[0];
    if (firstSec) {
      const lessonRes = await request(
        'POST',
        '/courses/CreateLesson',
        {
          courseId: privateCourseId,
          sectionId: firstSec.id,
          title: 'Lesson 1: Proprietary Isolation Patterns',
          contentType: 'VIDEO',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          videoDurationSeconds: 600,
        },
        currentOwnerToken,
        ownerOrgId
      );
      privateLessonId = lessonRes.data?.data?.id;
    }
  }

  // 15.2 Verify Public Catalog hides the private course
  const publicCatalogCheckRes = await request('GET', '/public/GetPublicCatalog');
  const catalogCourses = publicCatalogCheckRes.data?.data || [];
  const foundPrivateInPublic = catalogCourses.some((c: any) => c.id === privateCourseId);
  results.push({
    name: 'Public Catalog Strictly Hides Private Courses',
    endpoint: '/public/GetPublicCatalog',
    method: 'GET',
    status: publicCatalogCheckRes.status,
    expectedStatus: 200,
    success: publicCatalogCheckRes.status === 200 && !foundPrivateInPublic,
    message: `Total Public Courses: ${catalogCourses.length} | Private Course Leaked: ${foundPrivateInPublic}`,
  });

  // 15.3 Verify Public Course Details returns 404 for the private course
  const publicDetailsCheckRes = await request('GET', `/public/GetPublicCourseDetails/${privateCourseId}`);
  results.push({
    name: 'Public Course Details Blocks Direct Access to Private Course (404 Not Found)',
    endpoint: `/public/GetPublicCourseDetails/${privateCourseId}`,
    method: 'GET',
    status: publicDetailsCheckRes.status,
    expectedStatus: 404,
    success: publicDetailsCheckRes.status === 404,
    message: publicDetailsCheckRes.data?.message,
  });

  // 15.4 Resolve Public Organization by Code or Slug for Student QR Registration
  const publicOrgCheckRes = await request('GET', '/public/GetPublicOrganizationByCodeOrSlug/apex-academy');
  results.push({
    name: 'Public Organization Lookup by Slug (Branded Student Registration & QR)',
    endpoint: '/public/GetPublicOrganizationByCodeOrSlug/apex-academy',
    method: 'GET',
    status: publicOrgCheckRes.status,
    expectedStatus: 200,
    success: publicOrgCheckRes.status === 200 && publicOrgCheckRes.data?.data?.slug === 'apex-academy',
    message: `Org Name: ${publicOrgCheckRes.data?.data?.name} | Logo: ${Boolean(publicOrgCheckRes.data?.data?.logo_url)}`,
  });

  // 15.5 Create College Outreach Campaign Share Link with Quota = 50
  const uniqueInviteCode = `CMP-SJCE-${Date.now().toString().slice(-4)}`;
  const createCampaignRes = await request(
    'POST',
    `/campaigns/CreateCampaignLink/${privateCourseId}`,
    {
      campaignName: 'St. Joseph College Tech Fest 2026 Batch',
      targetInstitution: 'St. Joseph College of Engineering',
      maxRedemptions: 50,
      customInviteCode: uniqueInviteCode,
    },
    currentOwnerToken,
    ownerOrgId
  );
  const campaignId = createCampaignRes.data?.data?.id;
  results.push({
    name: 'Create College Outreach Campaign Share Link (Target College, Quota = 50)',
    endpoint: `/campaigns/CreateCampaignLink/${privateCourseId}`,
    method: 'POST',
    status: createCampaignRes.status,
    expectedStatus: 201,
    success: createCampaignRes.status === 201 && createCampaignRes.data?.data?.invite_code === uniqueInviteCode,
    message: `Invite Code: ${createCampaignRes.data?.data?.invite_code} | Max Quota: ${createCampaignRes.data?.data?.max_redemptions}`,
  });

  // 15.6 Get Course Campaign List in Org Studio
  const courseCampaignListRes = await request(
    'GET',
    `/campaigns/GetCourseCampaignList/${privateCourseId}`,
    undefined,
    currentOwnerToken,
    ownerOrgId
  );
  results.push({
    name: 'Instructor Studio Course Campaign List',
    endpoint: `/campaigns/GetCourseCampaignList/${privateCourseId}`,
    method: 'GET',
    status: courseCampaignListRes.status,
    expectedStatus: 200,
    success: courseCampaignListRes.status === 200 && Array.isArray(courseCampaignListRes.data?.data) && courseCampaignListRes.data?.data?.length > 0,
    message: `Total Active Campaigns: ${courseCampaignListRes.data?.data?.length}`,
  });

  // 15.7 Public Campaign Lookup by Token (Student scans QR or opens share URL)
  const publicCampaignRes = await request('GET', `/campaigns/GetCampaignDetails/${uniqueInviteCode}`);
  results.push({
    name: 'Public Campaign Details by Token (QR & Link Landing Page)',
    endpoint: `/campaigns/GetCampaignDetails/${uniqueInviteCode}`,
    method: 'GET',
    status: publicCampaignRes.status,
    expectedStatus: 200,
    success: publicCampaignRes.status === 200 &&
      publicCampaignRes.data?.data?.campaign?.targetInstitution === 'St. Joseph College of Engineering' &&
      publicCampaignRes.data?.data?.course?.isPrivate === true,
    message: `Institution: ${publicCampaignRes.data?.data?.campaign?.targetInstitution} | Seats Remaining: ${publicCampaignRes.data?.data?.campaign?.remainingSeats}`,
  });

  // 15.8 Student Registers via Organization Unique Registration Link (orgSlug: 'apex-academy')
  const newStudentEmail = `pooja_sjce_${Date.now()}@example.com`;
  const registerStudentRes = await request('POST', '/auth/PostRegisterUser', {
    email: newStudentEmail,
    password: 'Password@123!',
    firstName: 'Pooja',
    lastName: 'Iyer',
    phone: '+91 98765 43210',
    organizationSlug: 'apex-academy',
  });
  const newStudentToken = registerStudentRes.data?.data?.tokens?.accessToken;
  const newStudentId = registerStudentRes.data?.data?.user?.id;
  results.push({
    name: 'Student Registers via Organization URL (Auto-Enrolled under Apex Academy)',
    endpoint: '/auth/PostRegisterUser (with organizationSlug)',
    method: 'POST',
    status: registerStudentRes.status,
    expectedStatus: 201,
    success: registerStudentRes.status === 201 && Boolean(newStudentToken),
    message: `Student: ${newStudentEmail} | Org: ${registerStudentRes.data?.data?.user?.activeOrganizationName}`,
  });

  // 15.9 Verify student cannot access private course playback before redemption
  if (privateLessonId && newStudentToken) {
    const unauthPlaybackRes = await request(
      'GET',
      `/videos/GenerateVideoPlaybackUrl/${privateLessonId}`,
      undefined,
      newStudentToken,
      ownerOrgId
    );
    results.push({
      name: 'Unredeemed Student Blocked from Private Course Playback (403 Forbidden)',
      endpoint: `/videos/GenerateVideoPlaybackUrl/${privateLessonId}`,
      method: 'GET',
      status: unauthPlaybackRes.status,
      expectedStatus: 403,
      success: unauthPlaybackRes.status === 403,
      message: unauthPlaybackRes.data?.message,
    });
  }

  // 15.10 Student Redeems College Outreach Campaign Link
  const redeemCampaignRes = await request(
    'POST',
    '/campaigns/RedeemCampaignLink',
    {
      inviteCode: uniqueInviteCode,
    },
    newStudentToken
  );
  results.push({
    name: 'Student Redeems College Campaign Link (Enrolls in Private Course)',
    endpoint: '/campaigns/RedeemCampaignLink',
    method: 'POST',
    status: redeemCampaignRes.status,
    expectedStatus: 200,
    success: redeemCampaignRes.status === 200 && redeemCampaignRes.data?.data?.alreadyRedeemed === false,
    message: redeemCampaignRes.data?.data?.message,
  });

  // 15.11 Verify student can NOW access private course playback
  if (privateLessonId && newStudentToken) {
    const authPlaybackRes = await request(
      'GET',
      `/videos/GenerateVideoPlaybackUrl/${privateLessonId}`,
      undefined,
      newStudentToken,
      ownerOrgId
    );
    results.push({
      name: 'Enrolled Student Authorized for Private Video Playback',
      endpoint: `/videos/GenerateVideoPlaybackUrl/${privateLessonId}`,
      method: 'GET',
      status: authPlaybackRes.status,
      expectedStatus: 200,
      success: authPlaybackRes.status === 200 && Boolean(authPlaybackRes.data?.data?.videoUrl),
      message: `Lesson: ${authPlaybackRes.data?.data?.title} | Duration: ${authPlaybackRes.data?.data?.durationSeconds}s`,
    });
  }

  // 15.12 View Campaign Enrolled Students List (College Redemptions)
  const campaignRedemptionsRes = await request(
    'GET',
    `/campaigns/GetCampaignRedemptions/${campaignId}`,
    undefined,
    currentOwnerToken,
    ownerOrgId
  );
  const enrolledStudentList = campaignRedemptionsRes.data?.data || [];
  const foundStudentInList = enrolledStudentList.some((s: any) => s.user_id === newStudentId);
  results.push({
    name: 'Organization Tracks Campaign Enrolled Students (with Client IP & Timestamps)',
    endpoint: `/campaigns/GetCampaignRedemptions/${campaignId}`,
    method: 'GET',
    status: campaignRedemptionsRes.status,
    expectedStatus: 200,
    success: campaignRedemptionsRes.status === 200 && foundStudentInList,
    message: `Total Enrolled: ${enrolledStudentList.length} | Tracked Student: ${foundStudentInList}`,
  });

  // 15.13 Toggle Campaign Status
  const toggleCampaignRes = await request(
    'PUT',
    `/campaigns/ToggleCampaignStatus/${campaignId}`,
    { isActive: false },
    currentOwnerToken,
    ownerOrgId
  );
  results.push({
    name: 'Toggle Campaign Status (Deactivate Link)',
    endpoint: `/campaigns/ToggleCampaignStatus/${campaignId}`,
    method: 'PUT',
    status: toggleCampaignRes.status,
    expectedStatus: 200,
    success: toggleCampaignRes.status === 200 && toggleCampaignRes.data?.data?.is_active === false,
    message: `Status: is_active = ${toggleCampaignRes.data?.data?.is_active}`,
  });

  // 15.14 Creator Tracking Verification on Campaign Link
  const campaignCreatorName = createCampaignRes.data?.data?.creator_name;
  const campaignCreatorEmail = createCampaignRes.data?.data?.creator_email;
  results.push({
    name: 'Verify Campaign Link Stores & Returns Creator Details',
    endpoint: `/campaigns/CreateCampaignLink/${privateCourseId}`,
    method: 'POST (Verification)',
    status: createCampaignRes.status,
    expectedStatus: 201,
    success: Boolean(campaignCreatorName) && Boolean(campaignCreatorEmail),
    message: `Creator: ${campaignCreatorName} (${campaignCreatorEmail})`,
  });

  // 15.15 Create Staff Member with Default / Revoked Permissions
  const campaignStaffEmail = `staff_campaign_${Date.now()}@example.com`;
  const campaignCreateStaffRes = await request(
    'POST',
    '/staff/CreateStaffMember',
    {
      email: campaignStaffEmail,
      firstName: 'Rohan',
      lastName: 'Kumar',
      roleId: 'INSTRUCTOR',
      password: 'StaffPassword@123!',
      permissions: {
        can_manage_campaigns: false,
        can_manage_courses: false,
        can_manage_staff: false,
        can_edit_students: false,
        can_reset_student_passwords: false,
        can_view_reports: false,
      },
    },
    currentOwnerToken,
    ownerOrgId
  );
  const campaignStaffUserId = campaignCreateStaffRes.data?.data?.user_id || campaignCreateStaffRes.data?.data?.id;
  results.push({
    name: 'Create Staff Member (Instructor with Revoked Campaign Rights)',
    endpoint: '/staff/CreateStaffMember',
    method: 'POST',
    status: campaignCreateStaffRes.status,
    expectedStatus: 201,
    success: campaignCreateStaffRes.status === 201 && campaignCreateStaffRes.data?.data?.permissions?.can_manage_campaigns === false,
    message: `Staff: ${campaignStaffEmail} | ID: ${campaignStaffUserId}`,
  });

  // 15.16 Login as Staff Member
  const campaignStaffLoginRes = await request('POST', '/auth/PostLoginUser', {
    email: campaignStaffEmail,
    password: 'StaffPassword@123!',
  });
  const tempCampaignStaffToken = campaignStaffLoginRes.data?.data?.tokens?.accessToken;
  results.push({
    name: 'Staff Login with Temporary Password (mustResetPassword flag verified)',
    endpoint: '/auth/PostLoginUser',
    method: 'POST',
    status: campaignStaffLoginRes.status,
    expectedStatus: 200,
    success: campaignStaffLoginRes.status === 200 && Boolean(tempCampaignStaffToken) && campaignStaffLoginRes.data?.data?.user?.mustResetPassword === true,
    message: `mustResetPassword: ${campaignStaffLoginRes.data?.data?.user?.mustResetPassword}`,
  });

  // Staff completes mandatory password reset to clear quarantine
  const campaignStaffResetRes = await request(
    'POST',
    '/auth/PostResetFirstTimePassword',
    { newPassword: 'StaffPermanentCampaign@2026!' },
    tempCampaignStaffToken,
    ownerOrgId
  );
  const campaignStaffToken = campaignStaffResetRes.data?.data?.tokens?.accessToken || tempCampaignStaffToken;

  // 15.17 Staff without can_manage_campaigns blocked from creating campaigns (403 Forbidden)
  const campaignStaffUnauthorizedCreateRes = await request(
    'POST',
    `/campaigns/CreateCampaignLink/${privateCourseId}`,
    {
      targetInstitution: 'Unauthorized College',
      campaignName: 'Unauthorized Campaign',
      maxRedemptions: 10,
    },
    campaignStaffToken,
    ownerOrgId
  );
  results.push({
    name: 'Staff Without Campaign Permission Blocked (403 Forbidden)',
    endpoint: `/campaigns/CreateCampaignLink/${privateCourseId}`,
    method: 'POST (Unauthorized)',
    status: campaignStaffUnauthorizedCreateRes.status,
    expectedStatus: 403,
    success: campaignStaffUnauthorizedCreateRes.status === 403,
    message: campaignStaffUnauthorizedCreateRes.data?.message,
  });

  // 15.18 Staff Dependency Gating: Enabling can_manage_campaigns automatically enables can_manage_courses
  const campaignUpdateStaffRes1 = await request(
    'PUT',
    `/staff/UpdateStaffMember/${campaignStaffUserId}`,
    {
      permissions: {
        can_manage_campaigns: true,
      },
    },
    currentOwnerToken,
    ownerOrgId
  );
  const updatedPerms1 = campaignUpdateStaffRes1.data?.data?.permissions;
  results.push({
    name: 'Enabling Campaign Rights Automatically Enables Course Rights',
    endpoint: `/staff/UpdateStaffMember/${campaignStaffUserId}`,
    method: 'PUT',
    status: campaignUpdateStaffRes1.status,
    expectedStatus: 200,
    success: campaignUpdateStaffRes1.status === 200 && updatedPerms1?.can_manage_campaigns === true && updatedPerms1?.can_manage_courses === true,
    message: `Campaigns: ${updatedPerms1?.can_manage_campaigns} | Courses: ${updatedPerms1?.can_manage_courses}`,
  });

  // 15.19 Authorized Staff Successfully Creates Campaign & Verified as Creator
  const campaignStaffAuthorizedCreateRes = await request(
    'POST',
    `/campaigns/CreateCampaignLink/${privateCourseId}`,
    {
      targetInstitution: 'PSG College of Technology',
      campaignName: 'Rohan Kumar Campus Outreach',
      maxRedemptions: 30,
    },
    campaignStaffToken,
    ownerOrgId
  );
  results.push({
    name: 'Authorized Staff Successfully Creates Campaign with Tracked Creator Attribution',
    endpoint: `/campaigns/CreateCampaignLink/${privateCourseId}`,
    method: 'POST (Authorized Staff)',
    status: campaignStaffAuthorizedCreateRes.status,
    expectedStatus: 201,
    success: campaignStaffAuthorizedCreateRes.status === 201 &&
      campaignStaffAuthorizedCreateRes.data?.data?.creator_name === 'Rohan Kumar' &&
      campaignStaffAuthorizedCreateRes.data?.data?.creator_email === campaignStaffEmail,
    message: `Created By: ${campaignStaffAuthorizedCreateRes.data?.data?.creator_name} | Code: ${campaignStaffAuthorizedCreateRes.data?.data?.invite_code}`,
  });

  // 15.20 Reverse Dependency Gating: Disabling can_manage_courses automatically disables can_manage_campaigns
  const campaignUpdateStaffRes2 = await request(
    'PUT',
    `/staff/UpdateStaffMember/${campaignStaffUserId}`,
    {
      permissions: {
        can_manage_courses: false,
      },
    },
    currentOwnerToken,
    ownerOrgId
  );
  const updatedPerms2 = campaignUpdateStaffRes2.data?.data?.permissions;
  results.push({
    name: 'Revoking Course Rights Automatically Revokes Campaign Rights',
    endpoint: `/staff/UpdateStaffMember/${campaignStaffUserId}`,
    method: 'PUT',
    status: campaignUpdateStaffRes2.status,
    expectedStatus: 200,
    success: campaignUpdateStaffRes2.status === 200 && updatedPerms2?.can_manage_courses === false && updatedPerms2?.can_manage_campaigns === false,
    message: `Campaigns: ${updatedPerms2?.can_manage_campaigns} | Courses: ${updatedPerms2?.can_manage_courses}`,
  });

  // 16. Anti-Piracy DRM, Role Permission Templates & Bulk Staff Onboarding
  console.log('\n--- 16. Anti-Piracy DRM, Role Permission Templates & Bulk Staff Onboarding ---');

  // 16.1 Screenshot Violation Logging (Anti-Piracy)
  const screenshotViolationRes = await request(
    'POST',
    '/courses/LogCourseViolation',
    {
      courseId: privateCourseId,
      violationType: 'SCREENSHOT_ATTEMPT',
      metadata: {
        key: 'PrintScreen',
        playbackSeconds: 34,
        userAgent: 'Mozilla/5.0 Audit Test Agent',
      },
    },
    newStudentToken || tokenB,
    ownerOrgId
  );
  results.push({
    name: 'Log Anti-Piracy Screenshot Violation to Database & Audit Log',
    endpoint: '/courses/LogCourseViolation',
    method: 'POST',
    status: screenshotViolationRes.status,
    expectedStatus: 201,
    success: screenshotViolationRes.status === 201 && screenshotViolationRes.data?.data?.violation_type === 'SCREENSHOT_ATTEMPT',
    message: `Violation ID: ${screenshotViolationRes.data?.data?.id} | Action: ${screenshotViolationRes.data?.data?.action_taken}`,
  });

  // 16.2 Screen Recording Violation Logging
  const recordingViolationRes = await request(
    'POST',
    '/courses/LogCourseViolation',
    {
      courseId: privateCourseId,
      violationType: 'SCREEN_RECORD_ATTEMPT',
      metadata: {
        windowBlurred: true,
        action: 'OBS/CamStudio stream capture detection',
      },
    },
    newStudentToken || tokenB,
    ownerOrgId
  );
  results.push({
    name: 'Log Screen Recording Violation with Blackout Watermark Trigger',
    endpoint: '/courses/LogCourseViolation',
    method: 'POST',
    status: recordingViolationRes.status,
    expectedStatus: 201,
    success: recordingViolationRes.status === 201 && recordingViolationRes.data?.data?.violation_type === 'SCREEN_RECORD_ATTEMPT',
    message: `IP Logged: ${recordingViolationRes.data?.data?.client_ip}`,
  });

  // 16.3 Get Organization Role Permissions Template List
  const rolePermsListRes = await request(
    'GET',
    '/staff/GetRolePermissionsList',
    undefined,
    currentOwnerToken,
    ownerOrgId
  );
  results.push({
    name: 'Fetch Organization Role Permission Defaults & Switch Matrix',
    endpoint: '/staff/GetRolePermissionsList',
    method: 'GET',
    status: rolePermsListRes.status,
    expectedStatus: 200,
    success: rolePermsListRes.status === 200 && Array.isArray(rolePermsListRes.data?.data) && rolePermsListRes.data?.data?.length >= 5,
    message: `Roles Loaded: ${rolePermsListRes.data?.data?.map((r: any) => r.roleId).join(', ')}`,
  });

  // 16.4 Update Role Permissions Template (CONTENT_MANAGER)
  const updateRoleRes = await request(
    'PUT',
    '/staff/UpdateRolePermissions/CONTENT_MANAGER',
    {
      permissions: {
        can_manage_courses: true,
        can_manage_campaigns: true,
        can_view_reports: true,
        can_edit_students: false,
        can_reset_student_passwords: false,
        can_manage_staff: false,
      },
    },
    currentOwnerToken,
    ownerOrgId
  );
  results.push({
    name: 'Update Role Permission Template for CONTENT_MANAGER',
    endpoint: '/staff/UpdateRolePermissions/CONTENT_MANAGER',
    method: 'PUT',
    status: updateRoleRes.status,
    expectedStatus: 200,
    success: updateRoleRes.status === 200 && updateRoleRes.data?.data?.permissions?.can_manage_campaigns === true,
    message: `Permissions updated for ${updateRoleRes.data?.data?.roleId}`,
  });

  // 16.5 Role Permissions Dependency Gating (Enabling campaign automatically enables courses)
  const roleDepGatingRes = await request(
    'PUT',
    '/staff/UpdateRolePermissions/REVIEWER',
    {
      permissions: {
        can_manage_campaigns: true,
        can_manage_courses: false,
      },
    },
    currentOwnerToken,
    ownerOrgId
  );
  const reviewerPerms = roleDepGatingRes.data?.data?.permissions;
  results.push({
    name: 'Role Template Dependency Gating: Campaigns forces Course Rights',
    endpoint: '/staff/UpdateRolePermissions/REVIEWER',
    method: 'PUT',
    status: roleDepGatingRes.status,
    expectedStatus: 200,
    success: roleDepGatingRes.status === 200 && reviewerPerms?.can_manage_courses === true && reviewerPerms?.can_manage_campaigns === true,
    message: `Courses Auto-Enabled: ${reviewerPerms?.can_manage_courses}`,
  });

  // 16.6 Generate Bulk Staff Invite Link & Token
  const testInviteCode = `APEX-STAFF-${Date.now().toString().slice(-4)}`;
  const createInviteRes = await request(
    'POST',
    '/staff/CreateStaffInviteLink',
    {
      title: '2026 Academic Instructors Bulk Onboarding',
      roleId: 'INSTRUCTOR',
      maxRegistrations: 100,
      customInviteCode: testInviteCode,
      permissions: {
        can_manage_courses: true,
        can_manage_campaigns: true,
        can_view_reports: true,
      },
    },
    currentOwnerToken,
    ownerOrgId
  );
  const createdInvite = createInviteRes.data?.data;
  results.push({
    name: 'Create Bulk Staff Onboarding Invite Link & Token',
    endpoint: '/staff/CreateStaffInviteLink',
    method: 'POST',
    status: createInviteRes.status,
    expectedStatus: 201,
    success: createInviteRes.status === 201 && Boolean(createdInvite?.invite_code),
    message: `Invite Code: ${createdInvite?.invite_code} | Role: ${createdInvite?.role_id} | Path: ${createdInvite?.share_path}`,
  });

  // 16.7 Public Endpoint Lookup of Staff Invite Link Details (No Auth)
  const publicInviteDetailsRes = await request(
    'GET',
    `/public/GetStaffInviteDetails/${createdInvite?.invite_code}`
  );
  results.push({
    name: 'Public Verification & Role Details for Bulk Staff Link (No Auth)',
    endpoint: `/public/GetStaffInviteDetails/${createdInvite?.invite_code}`,
    method: 'GET (Public)',
    status: publicInviteDetailsRes.status,
    expectedStatus: 200,
    success: publicInviteDetailsRes.status === 200 &&
      publicInviteDetailsRes.data?.data?.roleId === 'INSTRUCTOR' &&
      Boolean(publicInviteDetailsRes.data?.data?.organization?.name),
    message: `Org: ${publicInviteDetailsRes.data?.data?.organization?.name} | Seats: ${publicInviteDetailsRes.data?.data?.remainingSeats}`,
  });

  // 16.8 Public Staff Self-Registration via Bulk Invite Link
  const bulkStaffEmail = `bulk_instructor_${Date.now()}@apexacademy.com`;
  const registerStaffRes = await request(
    'POST',
    '/public/RegisterStaffViaInvite',
    {
      inviteCode: createdInvite?.invite_code,
      firstName: 'Ananya',
      lastName: 'Iyer',
      email: bulkStaffEmail,
      password: 'BulkStaffPassword@2026!',
      phone: '+91 91234 56789',
    }
  );
  const bulkStaffSession = registerStaffRes.data?.data;
  const bulkStaffToken = bulkStaffSession?.tokens?.accessToken;
  results.push({
    name: 'Public Staff Self-Registration via Bulk Invite Link',
    endpoint: '/public/RegisterStaffViaInvite',
    method: 'POST (Public)',
    status: registerStaffRes.status,
    expectedStatus: 201,
    success: [200, 201].includes(registerStaffRes.status) &&
      bulkStaffSession?.user?.email === bulkStaffEmail &&
      bulkStaffSession?.user?.role === 'INSTRUCTOR' &&
      bulkStaffSession?.user?.permissions?.can_manage_campaigns === true,
    message: `Staff ID: ${bulkStaffSession?.user?.id} | Role: ${bulkStaffSession?.user?.role}`,
  });

  // 16.9 Verify Bulk Staff Authenticated Access to Instructor Studio
  const bulkStaffProfileRes = await request(
    'GET',
    '/auth/GetAuthenticatedUserProfile',
    undefined,
    bulkStaffToken,
    ownerOrgId
  );
  results.push({
    name: 'Bulk Registered Staff Active Portal Access & Role Confirmation',
    endpoint: '/auth/GetAuthenticatedUserProfile',
    method: 'GET (Bulk Staff)',
    status: bulkStaffProfileRes.status,
    expectedStatus: 200,
    success: bulkStaffProfileRes.status === 200 &&
      bulkStaffProfileRes.data?.data?.email === bulkStaffEmail &&
      bulkStaffProfileRes.data?.data?.role_id === 'INSTRUCTOR',
    message: `User: ${bulkStaffProfileRes.data?.data?.first_name} ${bulkStaffProfileRes.data?.data?.last_name}`,
  });

  // 16.10 List Registered Staff Under Bulk Invite Link
  const inviteRegistrationsRes = await request(
    'GET',
    `/staff/GetStaffInviteRegistrations/${createdInvite?.id}`,
    undefined,
    currentOwnerToken,
    ownerOrgId
  );
  results.push({
    name: 'List Enrolled Staff Members Registered Through Bulk Invite Link',
    endpoint: `/staff/GetStaffInviteRegistrations/${createdInvite?.id}`,
    method: 'GET',
    status: inviteRegistrationsRes.status,
    expectedStatus: 200,
    success: inviteRegistrationsRes.status === 200 &&
      Array.isArray(inviteRegistrationsRes.data?.data) &&
      inviteRegistrationsRes.data?.data?.some((u: any) => u.email === bulkStaffEmail),
    message: `Total Registered Staff: ${inviteRegistrationsRes.data?.data?.length}`,
  });

  // 17. Primary Owner Identification, PA Delegated Full Access & Hierarchy Protection
  console.log('\n--- 17. Primary Owner Identification, PA Delegated Access & Hierarchy Protection ---');

  // 17.1 Fetch Staff List and verify Primary Owner matches Super Admin Login User ID
  const staffListHierarchyRes = await request(
    'GET',
    '/staff/GetStaffList?page=1&pageSize=10',
    undefined,
    currentOwnerToken,
    ownerOrgId
  );
  const staffMembers = staffListHierarchyRes.data?.data || [];
  const primaryOwnerMember = staffMembers.find((m: any) => m.is_primary_owner === true);
  results.push({
    name: 'Staff List Pinned Primary Owner Matches Super Admin Login User ID',
    endpoint: '/staff/GetStaffList',
    method: 'GET',
    status: staffListHierarchyRes.status,
    expectedStatus: 200,
    success: staffListHierarchyRes.status === 200 &&
      Boolean(primaryOwnerMember) &&
      primaryOwnerMember.email === 'owner@apexacademy.com' &&
      primaryOwnerMember.role_id === 'ORGANIZATION_OWNER',
    message: `Owner: ${primaryOwnerMember?.email} | Role: ${primaryOwnerMember?.role_name} | is_primary_owner: ${primaryOwnerMember?.is_primary_owner}`,
  });

  const ownerUserId = primaryOwnerMember?.user_id;

  // 17.2 Owner creates a PA (Personal Assistant / Organization Admin) with full rights
  const paEmail = `pa_admin_${Date.now()}@apexacademy.com`;
  const createPaRes = await request(
    'POST',
    '/staff/CreateStaffMember',
    {
      email: paEmail,
      firstName: 'Pooja',
      lastName: 'Hegde (PA)',
      roleId: 'ORGANIZATION_ADMIN',
    },
    currentOwnerToken,
    ownerOrgId
  );
  const paUserId = createPaRes.data?.data?.user_id;
  const paInitialPwd = createPaRes.data?.data?.initialPassword;
  results.push({
    name: 'Primary Owner Grants Full Access to PA (ORGANIZATION_ADMIN)',
    endpoint: '/staff/CreateStaffMember',
    method: 'POST',
    status: createPaRes.status,
    expectedStatus: 201,
    success: createPaRes.status === 201 &&
      createPaRes.data?.data?.role_id === 'ORGANIZATION_ADMIN' &&
      createPaRes.data?.data?.permissions?.can_manage_staff === true,
    message: `PA User ID: ${paUserId} | Role: ${createPaRes.data?.data?.role_id}`,
  });

  // 17.3 Log In as PA
  const paLoginRes = await request('POST', '/auth/PostLoginUser', {
    email: paEmail,
    password: paInitialPwd,
    clearPreviousSession: true,
  });
  const tempPaToken = paLoginRes.data?.data?.tokens?.accessToken;
  results.push({
    name: 'PA Login with Full Operational Credentials',
    endpoint: '/auth/PostLoginUser (PA)',
    method: 'POST',
    status: paLoginRes.status,
    expectedStatus: 200,
    success: paLoginRes.status === 200 && Boolean(tempPaToken),
  });

  // PA completes mandatory password reset to clear quarantine
  const paResetPermRes = await request(
    'POST',
    '/auth/PostResetFirstTimePassword',
    { newPassword: 'PAPermanentPass@2026!' },
    tempPaToken,
    ownerOrgId
  );
  const paToken = paResetPermRes.data?.data?.tokens?.accessToken || tempPaToken;

  // 17.4 Negative Test: PA attempts to modify the Primary Owner -> MUST be 403 Forbidden!
  const paEditOwnerAttempt = await request(
    'PUT',
    `/staff/UpdateStaffMember/${ownerUserId}`,
    {
      firstName: 'Hacked Owner Name',
      roleId: 'INSTRUCTOR',
    },
    paToken,
    ownerOrgId
  );
  results.push({
    name: 'Hierarchy Protection: PA Blocked from Editing Primary Owner (403)',
    endpoint: `/staff/UpdateStaffMember/${ownerUserId}`,
    method: 'PUT (PA Attempt)',
    status: paEditOwnerAttempt.status,
    expectedStatus: 403,
    success: paEditOwnerAttempt.status === 403,
    message: paEditOwnerAttempt.data?.message,
  });

  // 17.5 Negative Test: PA attempts to reset Primary Owner password -> MUST be 403 Forbidden!
  const paResetOwnerPwdAttempt = await request(
    'POST',
    `/staff/ResetStaffPassword/${ownerUserId}`,
    {
      newPassword: 'MaliciousPassword123!',
    },
    paToken,
    ownerOrgId
  );
  results.push({
    name: 'Hierarchy Protection: PA Blocked from Resetting Owner Password (403)',
    endpoint: `/staff/ResetStaffPassword/${ownerUserId}`,
    method: 'POST (PA Attempt)',
    status: paResetOwnerPwdAttempt.status,
    expectedStatus: 403,
    success: paResetOwnerPwdAttempt.status === 403,
    message: paResetOwnerPwdAttempt.data?.message,
  });

  // 17.6 Negative Test: PA attempts to create another ORGANIZATION_OWNER -> MUST be 403 Forbidden!
  const paCreateOwnerAttempt = await request(
    'POST',
    '/staff/CreateStaffMember',
    {
      email: `fake_owner_${Date.now()}@apexacademy.com`,
      firstName: 'Fake',
      lastName: 'Owner',
      roleId: 'ORGANIZATION_OWNER',
    },
    paToken,
    ownerOrgId
  );
  results.push({
    name: 'Hierarchy Protection: PA Blocked from Assigning Owner Role (403)',
    endpoint: '/staff/CreateStaffMember',
    method: 'POST (PA Attempt)',
    status: paCreateOwnerAttempt.status,
    expectedStatus: 403,
    success: paCreateOwnerAttempt.status === 403,
    message: paCreateOwnerAttempt.data?.message,
  });

  // 17.7 Primary Owner returns / changes PA access (Demoting PA to INSTRUCTOR with custom switches)
  const ownerDemotePaRes = await request(
    'PUT',
    `/staff/UpdateStaffMember/${paUserId}`,
    {
      roleId: 'INSTRUCTOR',
      permissions: {
        can_manage_courses: true,
        can_manage_campaigns: true,
        can_manage_staff: false,
        can_edit_students: false,
        can_reset_student_passwords: false,
        can_view_reports: false,
      },
    },
    currentOwnerToken,
    ownerOrgId
  );
  const demotedPerms = ownerDemotePaRes.data?.data?.permissions;
  results.push({
    name: 'Primary Owner Demotes/Changes PA Access to INSTRUCTOR with Custom Switches',
    endpoint: `/staff/UpdateStaffMember/${paUserId}`,
    method: 'PUT (Owner Modifies PA)',
    status: ownerDemotePaRes.status,
    expectedStatus: 200,
    success: ownerDemotePaRes.status === 200 &&
      ownerDemotePaRes.data?.data?.role_id === 'INSTRUCTOR' &&
      demotedPerms?.can_manage_staff === false &&
      demotedPerms?.can_manage_courses === true,
    message: `Role: ${ownerDemotePaRes.data?.data?.role_id} | can_manage_staff: ${demotedPerms?.can_manage_staff}`,
  });

  // 17.8 Primary Owner Resets the Demoted Staff Member's Password
  const ownerResetPaPwdRes = await request(
    'POST',
    `/staff/ResetStaffPassword/${paUserId}`,
    {
      newPassword: 'DemotedStaffNewPassword@2026!',
    },
    currentOwnerToken,
    ownerOrgId
  );
  results.push({
    name: 'Primary Owner Successfully Resets Demoted Staff Member Password',
    endpoint: `/staff/ResetStaffPassword/${paUserId}`,
    method: 'POST (Owner Resets)',
    status: ownerResetPaPwdRes.status,
    expectedStatus: 200,
    success: ownerResetPaPwdRes.status === 200 && Boolean(ownerResetPaPwdRes.data?.data?.temporaryPassword),
    message: `New Password: ${ownerResetPaPwdRes.data?.data?.temporaryPassword}`,
  });

  // 18. Page Control Rights: Bulk Staff & User Onboarding Links & QR (can_manage_bulk_staff)
  console.log('\n--- 18. Page Control Rights: Bulk Staff Links & QR (can_manage_bulk_staff) ---');

  // 18.1 Verify can_manage_bulk_staff exists in GetRolePermissionsList
  const roleListRes = await request(
    'GET',
    '/staff/GetRolePermissionsList',
    undefined,
    currentOwnerToken,
    ownerOrgId
  );
  const adminTemplate = roleListRes.data?.data?.find((r: any) => r.roleId === 'ORGANIZATION_ADMIN');
  const instructorTemplate = roleListRes.data?.data?.find((r: any) => r.roleId === 'INSTRUCTOR');
  results.push({
    name: 'GetRolePermissionsList includes can_manage_bulk_staff for all roles',
    endpoint: '/staff/GetRolePermissionsList',
    method: 'GET',
    status: roleListRes.status,
    expectedStatus: 200,
    success: roleListRes.status === 200 &&
      adminTemplate?.permissions?.can_manage_bulk_staff === true &&
      instructorTemplate?.permissions?.can_manage_bulk_staff === false,
    message: `Admin: ${adminTemplate?.permissions?.can_manage_bulk_staff} | Instructor: ${instructorTemplate?.permissions?.can_manage_bulk_staff}`,
  });

  // 18.2 Role Template Dependency Gating: Enabling can_manage_bulk_staff auto-enables can_manage_staff
  const roleDepGatingRes2 = await request(
    'PUT',
    '/staff/UpdateRolePermissions/REVIEWER',
    {
      permissions: {
        can_manage_bulk_staff: true,
      },
    },
    currentOwnerToken,
    ownerOrgId
  );
  const reviewerPerms2 = roleDepGatingRes2.data?.data?.permissions;
  results.push({
    name: 'Role Template Dependency Gating: can_manage_bulk_staff forces can_manage_staff',
    endpoint: '/staff/UpdateRolePermissions/REVIEWER',
    method: 'PUT',
    status: roleDepGatingRes2.status,
    expectedStatus: 200,
    success: roleDepGatingRes2.status === 200 &&
      reviewerPerms2?.can_manage_bulk_staff === true &&
      reviewerPerms2?.can_manage_staff === true,
    message: `can_manage_bulk_staff: ${reviewerPerms2?.can_manage_bulk_staff} | can_manage_staff: ${reviewerPerms2?.can_manage_staff}`,
  });

  // 18.3 Role Template Dependency Gating: Disabling can_manage_staff auto-disables can_manage_bulk_staff
  const roleDepGatingRes3 = await request(
    'PUT',
    '/staff/UpdateRolePermissions/REVIEWER',
    {
      permissions: {
        can_manage_staff: false,
      },
    },
    currentOwnerToken,
    ownerOrgId
  );
  const reviewerPerms3 = roleDepGatingRes3.data?.data?.permissions;
  results.push({
    name: 'Role Template Dependency Gating: disabling can_manage_staff forces can_manage_bulk_staff false',
    endpoint: '/staff/UpdateRolePermissions/REVIEWER',
    method: 'PUT',
    status: roleDepGatingRes3.status,
    expectedStatus: 200,
    success: roleDepGatingRes3.status === 200 &&
      reviewerPerms3?.can_manage_staff === false &&
      reviewerPerms3?.can_manage_bulk_staff === false,
    message: `can_manage_staff: ${reviewerPerms3?.can_manage_staff} | can_manage_bulk_staff: ${reviewerPerms3?.can_manage_bulk_staff}`,
  });

  // 18.4 Create Staff Member with can_manage_bulk_staff: true (auto-enables can_manage_staff: true)
  const bulkManagerEmail = `bulk_mgr_${Date.now()}@apexacademy.com`;
  const createBulkMgrRes = await request(
    'POST',
    '/staff/CreateStaffMember',
    {
      email: bulkManagerEmail,
      firstName: 'Vikram',
      lastName: 'BulkManager',
      roleId: 'INSTRUCTOR',
      password: 'TemporaryBulkMgrPassword123!',
      permissions: {
        can_manage_bulk_staff: true,
      },
    },
    currentOwnerToken,
    ownerOrgId
  );
  const bulkMgrUserId = createBulkMgrRes.data?.data?.user_id;
  const bulkMgrPerms = createBulkMgrRes.data?.data?.permissions;
  results.push({
    name: 'Create Staff Member with can_manage_bulk_staff auto-enables can_manage_staff',
    endpoint: '/staff/CreateStaffMember',
    method: 'POST',
    status: createBulkMgrRes.status,
    expectedStatus: 201,
    success: createBulkMgrRes.status === 201 &&
      bulkMgrPerms?.can_manage_bulk_staff === true &&
      bulkMgrPerms?.can_manage_staff === true,
    message: `BulkStaff: ${bulkMgrPerms?.can_manage_bulk_staff} | Staff: ${bulkMgrPerms?.can_manage_staff}`,
  });

  // 18.5 Login as the Bulk Staff Manager
  const bulkMgrLoginRes = await request(
    'POST',
    '/auth/PostLoginUser',
    {
      email: bulkManagerEmail,
      password: 'TemporaryBulkMgrPassword123!',
    }
  );
  const tempBulkMgrToken = bulkMgrLoginRes.data?.data?.tokens?.accessToken;
  results.push({
    name: 'Bulk Staff Manager Login & Token Issuance',
    endpoint: '/auth/PostLoginUser',
    method: 'POST',
    status: bulkMgrLoginRes.status,
    expectedStatus: 200,
    success: bulkMgrLoginRes.status === 200 && Boolean(tempBulkMgrToken),
  });

  // Bulk Staff Manager completes mandatory password reset to clear quarantine
  const bulkMgrResetRes = await request(
    'POST',
    '/auth/PostResetFirstTimePassword',
    { newPassword: 'BulkMgrPermanentPass@2026!' },
    tempBulkMgrToken,
    ownerOrgId
  );
  const bulkMgrToken = bulkMgrResetRes.data?.data?.tokens?.accessToken || tempBulkMgrToken;

  // 18.6 Authorized Staff with can_manage_bulk_staff creates a bulk invite link
  const bulkStaffInviteRes = await request(
    'POST',
    '/staff/CreateStaffInviteLink',
    {
      title: 'Visiting Guest Lecturers 2026',
      roleId: 'INSTRUCTOR',
      maxRegistrations: 200,
      customInviteCode: `GUEST-LEC-${Date.now().toString().slice(-4)}`,
      permissions: {
        can_manage_courses: true,
      },
    },
    bulkMgrToken,
    ownerOrgId
  );
  results.push({
    name: 'Authorized Staff with can_manage_bulk_staff creates Staff Invite Link (201)',
    endpoint: '/staff/CreateStaffInviteLink',
    method: 'POST (Authorized Staff)',
    status: bulkStaffInviteRes.status,
    expectedStatus: 201,
    success: bulkStaffInviteRes.status === 201 && Boolean(bulkStaffInviteRes.data?.data?.invite_code),
    message: `Invite Code: ${bulkStaffInviteRes.data?.data?.invite_code}`,
  });

  // 18.7 Demote staff member: revoke can_manage_staff -> auto-revokes can_manage_bulk_staff
  const revokeStaffRes = await request(
    'PUT',
    `/staff/UpdateStaffMember/${bulkMgrUserId}`,
    {
      permissions: {
        can_manage_staff: false,
      },
    },
    currentOwnerToken,
    ownerOrgId
  );
  const revokedPerms = revokeStaffRes.data?.data?.permissions;
  results.push({
    name: 'Revoking can_manage_staff automatically revokes can_manage_bulk_staff',
    endpoint: `/staff/UpdateStaffMember/${bulkMgrUserId}`,
    method: 'PUT',
    status: revokeStaffRes.status,
    expectedStatus: 200,
    success: revokeStaffRes.status === 200 &&
      revokedPerms?.can_manage_staff === false &&
      revokedPerms?.can_manage_bulk_staff === false,
    message: `Staff: ${revokedPerms?.can_manage_staff} | BulkStaff: ${revokedPerms?.can_manage_bulk_staff}`,
  });

  // 18.8 Demoted Staff attempting to create staff invite link is blocked (403 Forbidden)
  const unauthorizedInviteAttempt = await request(
    'POST',
    '/staff/CreateStaffInviteLink',
    {
      title: 'Unauthorized Link Attempt',
      roleId: 'INSTRUCTOR',
      maxRegistrations: 10,
    },
    bulkMgrToken,
    ownerOrgId
  );
  results.push({
    name: 'Staff without can_manage_bulk_staff blocked from creating invite links (403)',
    endpoint: '/staff/CreateStaffInviteLink',
    method: 'POST (Unauthorized)',
    status: unauthorizedInviteAttempt.status,
    expectedStatus: 403,
    success: unauthorizedInviteAttempt.status === 403,
    message: unauthorizedInviteAttempt.data?.message,
  });

  // Print Summary Table
  console.log('\n======================================================');
  console.log('📊 AUDIT TEST RESULTS SUMMARY');
  console.log('======================================================');
  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const symbol = r.success ? '✅ PASS' : '❌ FAIL';
    if (r.success) passed++;
    else failed++;
    console.log(`${symbol} [${r.method}] ${r.endpoint.padEnd(45)} - ${r.name} (Status: ${r.status}${r.message ? ` | ${r.message}` : ''})`);
  }

  console.log('\n------------------------------------------------------');
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runApiAudit().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
