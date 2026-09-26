import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Palette,
  LogOut,
  Building,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  Clock,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { Modal, Button, Tag, Tooltip, Drawer } from 'antd';
import { ApiClient } from '../services/api/ApiClient';
import { SecureStorageService } from '../services/storage/SecureStorageService';
import { useTheme } from '../components/theme/ThemeProvider';
import { UserAvatar } from '../components/common/UserAvatar';
import { ProfileEditModal } from '../components/modals/ProfileEditModal';

export const OrganizationLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('novacodex_org_sidebar_collapsed') === 'true';
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('novacodex_org_sidebar_collapsed', String(next));
      return next;
    });
  };
  const session = SecureStorageService.GetDecryptedValue<any>('session');
  const { orgProfile } = useTheme();

  // Real-time Authenticated Profile & Permission Sync
  const { data: profileRes } = useQuery({
    queryKey: ['authenticated-user-profile'],
    queryFn: async () => {
      const res = await ApiClient.get('/auth/GetAuthenticatedUserProfile');
      return res.data?.data;
    },
    staleTime: 15000,
  });

  const effectiveUser = profileRes || session?.user;
  const isOwnerOrSuper =
    effectiveUser?.isSuperAdmin ||
    effectiveUser?.is_super_admin ||
    ['ORGANIZATION_OWNER'].includes(effectiveUser?.role || effectiveUser?.role_id || '');

  const isAdmin = isOwnerOrSuper || ['ORGANIZATION_ADMIN'].includes(effectiveUser?.role || effectiveUser?.role_id || '');

  let rawPerms = effectiveUser?.permissions || effectiveUser?.member_permissions;
  if (typeof rawPerms === 'string') {
    try {
      rawPerms = JSON.parse(rawPerms);
    } catch {
      rawPerms = {};
    }
  }

  const canManageCourses = isAdmin || Boolean(rawPerms?.can_manage_courses);
  const canManageStaff = isAdmin || Boolean(rawPerms?.can_manage_staff);
  const canViewReports = isAdmin || Boolean(rawPerms?.can_view_reports);
  const canViewStudents = isAdmin || Boolean(rawPerms?.can_edit_students) || Boolean(rawPerms?.can_reset_student_passwords);

  const [dismissedExpiryModal, setDismissedExpiryModal] = useState<boolean>(() => {
    return sessionStorage.getItem('novacodex_dismissed_license_alert') === 'true';
  });

  const handleDismissModal = () => {
    sessionStorage.setItem('novacodex_dismissed_license_alert', 'true');
    setDismissedExpiryModal(true);
  };

  const handleLogout = () => {
    SecureStorageService.ClearEncryptedStorage();
    sessionStorage.removeItem('novacodex_dismissed_license_alert');
    navigate('/login');
  };

  const navItems: { label: string; to: string; icon: any }[] = [];

  if (canViewReports) {
    navItems.push({ label: 'Dashboard', to: '/organization/dashboard', icon: LayoutDashboard });
  }
  if (canManageStaff) {
    navItems.push({ label: 'Staff Directory', to: '/organization/staff', icon: Users });
  }
  if (canViewStudents) {
    navItems.push({ label: 'Students', to: '/organization/students', icon: GraduationCap });
  }
  if (canManageCourses) {
    navItems.push({ label: 'Courses', to: '/organization/courses', icon: BookOpen });
  }
  if (isOwnerOrSuper) {
    navItems.push({ label: 'Branding & Theme', to: '/organization/settings', icon: Palette });
  }

  const isSuspended =
    !session?.user?.isSuperAdmin &&
    ((orgProfile?.status && orgProfile.status !== 'ACTIVE') ||
      session?.user?.status === 'SUSPENDED' ||
      session?.user?.status === 'INACTIVE' ||
      session?.user?.orgStatus === 'SUSPENDED' ||
      session?.user?.orgStatus === 'INACTIVE' ||
      effectiveUser?.status === 'SUSPENDED' ||
      effectiveUser?.status === 'INACTIVE' ||
      effectiveUser?.is_active === false);

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
            {isOrgSuspended ? 'Organization Access Suspended' : 'Staff Account Suspended'}
          </h1>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed max-w-md mx-auto">
            {isOrgSuspended
              ? `This organization has been ${orgProfile?.status?.toLowerCase() || 'suspended'}. All administrative operations, course management, and portal access are temporarily paused.`
              : 'Your staff account has been suspended. You cannot access student records, course builders, or administrative tools.'}
          </p>
          <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 text-xs text-left mb-6 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Organization:</span>
              <span className="font-semibold text-gray-900">{orgProfile?.name || session?.user?.activeOrganizationName || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Staff Account:</span>
              <span className="font-mono text-gray-900">{effectiveUser?.email || session?.user?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Navigation Rights:</span>
              <span className="font-bold text-red-600">LOCKED (No Route Access)</span>
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#fafafa] w-full max-w-full overflow-x-hidden">
      {/* Mobile Top Header (Screens < 1024px) */}
      <header
        style={{
          backgroundColor: 'var(--novacodex-sidebar-bg)',
          color: 'var(--novacodex-sidebar-text)',
        }}
        className="lg:hidden px-4 py-3 border-b border-white/10 flex items-center justify-between sticky top-0 z-30 shadow-xs"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="p-1.5 rounded-xl hover:bg-white/10 text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center font-bold text-sm">
              <Building className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm truncate max-w-[170px] sm:max-w-[240px]">
              {session?.activeOrganizationName || orgProfile?.name || 'Organization Hub'}
            </span>
          </div>
        </div>

        <div
          onClick={() => setProfileModalOpen(true)}
          className="flex items-center gap-2 cursor-pointer"
          title="Edit Profile"
        >
          <UserAvatar
            src={effectiveUser?.avatarUrl || effectiveUser?.avatar_url || session?.user?.avatarUrl}
            name={`${effectiveUser?.firstName || ''} ${effectiveUser?.lastName || ''}`}
            email={effectiveUser?.email || session?.user?.email}
            size="sm"
            showTooltip={false}
          />
        </div>
      </header>

      {/* Mobile Slide-out Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm">
              <Building className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold truncate">
              {session?.activeOrganizationName || orgProfile?.name || 'Organization Hub'}
            </span>
          </div>
        }
        placement="left"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        width={280}
        styles={{ body: { padding: '16px', backgroundColor: 'var(--novacodex-sidebar-bg)', color: 'var(--novacodex-sidebar-text)' } }}
      >
        <div className="flex flex-col justify-between h-full">
          <div className="space-y-4">
            <div
              onClick={() => {
                setMobileDrawerOpen(false);
                setProfileModalOpen(true);
              }}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl cursor-pointer transition-all flex items-center gap-3"
            >
              <UserAvatar
                src={effectiveUser?.avatarUrl || effectiveUser?.avatar_url || session?.user?.avatarUrl}
                name={`${effectiveUser?.firstName || ''} ${effectiveUser?.lastName || ''}`}
                email={effectiveUser?.email || session?.user?.email}
                size="md"
                showTooltip={false}
              />
              <div className="overflow-hidden flex-1 text-left">
                <div className="text-xs font-bold text-white truncate">
                  {effectiveUser?.firstName || 'Staff'} {effectiveUser?.lastName || ''}
                </div>
                <div className="text-[11px] opacity-70 truncate">{effectiveUser?.email || session?.user?.email}</div>
                <div className="text-[10px] text-amber-300 font-semibold mt-0.5">Edit Profile & Avatar →</div>
              </div>
            </div>

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
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-white/10">
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

      {/* Desktop Collapsible Sidebar (>= 1024px) */}
      <aside
        style={{
          backgroundColor: 'var(--novacodex-sidebar-bg)',
          color: 'var(--novacodex-sidebar-text)',
        }}
        className={`hidden lg:flex flex-col justify-between p-4 border-r border-white/10 transition-all duration-200 sticky top-0 h-screen shrink-0 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="overflow-y-auto no-scrollbar">
          {session?.user?.isSuperAdmin && !collapsed && (
            <div className="mb-4 p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl">
              <div className="flex items-center justify-between text-amber-300 text-xs font-semibold">
                <span className="flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Super Admin
                </span>
                <button
                  onClick={() => navigate('/super-admin/organizations')}
                  className="px-2 py-0.5 rounded bg-amber-400 text-black font-semibold hover:bg-amber-300 text-[10px]"
                >
                  Exit
                </button>
              </div>
              <div className="text-[11px] text-amber-100 mt-1 truncate">
                Viewing: {session?.activeOrganizationName || 'Academy Portal'}
              </div>
            </div>
          )}

          {/* Sidebar Header & Toggle Switch */}
          <div className="flex items-center justify-between px-2 py-3 mb-4 border-b border-white/10">
            {!collapsed ? (
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold text-base shrink-0">
                  <Building className="w-4 h-4" />
                </div>
                <div className="overflow-hidden text-left">
                  <div className="font-semibold text-sm tracking-wide truncate">Organization Hub</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs opacity-70">Admin Operations</span>
                    {orgProfile?.showPlanTierToOrg !== false && orgProfile?.planType && (
                      <span className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/20 text-white uppercase">
                        {orgProfile.planType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold text-base mx-auto">
                <Building className="w-4 h-4" />
              </div>
            )}

            {/* Desktop Close/Open Toggle Button */}
            {!collapsed ? (
              <Tooltip title="Collapse sidebar" placement="right">
                <button
                  onClick={toggleCollapsed}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </Tooltip>
            ) : null}
          </div>

          {collapsed && (
            <div className="mb-4 text-center">
              <Tooltip title="Expand sidebar" placement="right">
                <button
                  onClick={toggleCollapsed}
                  className="w-full flex items-center justify-center py-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <PanelLeftOpen className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>
          )}

          {/* Navigation Links with Tooltip Support */}
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Tooltip key={item.to} title={collapsed ? item.label : undefined} placement="right">
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center ${collapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5'} rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/15 font-semibold text-white shadow-xs'
                        : 'opacity-70 hover:opacity-100 hover:bg-white/5'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              </Tooltip>
            ))}
          </nav>
        </div>

        {/* User Profile & Sign Out Footer */}
        <div className="border-t border-white/10 pt-4">
          <Tooltip
            title={collapsed ? `${effectiveUser?.firstName || 'Staff'} ${effectiveUser?.lastName || ''} (Click to edit)` : undefined}
            placement="right"
          >
            <div
              onClick={() => setProfileModalOpen(true)}
              className={`flex items-center ${collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2'} mb-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors`}
              title="Edit Staff Profile & Avatar Icon"
            >
              <UserAvatar
                src={effectiveUser?.avatarUrl || effectiveUser?.avatar_url || session?.user?.avatarUrl}
                name={`${effectiveUser?.firstName || effectiveUser?.first_name || ''} ${effectiveUser?.lastName || effectiveUser?.last_name || ''}`}
                email={effectiveUser?.email || session?.user?.email}
                size="sm"
                showTooltip={false}
              />
              {!collapsed && (
                <div className="overflow-hidden flex-1 text-left">
                  <div className="text-xs font-semibold truncate leading-tight">
                    {effectiveUser?.firstName || effectiveUser?.first_name || 'Staff Member'} {effectiveUser?.lastName || effectiveUser?.last_name || ''}
                  </div>
                  <div className="text-[10px] opacity-60 truncate mt-0.5">
                    {effectiveUser?.email || session?.user?.email}
                  </div>
                </div>
              )}
            </div>
          </Tooltip>

          <Tooltip title={collapsed ? 'Sign Out' : undefined} placement="right">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'} text-sm opacity-70 hover:opacity-100 hover:text-rose-400 hover:bg-white/5 rounded-xl transition-colors`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </Tooltip>
        </div>
      </aside>

      <main className="flex-1 min-w-0 w-full p-3.5 sm:p-6 lg:p-8 overflow-y-auto max-h-screen">
        {/* License Expired Alert Banner */}
        {orgProfile?.isExpired && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-900 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="font-semibold text-sm text-red-900">
                  {orgProfile.licenseIsActive === false ? 'Academy License Deactivated' : 'Academy License Expired'}
                </div>
                <div className="text-xs text-red-700 mt-0.5">
                  Your academy license ended on{' '}
                  <span className="font-semibold">
                    {orgProfile.licenseEndDateIst?.split(',')[0] || 'recently'}
                  </span>
                  . Certain administrative actions and student enrollments may be suspended until renewed.
                </div>
              </div>
            </div>
            <Button
              danger
              size="middle"
              onClick={() => setDismissedExpiryModal(false)}
              className="shrink-0 font-medium"
            >
              View Expiry Details
            </Button>
          </div>
        )}

        {/* License Expiring Soon Warning Banner */}
        {!orgProfile?.isExpired && orgProfile?.isExpiringSoon && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
              </div>
              <div>
                <div className="font-semibold text-sm text-amber-900 flex items-center gap-2">
                  <span>Academy License Expiring Soon</span>
                  <Tag color="warning" className="text-[10px] uppercase font-bold m-0">
                    {orgProfile.daysRemaining !== null ? `${orgProfile.daysRemaining} days left` : 'Expiring soon'}
                  </Tag>
                </div>
                <div className="text-xs text-amber-800 mt-0.5">
                  Your {orgProfile.licenseType || 'SaaS'} subscription expires on{' '}
                  <span className="font-semibold">
                    {orgProfile.licenseEndDateIst?.split(',')[0]}
                  </span>
                  . Please renew with your platform administrator to prevent interruption.
                </div>
              </div>
            </div>
            <Button
              size="middle"
              onClick={() => setDismissedExpiryModal(false)}
              className="shrink-0 !text-amber-900 border-amber-300 hover:!bg-amber-100 font-medium"
            >
              Renewal Notice
            </Button>
          </div>
        )}

        <Outlet />

        {/* License Alert Popup Modal (Expiring Soon or Expired) */}
        {orgProfile?.status === 'ACTIVE' && (orgProfile?.isExpired || orgProfile?.isExpiringSoon) && (
          <Modal
            open={!dismissedExpiryModal}
            onCancel={handleDismissModal}
            footer={[
              <Button key="close" type="primary" onClick={handleDismissModal}>
                {orgProfile?.isExpired ? 'Acknowledge Alert' : 'I Understand & Continue'}
              </Button>,
            ]}
            width={500}
            closable={true}
          >
            <div className="py-2">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    orgProfile?.isExpired ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">
                    {orgProfile?.isExpired
                      ? 'Academy License Expired'
                      : `Academy License Expiring Soon (${orgProfile.daysRemaining} Days Left)`}
                  </h3>
                  <div className="text-xs text-gray-500">
                    Organization Tenant: <span className="font-medium text-gray-800">{orgProfile.name}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-xs space-y-2.5 font-mono">
                <div className="flex justify-between border-b border-gray-200/80 pb-2">
                  <span className="text-gray-500">License Status:</span>
                  <Tag color={orgProfile?.isExpired ? 'error' : 'warning'} className="m-0 uppercase font-bold">
                    {orgProfile?.licenseStatus}
                  </Tag>
                </div>
                <div className="flex justify-between border-b border-gray-200/80 pb-2">
                  <span className="text-gray-500">License Type:</span>
                  <span className="font-semibold text-gray-900">{orgProfile?.licenseType || 'SUBSCRIPTION'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200/80 pb-2">
                  <span className="text-gray-500">Expiration Date (IST):</span>
                  <span className="font-bold text-gray-900">{orgProfile?.licenseEndDateIst ? orgProfile.licenseEndDateIst.replace(/\s*\(IST\)/gi, '').trim() : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Days Remaining:</span>
                  <span className={`font-bold ${orgProfile?.isExpired ? 'text-red-600' : 'text-amber-600'}`}>
                    {orgProfile?.daysRemaining !== null ? `${orgProfile.daysRemaining} days` : '0 days'}
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
                <strong>Next Steps:</strong> Please reach out to your system super administrator or account executive to renew or upgrade your academy's license tier.
              </div>
            </div>
          </Modal>
        )}
      </main>

      <ProfileEditModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
};
