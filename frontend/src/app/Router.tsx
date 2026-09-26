import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { SecureStorageService } from '../services/storage/SecureStorageService';

// Layouts
import { AuthLayout } from '../layouts/AuthLayout';
import { SuperAdminLayout } from '../layouts/SuperAdminLayout';
import { OrganizationLayout } from '../layouts/OrganizationLayout';
import { InstructorLayout } from '../layouts/InstructorLayout';
import { StudentLayout } from '../layouts/StudentLayout';

// Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { SuperAdminDashboardPage } from '../pages/superadmin/SuperAdminDashboardPage';
import { OrganizationManagementPage } from '../pages/superadmin/OrganizationManagementPage';
import { SystemAuditLogsPage } from '../pages/superadmin/SystemAuditLogsPage';
import { OrganizationDashboardPage } from '../pages/organization/OrganizationDashboardPage';
import { StaffListPage } from '../pages/organization/StaffListPage';
import { StudentListPage } from '../pages/organization/StudentListPage';
import { OrganizationSettingsPage } from '../pages/organization/OrganizationSettingsPage';
import { InstructorDashboardPage } from '../pages/instructor/InstructorDashboardPage';
import { CourseBuilderPage } from '../pages/instructor/CourseBuilderPage';
import { StudentDashboardPage } from '../pages/student/StudentDashboardPage';
import { CourseCatalogPage } from '../pages/student/CourseCatalogPage';
import { StudentCertificatesPage } from '../pages/student/StudentCertificatesPage';
import { LearningPlayerPage } from '../pages/student/LearningPlayerPage';
import { CertificateVerificationPage } from '../pages/public/CertificateVerificationPage';
import { PublicCourseDetailsPage } from '../pages/public/PublicCourseDetailsPage';
import { PublicCatalogPage } from '../pages/public/PublicCatalogPage';
import { AcademyLandingPage } from '../pages/public/AcademyLandingPage';
import { CourseCampaignJoinPage } from '../pages/public/CourseCampaignJoinPage';
import { StaffInviteJoinPage } from '../pages/public/StaffInviteJoinPage';
import { SuspendedPage } from '../pages/auth/SuspendedPage';
import { NotFoundPage } from '../pages/auth/NotFoundPage';
import { UnauthorizedPage } from '../pages/auth/UnauthorizedPage';

// Route Guards
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const session = SecureStorageService.GetDecryptedValue<any>('session');
  const role = session?.user?.role;
  const isStudentOrStaff = ['STUDENT', 'INSTRUCTOR', 'STAFF', 'CONTENT_MANAGER', 'MANAGER', 'REVIEWER'].includes(role || '');
  const requiresPasswordReset = isStudentOrStaff && session?.user?.mustResetPassword;

  if (session?.tokens?.accessToken && !requiresPasswordReset) {
    if (!session.user?.isSuperAdmin) {
      const isUserSuspended = session.user?.status === 'SUSPENDED' || session.user?.status === 'INACTIVE';
      const isOrgSuspended = session.user?.orgStatus === 'SUSPENDED' || session.user?.orgStatus === 'INACTIVE';
      if (isUserSuspended) {
        return <Navigate to="/suspended?reason=membership_inactive" replace />;
      }
      if (isOrgSuspended) {
        return <Navigate to="/suspended?reason=org_inactive" replace />;
      }
    }
    if (session.user?.isSuperAdmin || role === 'SUPER_ADMIN') {
      return <Navigate to="/super-admin/dashboard" replace />;
    } else if (role === 'ORGANIZATION_ADMIN' || role === 'ORGANIZATION_OWNER') {
      return <Navigate to="/organization/dashboard" replace />;
    } else if (['INSTRUCTOR', 'CONTENT_MANAGER', 'MANAGER', 'REVIEWER', 'STAFF'].includes(role)) {
      return <Navigate to="/instructor/dashboard" replace />;
    }
    return <Navigate to="/student/dashboard" replace />;
  }
  return <>{children}</>;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const session = SecureStorageService.GetDecryptedValue<any>('session');
  if (!session?.tokens?.accessToken) {
    return <Navigate to="/login" replace />;
  }

  const role = session.user?.role || 'STUDENT';
  const isStudentOrStaff = ['STUDENT', 'INSTRUCTOR', 'STAFF', 'CONTENT_MANAGER', 'MANAGER', 'REVIEWER'].includes(role);

  if (isStudentOrStaff && session.user?.mustResetPassword) {
    return <Navigate to="/login?reason=must_reset_password" replace />;
  }

  // Enforce account and organization suspension lockouts across all protected routes
  if (!session.user?.isSuperAdmin) {
    const isUserSuspended = session.user?.status === 'SUSPENDED' || session.user?.status === 'INACTIVE';
    const isOrgSuspended = session.user?.orgStatus === 'SUSPENDED' || session.user?.orgStatus === 'INACTIVE';
    if (isUserSuspended) {
      return <Navigate to="/suspended?reason=membership_inactive" replace />;
    }
    if (isOrgSuspended) {
      return <Navigate to="/suspended?reason=org_inactive" replace />;
    }
  }

  if (allowedRoles && !session.user?.isSuperAdmin) {
    const role = session.user?.role || 'STUDENT';
    if (!allowedRoles.includes(role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

export const router = createBrowserRouter([
  // Public Landing & Courses Catalog (No login required)
  {
    path: '/',
    element: <PublicCatalogPage />,
  },
  {
    path: '/explore',
    element: <PublicCatalogPage />,
  },
  {
    path: '/courses',
    element: <PublicCatalogPage />,
  },
  {
    path: '/academy/:slug',
    element: <AcademyLandingPage />,
  },

  // College Outreach & Private Course Join (Public with auto-claim for logged in)
  {
    path: '/course/join',
    element: <CourseCampaignJoinPage />,
  },
  {
    path: '/join/course/:token',
    element: <CourseCampaignJoinPage />,
  },

  // Bulk Staff Onboarding & Invite Join (Public with instant role & permissions assignment)
  {
    path: '/staff/join',
    element: <StaffInviteJoinPage />,
  },
  {
    path: '/join/staff/:token',
    element: <StaffInviteJoinPage />,
  },

  // Public verification endpoint
  {
    path: '/verify/:certificateNumber',
    element: <CertificateVerificationPage />,
  },

  // Public course syllabus & details preview
  {
    path: '/course/:courseSlug',
    element: <PublicCourseDetailsPage />,
  },

  // Auth routes (Public only)
  {
    element: (
      <PublicOnlyRoute>
        <AuthLayout />
      </PublicOnlyRoute>
    ),
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <LoginPage /> },
    ],
  },

  // Standalone Full-Screen Suspended Lockout (Zero navbars/sidebars, Logout only)
  {
    path: '/suspended',
    element: <SuspendedPage />,
  },

  // Standalone Full-Screen 403 Access Denied
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },

  // Super Admin Routes
  {
    path: '/super-admin',
    element: (
      <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
        <SuperAdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <SuperAdminDashboardPage /> },
      { path: 'organizations', element: <OrganizationManagementPage /> },
      { path: 'audit-logs', element: <SystemAuditLogsPage /> },
      { path: '', element: <Navigate to="dashboard" replace /> },
    ],
  },

  // Organization Admin Routes
  {
    path: '/organization',
    element: (
      <ProtectedRoute allowedRoles={['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']}>
        <OrganizationLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <OrganizationDashboardPage /> },
      { path: 'staff', element: <StaffListPage /> },
      { path: 'students', element: <StudentListPage /> },
      { path: 'courses', element: <InstructorDashboardPage /> },
      { path: 'course/:courseId/builder', element: <CourseBuilderPage /> },
      { path: 'learn/:courseId', element: <LearningPlayerPage /> },
      { path: 'settings', element: <OrganizationSettingsPage /> },
      { path: '', element: <Navigate to="dashboard" replace /> },
    ],
  },

  // Instructor Studio & Staff Portal Routes
  {
    path: '/instructor',
    element: (
      <ProtectedRoute allowedRoles={['INSTRUCTOR', 'CONTENT_MANAGER', 'MANAGER', 'REVIEWER', 'STAFF', 'ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER']}>
        <InstructorLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <InstructorDashboardPage /> },
      { path: 'courses', element: <InstructorDashboardPage /> },
      { path: 'course/:courseId/builder', element: <CourseBuilderPage /> },
      { path: 'learn/:courseId', element: <LearningPlayerPage /> },
      { path: 'students', element: <StudentListPage /> },
      { path: 'staff', element: <StaffListPage /> },
      { path: 'reports', element: <OrganizationDashboardPage /> },
      { path: '', element: <Navigate to="dashboard" replace /> },
    ],
  },

  // Student Learner Routes
  {
    path: '/student',
    element: (
      <ProtectedRoute>
        <StudentLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <StudentDashboardPage /> },
      { path: 'catalog', element: <CourseCatalogPage /> },
      { path: 'certificates', element: <StudentCertificatesPage /> },
      { path: 'learn/:courseId', element: <LearningPlayerPage /> },
      { path: '', element: <Navigate to="dashboard" replace /> },
    ],
  },

  // 404 Not Found Fallback
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
