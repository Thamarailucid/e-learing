import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft, Home, LogIn, LayoutDashboard } from 'lucide-react';
import { Button, Tag } from 'antd';
import { SecureStorageService } from '../../services/storage/SecureStorageService';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const session = SecureStorageService.GetDecryptedValue<any>('session');

  const getDashboardPath = () => {
    if (!session?.tokens?.accessToken) return '/';
    const role = session.user?.role;
    if (session.user?.isSuperAdmin || role === 'SUPER_ADMIN') return '/super-admin/dashboard';
    if (role === 'ORGANIZATION_ADMIN' || role === 'ORGANIZATION_OWNER') return '/organization/dashboard';
    if (['INSTRUCTOR', 'CONTENT_MANAGER', 'MANAGER', 'REVIEWER', 'STAFF'].includes(role)) {
      return '/instructor/dashboard';
    }
    return '/student/dashboard';
  };

  const dashboardPath = getDashboardPath();
  const isLoggedIn = Boolean(session?.tokens?.accessToken);

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-gray-200/80 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Top Accent Gradient */}
        <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600" />

        <div className="p-8 sm:p-10 text-center">
          {/* Compass Graphic */}
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-3xl bg-blue-100/60 animate-pulse" />
            <div className="relative w-24 h-24 rounded-3xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-inner">
              <Compass className="w-12 h-12 stroke-[1.8] animate-[spin_12s_linear_infinite]" />
            </div>
          </div>

          <div className="mb-3">
            <Tag color="blue" className="px-3 py-0.5 font-black tracking-widest uppercase text-xs rounded-full">
              404 ERROR
            </Tag>
          </div>

          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
            Page Not Found
          </h1>

          <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto mb-8 font-normal">
            The page or resource you are looking for doesn't exist, has been removed, or the link may be broken.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              type="primary"
              size="large"
              icon={isLoggedIn ? <LayoutDashboard className="w-4 h-4" /> : <Home className="w-4 h-4" />}
              onClick={() => navigate(dashboardPath)}
              className="w-full sm:w-auto px-6 h-11 font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              {isLoggedIn ? 'Go to Dashboard' : 'Return Home'}
            </Button>

            <Button
              size="large"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-6 h-11 font-medium rounded-xl text-gray-600 hover:text-gray-900"
            >
              Go Back
            </Button>

            {!isLoggedIn && (
              <Button
                size="large"
                icon={<LogIn className="w-4 h-4" />}
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-5 h-11 font-medium rounded-xl text-gray-600 hover:text-gray-900"
              >
                Sign In
              </Button>
            )}
          </div>

          {/* Subtle help note */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400">
            Check the URL or return to the main dashboard to continue your session.
          </div>
        </div>
      </div>
    </div>
  );
};
