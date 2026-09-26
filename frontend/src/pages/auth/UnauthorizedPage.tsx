import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard, LogOut, Lock } from 'lucide-react';
import { Button, Tag } from 'antd';
import { SecureStorageService } from '../../services/storage/SecureStorageService';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const session = SecureStorageService.GetDecryptedValue<any>('session');

  const customMessage = searchParams.get('message');
  const userRole = session?.user?.role || 'GUEST';
  const userEmail = session?.user?.email;
  const orgName = session?.user?.activeOrganizationName || 'Academy';

  const getDashboardPath = () => {
    if (!session?.tokens?.accessToken) return '/login';
    const role = session.user?.role;
    if (session.user?.isSuperAdmin || role === 'SUPER_ADMIN') return '/super-admin/dashboard';
    if (role === 'ORGANIZATION_ADMIN' || role === 'ORGANIZATION_OWNER') return '/organization/dashboard';
    if (['INSTRUCTOR', 'CONTENT_MANAGER', 'MANAGER', 'REVIEWER', 'STAFF'].includes(role)) {
      return '/instructor/dashboard';
    }
    return '/student/dashboard';
  };

  const handleLogout = () => {
    SecureStorageService.ClearEncryptedStorage();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-amber-200/80 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Top Accent Gradient */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

        <div className="p-8 sm:p-10 text-center">
          {/* Shield Graphic */}
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-2xl bg-amber-100/70 animate-pulse" />
            <div className="relative w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-inner">
              <ShieldAlert className="w-10 h-10 stroke-[2.2]" />
            </div>
          </div>

          <div className="mb-3">
            <Tag color="warning" className="px-3 py-0.5 font-bold tracking-wider uppercase text-xs rounded-full">
              403 FORBIDDEN
            </Tag>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-2">
            Access Denied
          </h1>

          <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto mb-6 font-normal">
            {customMessage ||
              'You do not have the required permissions or role rights to access this page or resource.'}
          </p>

          {/* Account Context Details */}
          <div className="bg-gray-50/90 rounded-2xl p-4 border border-gray-200/80 mb-8 text-left space-y-2 text-xs">
            {userEmail && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Signed In As:</span>
                <span className="text-gray-900 font-mono text-[11px] truncate max-w-[240px]">{userEmail}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">Assigned Role:</span>
              <span className="font-semibold text-gray-900 uppercase">{userRole.replace(/_/g, ' ')}</span>
            </div>
            {orgName && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Academy Tenant:</span>
                <span className="font-semibold text-gray-900 truncate max-w-[240px]">{orgName}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">Permission Status:</span>
              <span className="text-amber-700 font-semibold flex items-center gap-1">
                <Lock className="w-3 h-3" /> Restricted
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              type="primary"
              size="large"
              icon={<LayoutDashboard className="w-4 h-4" />}
              onClick={() => navigate(getDashboardPath())}
              className="w-full sm:w-auto px-6 h-11 font-semibold rounded-xl bg-gray-900 hover:bg-black shadow-sm"
            >
              Back to Dashboard
            </Button>

            <Button
              size="large"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-6 h-11 font-medium rounded-xl text-gray-600 hover:text-gray-900"
            >
              Go Back
            </Button>

            <Button
              size="large"
              icon={<LogOut className="w-4 h-4" />}
              onClick={handleLogout}
              className="w-full sm:w-auto px-5 h-11 font-medium rounded-xl text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400">
            If you need access to this page, please contact your organization owner or platform administrator.
          </div>
        </div>
      </div>
    </div>
  );
};
