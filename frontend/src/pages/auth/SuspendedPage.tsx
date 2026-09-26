import React, { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldAlert, LogOut, RefreshCw, AlertTriangle, Building2, UserX } from 'lucide-react';
import { Button, Tag, message } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { SecureStorageService } from '../../services/storage/SecureStorageService';
import { ApiClient } from '../../services/api/ApiClient';

export const SuspendedPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const session = SecureStorageService.GetDecryptedValue<any>('session');

  const reason = searchParams.get('reason') || 'membership_inactive';
  const rawMessage = searchParams.get('message');

  const orgName = session?.user?.activeOrganizationName || session?.user?.organizationName || 'Academy';
  const userEmail = session?.user?.email;

  const isOrgSuspended = reason === 'org_inactive' || session?.user?.orgStatus === 'SUSPENDED';
  const isLicenseExpired = reason === 'license_expired';

  let title = 'Account Access Suspended';
  let description =
    rawMessage ||
    'Your account in this organization has been suspended. Access to courses, dashboards, and materials has been temporarily disabled.';

  if (isOrgSuspended) {
    title = 'Organization Suspended';
    description =
      rawMessage ||
      `The organization "${orgName}" has been suspended. All administrative operations, course access, and learning portals are currently unavailable.`;
  } else if (isLicenseExpired) {
    title = 'Organization License Expired';
    description =
      rawMessage ||
      `The license for "${orgName}" has expired or is currently disabled. Please contact platform support or your academy administrator.`;
  }

  const navigateToRoleDashboard = useCallback((user: any) => {
    const role = user?.role;
    if (user?.isSuperAdmin || role === 'SUPER_ADMIN') {
      navigate('/super-admin/dashboard', { replace: true });
    } else if (role === 'ORGANIZATION_ADMIN' || role === 'ORGANIZATION_OWNER') {
      navigate('/organization/dashboard', { replace: true });
    } else if (['INSTRUCTOR', 'CONTENT_MANAGER', 'MANAGER', 'REVIEWER', 'STAFF'].includes(role)) {
      navigate('/instructor/dashboard', { replace: true });
    } else {
      navigate('/student/dashboard', { replace: true });
    }
  }, [navigate]);

  // TanStack useQuery: Auto-checks when switching back to browser tab (refetchOnWindowFocus) with ZERO polling intervals
  const { isFetching, refetch } = useQuery({
    queryKey: ['check-suspended-status'],
    queryFn: async () => {
      const currentSession = SecureStorageService.GetDecryptedValue<any>('session');
      if (!currentSession?.tokens?.accessToken) return null;

      try {
        const res = await ApiClient.get('/auth/GetAuthenticatedUserProfile');
        if (res.data?.success && res.data?.data) {
          const profile = res.data.data;
          const status = profile.status || profile.member_status || 'ACTIVE';
          const orgStatus = profile.org_status || 'ACTIVE';
          const isActive = profile.is_active ?? true;

          if (status === 'ACTIVE' && orgStatus === 'ACTIVE' && isActive) {
            // Account reactivated! Update secure local storage
            const updatedUser = {
              ...currentSession.user,
              ...profile,
              id: profile.id || currentSession.user?.id,
              email: profile.email || currentSession.user?.email,
              firstName: profile.first_name || currentSession.user?.firstName,
              lastName: profile.last_name || currentSession.user?.lastName,
              status: 'ACTIVE',
              orgStatus: 'ACTIVE',
              is_active: true,
              role: profile.role_id || currentSession.user?.role,
              permissions: profile.permissions || currentSession.user?.permissions,
            };

            const updatedSession = {
              ...currentSession,
              user: updatedUser,
            };

            SecureStorageService.SetEncryptedValue('session', updatedSession);
            window.dispatchEvent(new CustomEvent('novacodex:auth-changed'));
            message.success('Account is now active! Redirecting to your dashboard...');
            navigateToRoleDashboard(updatedUser);
            return profile;
          }
        }
      } catch {}
      return null;
    },
    enabled: !!session?.tokens?.accessToken,
    refetchOnWindowFocus: 'always', // Fires automatically when user focuses/switches back to this tab
    refetchInterval: false, // NO unwanted polling! Zero continuous timer requests!
    staleTime: 0,
    retry: false,
  });

  const handleLogout = () => {
    SecureStorageService.ClearEncryptedStorage();
    sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  const handleRefresh = async () => {
    const res = await refetch();
    if (!res.data) {
      message.info('Your account or organization is still marked as suspended. Please contact your administrator.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      {/* Centered Lockout Card */}
      <div className="w-full max-w-lg bg-white rounded-3xl border border-red-200/80 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Red Accent Banner */}
        <div className="h-2 w-full bg-gradient-to-r from-red-500 via-rose-500 to-red-600" />

        <div className="p-8 sm:p-10 text-center">
          {/* Status Icon */}
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-25" />
            <div className="relative w-20 h-20 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shadow-inner">
              {isOrgSuspended ? (
                <Building2 className="w-10 h-10 stroke-[2.2]" />
              ) : isLicenseExpired ? (
                <AlertTriangle className="w-10 h-10 stroke-[2.2]" />
              ) : (
                <UserX className="w-10 h-10 stroke-[2.2]" />
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-3">
            <Tag color="error" className="px-3 py-0.5 font-bold tracking-wider uppercase text-[11px] rounded-full">
              Access Restricted
            </Tag>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
            {title}
          </h1>

          {/* Description */}
          <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto mb-6 font-normal">
            {description}
          </p>

          {/* Context Details Box */}
          <div className="bg-gray-50/90 rounded-2xl p-4 border border-gray-200/80 mb-8 text-left space-y-2">
            {orgName && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Organization:</span>
                <span className="text-gray-900 font-semibold truncate max-w-[240px]">{orgName}</span>
              </div>
            )}
            {userEmail && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Logged in as:</span>
                <span className="text-gray-900 font-mono text-[11px] truncate max-w-[240px]">{userEmail}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Navigation Rights:</span>
              <span className="text-red-600 font-semibold">Locked (No Route Access)</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              type="primary"
              danger
              size="large"
              icon={<LogOut className="w-4 h-4" />}
              onClick={handleLogout}
              className="w-full sm:w-auto px-8 h-11 font-semibold rounded-xl shadow-sm"
            >
              Sign Out
            </Button>
            <Button
              size="large"
              icon={<RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />}
              loading={isFetching}
              onClick={handleRefresh}
              className="w-full sm:w-auto px-6 h-11 font-medium rounded-xl text-gray-600 hover:text-gray-900"
            >
              {isFetching ? 'Checking...' : 'Check Status'}
            </Button>
          </div>

          {/* Help Note */}
          <p className="text-xs text-gray-400 mt-6">
            If you believe this is a mistake, please reach out to your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
};
