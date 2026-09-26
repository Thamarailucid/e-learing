import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  BookPlus,
  GraduationCap,
  Users,
  BarChart3,
  LogOut,
  Video,
  ShieldCheck,
  ShieldAlert,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { Button, Tooltip, Drawer } from 'antd';
import { ApiClient } from '../services/api/ApiClient';
import { SecureStorageService } from '../services/storage/SecureStorageService';
import { useTheme } from '../components/theme/ThemeProvider';
import { UserAvatar } from '../components/common/UserAvatar';
import { ProfileEditModal } from '../components/modals/ProfileEditModal';

export const InstructorLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('novacodex_instructor_sidebar_collapsed') === 'true';
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('novacodex_instructor_sidebar_collapsed', String(next));
      return next;
    });
  };

  const session = SecureStorageService.GetDecryptedValue<any>('session');
  const { orgProfile, theme } = useTheme();

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

  // Parse permissions
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

  const handleLogout = () => {
    SecureStorageService.ClearEncryptedStorage();
    navigate('/login');
  };

  const navItems: { label: string; to: string; icon: any }[] = [];

  if (canManageCourses) {
    navItems.push({ label: 'Course Builder', to: '/instructor/courses', icon: BookPlus });
  }

  if (canViewStudents) {
    navItems.push({ label: 'Students & Learners', to: '/instructor/students', icon: GraduationCap });
  }

  if (canManageStaff) {
    navItems.push({ label: 'Staff Directory', to: '/instructor/staff', icon: Users });
  }

  if (canViewReports) {
    navItems.push({ label: 'Reports & Analytics', to: '/instructor/reports', icon: BarChart3 });
  }

  const roleRaw = effectiveUser?.role || effectiveUser?.role_id || 'INSTRUCTOR';
  const roleTitle = roleRaw.replace(/_/g, ' ');

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
            {isOrgSuspended ? 'Staff Studio Suspended' : 'Instructor Account Suspended'}
          </h1>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed max-w-md mx-auto">
            {isOrgSuspended
              ? `This organization has been ${orgProfile?.status?.toLowerCase() || 'suspended'}. All course creation, video uploads, and instructor tools are temporarily unavailable.`
              : 'Your instructor account has been suspended by the academy administrator. You cannot manage courses, view learner enrollments, or access curriculum builders.'}
          </p>
          <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 text-xs text-left mb-6 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Academy:</span>
              <span className="font-semibold text-gray-900">{orgProfile?.name || session?.user?.activeOrganizationName || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Instructor:</span>
              <span className="font-mono text-gray-900">{effectiveUser?.email || session?.user?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Role:</span>
              <span className="font-semibold text-gray-900 capitalize">{roleTitle}</span>
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#fafafa] w-full max-w-full overflow-x-hidden">
      {/* Mobile Top Bar (Screens < 1024px) */}
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
              <Video className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm truncate max-w-[170px] sm:max-w-[240px]">
              {orgProfile?.name || 'Instructor Studio'}
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
              <Video className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold truncate">
              {orgProfile?.name || 'Instructor Studio'}
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
                  {effectiveUser?.firstName || 'Instructor'} {effectiveUser?.lastName || ''}
                </div>
                <div className="text-[11px] opacity-70 truncate">{effectiveUser?.email || session?.user?.email}</div>
                <div className="text-[10px] text-emerald-300 font-semibold mt-0.5">Edit Profile & Avatar →</div>
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
          {/* Header & Toggle Switch */}
          <div className="flex items-center justify-between px-2 py-3 mb-4 border-b border-white/10">
            {!collapsed ? (
              <div className="flex items-center gap-3 overflow-hidden">
                {orgProfile?.logoUrl ? (
                  <img
                    src={orgProfile.logoUrl}
                    alt={orgProfile.name || 'Logo'}
                    className="h-8 max-w-[110px] object-contain rounded shrink-0"
                  />
                ) : (
                  <div
                    style={{ backgroundColor: theme.primaryColor || '#000000' }}
                    className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-sm border border-white/20 shrink-0"
                  >
                    {orgProfile?.name ? orgProfile.name.charAt(0).toUpperCase() : <Video className="w-4 h-4" />}
                  </div>
                )}
                <div className="overflow-hidden text-left">
                  <div className="font-semibold text-sm tracking-wide truncate">
                    {orgProfile?.name || 'Instructor Studio'}
                  </div>
                  <div className="text-xs opacity-70 capitalize truncate flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>{roleTitle}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{ backgroundColor: theme.primaryColor || '#000000' }}
                className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-sm border border-white/20 mx-auto"
              >
                {orgProfile?.name ? orgProfile.name.charAt(0).toUpperCase() : <Video className="w-4 h-4" />}
              </div>
            )}

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

          {/* Navigation Links with Tooltip */}
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Tooltip key={item.to} title={collapsed ? item.label : undefined} placement="right">
                <NavLink
                  to={item.to}
                  style={({ isActive }) =>
                    isActive
                      ? {
                          backgroundColor: 'rgba(255, 255, 255, 0.15)',
                          color: 'var(--novacodex-sidebar-text)',
                        }
                      : {
                          color: 'var(--novacodex-sidebar-text)',
                          opacity: 0.7,
                        }
                  }
                  className={({ isActive }) =>
                    `flex items-center ${collapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5'} rounded-xl text-sm font-medium transition-colors ${
                      isActive ? 'font-semibold shadow-xs' : 'hover:bg-white/10'
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
            title={collapsed ? `${effectiveUser?.firstName || 'Instructor'} ${effectiveUser?.lastName || ''} (Click to edit)` : undefined}
            placement="right"
          >
            <div
              onClick={() => setProfileModalOpen(true)}
              className={`flex items-center ${collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2'} mb-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors`}
              title="Edit Instructor Profile & Avatar Icon"
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
                    {effectiveUser?.firstName || effectiveUser?.first_name || 'Instructor'} {effectiveUser?.lastName || effectiveUser?.last_name || ''}
                  </div>
                  <div className="text-[10px] opacity-70 truncate mt-0.5">
                    {effectiveUser?.email || session?.user?.email}
                  </div>
                </div>
              )}
            </div>
          </Tooltip>

          <Tooltip title={collapsed ? 'Sign Out' : undefined} placement="right">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'} text-sm opacity-80 hover:opacity-100 hover:text-rose-400 hover:bg-white/10 rounded-xl transition-colors`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </Tooltip>
        </div>
      </aside>

      <main className="flex-1 min-w-0 w-full p-3.5 sm:p-6 lg:p-8 overflow-y-auto max-h-screen">
        <Outlet />
      </main>

      <ProfileEditModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
};
