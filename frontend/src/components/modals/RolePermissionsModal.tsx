import React, { useState, useEffect } from 'react';
import { Modal, Select, Switch, Button, Tag, message, Spin, Card } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  CheckCheck,
  XCircle,
  RotateCcw,
  Sparkles,
  Save,
  BookOpen,
  Share2,
  Users,
  KeyRound,
  UserCog,
  QrCode,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';

interface RolePermissionsModalProps {
  open: boolean;
  onClose: () => void;
}

const AVAILABLE_ROLES = [
  { id: 'INSTRUCTOR', name: 'Instructor' },
  { id: 'CONTENT_MANAGER', name: 'Content Manager' },
  { id: 'MANAGER', name: 'Manager' },
  { id: 'REVIEWER', name: 'Reviewer' },
  { id: 'ORGANIZATION_ADMIN', name: 'Organization Admin (Full Rights)' },
];

export const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>('INSTRUCTOR');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    can_manage_courses: true,
    can_manage_campaigns: true,
    can_manage_staff: false,
    can_manage_bulk_staff: false,
    can_edit_students: false,
    can_reset_student_passwords: false,
    can_view_reports: true,
  });

  // Fetch all role templates for this organization
  const { data: roleTemplates = [], isLoading } = useQuery({
    queryKey: ['role-permissions-list'],
    queryFn: async () => {
      const res = await ApiClient.get('/staff/GetRolePermissionsList');
      return res.data?.data || [];
    },
    enabled: open,
  });

  // Whenever selectedRole or templates change, update state
  useEffect(() => {
    if (roleTemplates.length > 0) {
      const found = roleTemplates.find((r: any) => r.roleId === selectedRole);
      if (found?.permissions) {
        setPermissions(found.permissions);
      }
    }
  }, [selectedRole, roleTemplates]);

  const updateMutation = useMutation({
    mutationFn: async ({ roleId, perms }: { roleId: string; perms: Record<string, boolean> }) => {
      return ApiClient.put(`/staff/UpdateRolePermissions/${roleId}`, { permissions: perms });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions-list'] });
      message.success(`Default page control rights for role updated successfully!`);
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to update role permissions.');
    },
  });

  const handleSwitchChange = (key: string, val: boolean) => {
    setPermissions((prev) => {
      const updated = { ...prev, [key]: val };

      // Mutual dependency: Campaign requires Courses
      if (key === 'can_manage_campaigns' && val) {
        updated.can_manage_courses = true;
        message.info('Course Management was automatically enabled to support College Outreach.');
      } else if (key === 'can_manage_courses' && !val) {
        updated.can_manage_campaigns = false;
      }

      // Mutual dependency: Bulk Staff requires Staff Management
      if (key === 'can_manage_bulk_staff' && val) {
        updated.can_manage_staff = true;
        message.info('Staff Member Management was automatically enabled to support Bulk Staff Links & QR.');
      } else if (key === 'can_manage_staff' && !val) {
        updated.can_manage_bulk_staff = false;
      }

      return updated;
    });
  };

  const handleGrantAll = () => {
    setPermissions({
      can_edit_students: true,
      can_reset_student_passwords: true,
      can_manage_courses: true,
      can_manage_campaigns: true,
      can_manage_staff: true,
      can_manage_bulk_staff: true,
      can_view_reports: true,
    });
  };

  const handleRevokeAll = () => {
    setPermissions({
      can_edit_students: false,
      can_reset_student_passwords: false,
      can_manage_courses: false,
      can_manage_campaigns: false,
      can_manage_staff: false,
      can_manage_bulk_staff: false,
      can_view_reports: false,
    });
  };

  const activeCount = Object.values(permissions).filter(Boolean).length;
  const isFullAdminRole = selectedRole === 'ORGANIZATION_ADMIN';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnHidden
      title={
        <div className="flex items-center gap-2.5 pr-6">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-gray-900">
              Role Permissions & Page Control Templates
            </div>
            <div className="text-xs text-gray-500 font-normal">
              Configure default page control rights per assigned role. Automatically pre-fills when adding staff or generating QR invite links.
            </div>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div className="py-12 text-center">
          <Spin size="large" />
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {/* Role Dropdown Selector */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                Select Assigned Role
              </label>
              <span className="text-xs text-gray-500">
                Choose the staff role to view or customize its default permissions.
              </span>
            </div>

            <Select
              value={selectedRole}
              onChange={setSelectedRole}
              className="w-full sm:w-64"
              size="large"
            >
              {AVAILABLE_ROLES.map((r) => (
                <Select.Option key={r.id} value={r.id}>
                  {r.name}
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* Controls & Badges Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag color={activeCount > 0 ? 'purple' : 'default'} className="font-semibold text-xs py-0.5 px-2.5 m-0">
                {`${activeCount} of 7 Rights Active`}
              </Tag>
              {isFullAdminRole && (
                <Tag color="green" className="text-xs font-semibold m-0">
                  Full Authority
                </Tag>
              )}
            </div>

            {!isFullAdminRole && (
              <div className="flex items-center gap-2">
                <Button
                  size="small"
                  icon={<CheckCheck className="w-3.5 h-3.5" />}
                  onClick={handleGrantAll}
                  className="text-xs text-blue-700 bg-blue-50 border-blue-200"
                >
                  Grant All
                </Button>
                <Button
                  size="small"
                  icon={<XCircle className="w-3.5 h-3.5" />}
                  onClick={handleRevokeAll}
                  className="text-xs text-gray-600 bg-white border-gray-200"
                >
                  Revoke All
                </Button>
              </div>
            )}
          </div>

          {/* The 6 Granular Switches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 1. Edit Students */}
            <div className="p-3.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between shadow-xs">
              <div className="flex items-start gap-2.5 pr-2">
                <Users className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-gray-800">Edit Student Details</div>
                  <div className="text-[11px] text-gray-500">Show edit pencil icon & allow modifying student profiles</div>
                </div>
              </div>
              <Switch
                size="small"
                checked={Boolean(permissions.can_edit_students)}
                disabled={isFullAdminRole}
                onChange={(val) => handleSwitchChange('can_edit_students', val)}
              />
            </div>

            {/* 2. Reset Student Passwords */}
            <div className="p-3.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between shadow-xs">
              <div className="flex items-start gap-2.5 pr-2">
                <KeyRound className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-gray-800">Reset Student Passwords</div>
                  <div className="text-[11px] text-gray-500">Allow generating temporary passwords for students</div>
                </div>
              </div>
              <Switch
                size="small"
                checked={Boolean(permissions.can_reset_student_passwords)}
                disabled={isFullAdminRole}
                onChange={(val) => handleSwitchChange('can_reset_student_passwords', val)}
              />
            </div>

            {/* 3. Course Management */}
            <div className="p-3.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between shadow-xs">
              <div className="flex items-start gap-2.5 pr-2">
                <BookOpen className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-gray-800">Course Management</div>
                  <div className="text-[11px] text-gray-500">Create courses, upload videos, edit curriculum & publish</div>
                </div>
              </div>
              <Switch
                size="small"
                checked={Boolean(permissions.can_manage_courses)}
                disabled={isFullAdminRole}
                onChange={(val) => handleSwitchChange('can_manage_courses', val)}
              />
            </div>

            {/* 4. College Outreach & Campaign Links */}
            <div className="p-3.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between shadow-xs">
              <div className="flex items-start gap-2.5 pr-2">
                <Share2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                    <span>College Outreach & Campaigns</span>
                    <Tag color="purple" className="text-[10px] m-0 py-0 px-1 font-normal">
                      Requires Courses
                    </Tag>
                  </div>
                  <div className="text-[11px] text-gray-500">Generate partner college links, quotas & QR share codes</div>
                </div>
              </div>
              <Switch
                size="small"
                checked={Boolean(permissions.can_manage_campaigns)}
                disabled={isFullAdminRole}
                onChange={(val) => handleSwitchChange('can_manage_campaigns', val)}
              />
            </div>

            {/* 5. Staff Management */}
            <div className="p-3.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between shadow-xs">
              <div className="flex items-start gap-2.5 pr-2">
                <UserCog className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-gray-800">Staff Member Management</div>
                  <div className="text-[11px] text-gray-500">Create, edit, reset passwords, and manage permissions for staff</div>
                </div>
              </div>
              <Switch
                size="small"
                checked={Boolean(permissions.can_manage_staff)}
                disabled={isFullAdminRole}
                onChange={(val) => handleSwitchChange('can_manage_staff', val)}
              />
            </div>

            {/* 6. Bulk Staff Links & QR */}
            <div className="p-3.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between shadow-xs">
              <div className="flex items-start gap-2.5 pr-2">
                <QrCode className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                    <span>Bulk Staff & User Invite Links (QR)</span>
                    <Tag color="cyan" className="text-[10px] m-0 py-0 px-1 font-normal">
                      Requires Staff
                    </Tag>
                  </div>
                  <div className="text-[11px] text-gray-500">Generate bulk self-registration links and scannable QR codes for staff</div>
                </div>
              </div>
              <Switch
                size="small"
                checked={Boolean(permissions.can_manage_bulk_staff)}
                disabled={isFullAdminRole}
                onChange={(val) => handleSwitchChange('can_manage_bulk_staff', val)}
              />
            </div>

            {/* 6. Reports & Analytics */}
            <div className="p-3.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between shadow-xs">
              <div className="flex items-start gap-2.5 pr-2">
                <BarChart3 className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-gray-800">View Reports & Analytics</div>
                  <div className="text-[11px] text-gray-500">Access completion rates, revenue & student analytics</div>
                </div>
              </div>
              <Switch
                size="small"
                checked={Boolean(permissions.can_view_reports)}
                disabled={isFullAdminRole}
                onChange={(val) => handleSwitchChange('can_view_reports', val)}
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Changes will immediately update default rights for any newly registered or created staff under this role.
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onClose}>Close</Button>
              <Button
                type="primary"
                icon={<Save className="w-4 h-4" />}
                loading={updateMutation.isPending}
                disabled={isFullAdminRole}
                onClick={() => updateMutation.mutate({ roleId: selectedRole, perms: permissions })}
                className="!bg-black font-medium"
              >
                Save Role Defaults
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
