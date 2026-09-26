import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Building2, ShieldAlert, LogOut, Menu, Shield } from 'lucide-react';
import { Button, Drawer } from 'antd';
import { ApiClient } from '../services/api/ApiClient';
import { SecureStorageService } from '../services/storage/SecureStorageService';
import { UserAvatar } from '../components/common/UserAvatar';
import { ProfileEditModal } from '../components/modals/ProfileEditModal';

export const SuperAdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const session = SecureStorageService.GetDecryptedValue<any>('session');

  const { data: profileRes } = useQuery({
    queryKey: ['authenticated-user-profile'],
    queryFn: async () => {
      const res = await ApiClient.get('/auth/GetAuthenticatedUserProfile');
      return res.data?.data;
    },
    staleTime: 15000,
  });

  const effectiveUser = profileRes || session?.user;

  const handleLogout = () => {
    SecureStorageService.ClearEncryptedStorage();
    navigate('/login');
  };

  const navItems = [
    { label: 'Platform Dashboard', to: '/super-admin/dashboard', icon: LayoutDashboard },
    { label: 'Organizations', to: '/super-admin/organizations', icon: Building2 },
    { label: 'System Audit Logs', to: '/super-admin/audit-logs', icon: ShieldAlert },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#fafafa] w-full max-w-full overflow-x-hidden">
      {/* Mobile Top Header (Screens < 1024px) */}
      <header className="lg:hidden px-4 py-3 bg-[#0a0a0a] text-white border-b border-[#262626] flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="p-1.5 rounded-xl hover:bg-white/10 text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center font-bold text-sm">
              R
            </div>
            <span className="font-bold text-sm truncate max-w-[180px] sm:max-w-[260px]">
              Novacodex Super Admin
            </span>
          </div>
        </div>

        <div
          onClick={() => setProfileModalOpen(true)}
          className="flex items-center gap-2 cursor-pointer"
          title="Edit Super Admin Profile"
        >
          <UserAvatar
            src={effectiveUser?.avatarUrl || effectiveUser?.avatar_url || session?.user?.avatarUrl}
            name={`${effectiveUser?.firstName || 'Super'} ${effectiveUser?.lastName || 'Admin'}`}
            email={effectiveUser?.email || session?.user?.email}
            size="sm"
            showTooltip={false}
          />
        </div>
      </header>

      {/* Mobile Slide-out Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2.5 text-white">
            <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center font-bold text-sm">
              R
            </div>
            <span className="text-sm font-bold truncate">Novacodex Platform</span>
          </div>
        }
        placement="left"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        width={280}
        styles={{ body: { padding: '16px', backgroundColor: '#0a0a0a', color: '#ffffff' }, header: { backgroundColor: '#0a0a0a', borderBottom: '1px solid #262626' } }}
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
                name={`${effectiveUser?.firstName || 'Super'} ${effectiveUser?.lastName || 'Admin'}`}
                email={effectiveUser?.email || session?.user?.email}
                size="md"
                showTooltip={false}
              />
              <div className="overflow-hidden flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {effectiveUser?.firstName || 'Super'} {effectiveUser?.lastName || 'Admin'}
                </div>
                <div className="text-[11px] text-gray-400 truncate">{effectiveUser?.email || session?.user?.email}</div>
                <div className="text-[10px] text-amber-400 font-semibold mt-0.5">Super Admin • Platform Control</div>
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

      {/* Desktop Sidebar (>= 1024px) */}
      <aside className="hidden lg:flex w-64 bg-[#0a0a0a] text-white flex-col justify-between p-4 border-r border-[#262626] sticky top-0 h-screen shrink-0">
        <div>
          <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-[#262626]">
            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold text-base">
              R
            </div>
            <div>
              <div className="font-semibold text-sm tracking-wide">Novacodex Super Admin</div>
              <div className="text-xs text-gray-400">Platform Control</div>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-[#262626] pt-4">
          <div
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-2.5 px-3 py-2 mb-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            title="Edit Super Admin Profile & Avatar Icon"
          >
            <UserAvatar
              src={effectiveUser?.avatarUrl || effectiveUser?.avatar_url || session?.user?.avatarUrl}
              name={`${effectiveUser?.firstName || effectiveUser?.first_name || 'Super'} ${effectiveUser?.lastName || effectiveUser?.last_name || 'Admin'}`}
              email={effectiveUser?.email || session?.user?.email}
              size="sm"
              showTooltip={false}
            />
            <div className="overflow-hidden flex-1 text-left">
              <div className="text-xs font-semibold text-white truncate leading-tight">
                {effectiveUser?.firstName || effectiveUser?.first_name || 'Super'} {effectiveUser?.lastName || effectiveUser?.last_name || 'Admin'}
              </div>
              <div className="text-[10px] text-gray-400 truncate mt-0.5">
                {effectiveUser?.email || session?.user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
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
