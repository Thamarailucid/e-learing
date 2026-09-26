import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Compass, Award, LogOut, GraduationCap, Building, Clock, ShieldAlert, Menu, X, User } from 'lucide-react';
import { Button, Drawer } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../services/api/ApiClient';
import { SecureStorageService } from '../services/storage/SecureStorageService';
import { useTheme } from '../components/theme/ThemeProvider';
import { formatLocal } from '../utils/dateTimeUtils';
import { UserAvatar } from '../components/common/UserAvatar';
import { ProfileEditModal } from '../components/modals/ProfileEditModal';

export const StudentLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const session = SecureStorageService.GetDecryptedValue<any>('session');
  const { orgProfile, theme } = useTheme();

  const { data: profileRes } = useQuery({
    queryKey: ['authenticated-user-profile'],
    queryFn: async () => {
      const res = await ApiClient.get('/auth/GetAuthenticatedUserProfile');
      return res.data?.data;
    },
    staleTime: 15000,
  });

  const effectiveUser = profileRes || session?.user;

  const orgName = orgProfile?.name || session?.user?.activeOrganizationName;
  const orgLogo = orgProfile?.logoUrl || session?.user?.activeOrganizationLogo;

  const handleLogout = () => {
    SecureStorageService.ClearEncryptedStorage();
    navigate('/login');
  };

  const navItems = [
    { label: 'My Learning', to: '/student/dashboard', icon: BookOpen },
    { label: 'Explore Catalog', to: '/student/catalog', icon: Compass },
    { label: 'Certificates', to: '/student/certificates', icon: Award },
  ];

  const isSuspended =
    (orgProfile?.status && orgProfile.status !== 'ACTIVE') ||
    session?.user?.status === 'SUSPENDED' ||
    session?.user?.status === 'INACTIVE' ||
    session?.user?.orgStatus === 'SUSPENDED' ||
    session?.user?.orgStatus === 'INACTIVE' ||
    session?.user?.is_active === false;

  const isOrgSuspended =
    (orgProfile?.status && orgProfile.status !== 'ACTIVE') ||
    session?.user?.orgStatus === 'SUSPENDED' ||
    session?.user?.orgStatus === 'INACTIVE';

  if (isSuspended) {
    return (
      <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-red-200/80 shadow-xl overflow-hidden p-8 sm:p-10 text-center">
          <div className="w-20 h-20 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
            {isOrgSuspended ? 'Academy Access Suspended' : 'Student Account Suspended'}
          </h1>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed max-w-md mx-auto">
            {isOrgSuspended
              ? `${orgName || 'This academy'} has been ${orgProfile?.status?.toLowerCase() || 'suspended'}. All course catalogs, learning players, and certificate issuance are temporarily unavailable.`
              : 'Your student account has been suspended by the academy administrator. You cannot view course lessons, quizzes, or certificates.'}
          </p>
          <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 text-xs text-left mb-6 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Academy:</span>
              <span className="font-semibold text-gray-900">{orgName || 'E-Learning Portal'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Learner Email:</span>
              <span className="font-mono text-gray-900">{session?.user?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <span className="font-bold text-red-600">SUSPENDED (Locked)</span>
            </div>
          </div>
          <Button type="primary" danger size="large" onClick={handleLogout} className="px-8 h-11 font-semibold rounded-xl">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] w-full max-w-full overflow-x-hidden">
      {/* Modern Top Navbar with Organization Co-Branding */}
      <header className="bg-white border-b border-[#e5e5e5] px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs w-full max-w-full">
        <div className="flex items-center gap-4 lg:gap-8 min-w-0">
          {/* Organization Logo & Name */}
          <div
            onClick={() => navigate('/student/dashboard')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none min-w-0"
          >
            {orgLogo ? (
              <img
                src={orgLogo}
                alt={orgName || 'Academy Logo'}
                className="h-7 sm:h-8 max-w-[110px] sm:max-w-[150px] object-contain rounded shrink-0"
              />
            ) : (
              <div
                style={{ backgroundColor: theme.primaryColor || '#000000' }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm shrink-0"
              >
                {orgName ? orgName.charAt(0).toUpperCase() : <GraduationCap className="w-4 h-4" />}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-sm tracking-tight text-[#111111] leading-tight truncate max-w-[120px] xs:max-w-[180px] sm:max-w-[220px]">
                {orgName || 'E-Learning Academy'}
              </div>
              <div className="text-[10px] text-gray-500 font-medium truncate">
                {orgName ? 'Student Portal' : 'Student Portal'}
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) =>
                  isActive
                    ? { backgroundColor: theme.primaryColor || '#000000', color: '#ffffff' }
                    : {}
                }
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'shadow-xs'
                      : 'text-gray-600 hover:text-black hover:bg-gray-100'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right Section: Profile & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* User Profile Pill */}
          <div
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-2 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors border border-transparent hover:border-gray-200 shrink-0"
            title="Edit Student Profile & Avatar Icon"
          >
            <UserAvatar
              src={effectiveUser?.avatarUrl || effectiveUser?.avatar_url || session?.user?.avatarUrl}
              name={`${effectiveUser?.firstName || effectiveUser?.first_name || session?.user?.firstName || ''} ${effectiveUser?.lastName || effectiveUser?.last_name || session?.user?.lastName || ''}`}
              email={effectiveUser?.email || session?.user?.email}
              size="sm"
              showTooltip={false}
            />
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-[#111111] leading-snug truncate max-w-[130px]">
                {effectiveUser?.firstName || effectiveUser?.first_name || session?.user?.firstName} {effectiveUser?.lastName || effectiveUser?.last_name || session?.user?.lastName}
              </div>
              <div className="text-[10px] text-gray-500 flex items-center justify-end gap-1">
                <Clock className="w-2.5 h-2.5 text-gray-400" />
                <span className="truncate">
                  {(() => {
                    const lastLogin = effectiveUser?.lastLoginAt || effectiveUser?.lastLoginAtUtc || session?.user?.last_login_at;
                    if (!lastLogin) return 'Active Now';
                    const formatted = formatLocal(lastLogin, 'DD MMM, hh:mm A');
                    return formatted === 'N/A' ? 'Active Now' : formatted;
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Sign Out */}
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="hidden sm:flex p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-xl transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile Hamburger Menu Button */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-1.5 sm:p-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2.5">
            {orgLogo ? (
              <img src={orgLogo} alt={orgName} className="h-6 max-w-[100px] object-contain rounded" />
            ) : (
              <div className="w-6 h-6 rounded bg-black text-white flex items-center justify-center font-bold text-xs">
                {orgName ? orgName.charAt(0).toUpperCase() : 'A'}
              </div>
            )}
            <span className="text-sm font-bold truncate">{orgName || 'Student Portal'}</span>
          </div>
        }
        placement="right"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        width={280}
        styles={{ body: { padding: '16px' } }}
      >
        <div className="flex flex-col justify-between h-full">
          <div className="space-y-4">
            {/* Student Profile Overview Card */}
            <div
              onClick={() => {
                setMobileDrawerOpen(false);
                setProfileModalOpen(true);
              }}
              className="p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl cursor-pointer transition-all flex items-center gap-3"
            >
              <UserAvatar
                src={effectiveUser?.avatarUrl || effectiveUser?.avatar_url || session?.user?.avatarUrl}
                name={`${effectiveUser?.firstName || effectiveUser?.first_name || ''} ${effectiveUser?.lastName || effectiveUser?.last_name || ''}`}
                email={effectiveUser?.email || session?.user?.email}
                size="md"
                showTooltip={false}
              />
              <div className="overflow-hidden flex-1">
                <div className="text-xs font-bold text-gray-900 truncate">
                  {effectiveUser?.firstName || effectiveUser?.first_name || session?.user?.firstName} {effectiveUser?.lastName || effectiveUser?.last_name || session?.user?.lastName}
                </div>
                <div className="text-[11px] text-gray-500 truncate">{effectiveUser?.email || session?.user?.email}</div>
                <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">Edit Avatar & Profile →</div>
              </div>
            </div>

            {/* Mobile Nav Links */}
            <nav className="space-y-1.5 pt-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <button
                    key={item.to}
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      navigate(item.to);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                      isActive
                        ? 'bg-black text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Drawer Footer: Sign Out */}
          <div className="pt-4 border-t border-gray-200">
            <Button
              danger
              block
              icon={<LogOut className="w-4 h-4" />}
              onClick={handleLogout}
              className="font-semibold h-10 rounded-xl"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full min-w-0 mx-auto px-3.5 py-4 sm:px-6 sm:py-6 md:p-8">
        <Outlet />
      </main>

      <footer className="py-4 px-4 text-center text-xs text-gray-400 border-t border-gray-200">
        Powered by {orgName ? `${orgName} & ` : ''}Novacodex Multi-Tenant Learning Platform
      </footer>

      <ProfileEditModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
};
