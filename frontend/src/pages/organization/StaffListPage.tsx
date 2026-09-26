import { formatLocal } from '../../utils/dateTimeUtils';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Card, Input, Select, Modal, message, Alert, Tooltip, Tag } from 'antd';
import { Plus, Search, Edit2, KeyRound, Copy, Check, Shield, Sparkles, QrCode, Crown, RotateCcw } from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';
import { RbaPageHeader } from '../../components/common/RbaPageHeader';
import { RbaStatusBadge } from '../../components/common/RbaStatusBadge';
import { UserAvatar } from '../../components/common/UserAvatar';
import { UserCreateEditModal } from '../../components/modals/UserCreateEditModal';
import { RolePermissionsModal } from '../../components/modals/RolePermissionsModal';
import { StaffInviteModal } from '../../components/modals/StaffInviteModal';
import { SecureStorageService } from '../../services/storage/SecureStorageService';

export const StaffListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Bulk Staff Invite & Role Rights Modals
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [rolePermsModalOpen, setRolePermsModalOpen] = useState(false);

  // Reset Password State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetStaff, setResetTargetStaff] = useState<any>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [resetResult, setResetResult] = useState<{ password: string; email: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Real-time Authenticated Profile & Permission Sync
  const { data: profileRes } = useQuery({
    queryKey: ['authenticated-user-profile'],
    queryFn: async () => {
      const res = await ApiClient.get('/auth/GetAuthenticatedUserProfile');
      return res.data?.data;
    },
    staleTime: 15000,
  });

  const session = SecureStorageService.GetDecryptedValue<any>('session');
  const currentUser = session?.user;
  const effectiveUser = profileRes || currentUser;

  const isOwnerOrAdmin =
    effectiveUser?.isSuperAdmin ||
    effectiveUser?.is_super_admin ||
    ['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'].includes(effectiveUser?.role || effectiveUser?.role_id || '');

  let rawPerms = effectiveUser?.permissions || effectiveUser?.member_permissions;
  if (typeof rawPerms === 'string') {
    try {
      rawPerms = JSON.parse(rawPerms);
    } catch {
      rawPerms = {};
    }
  }

  const canManageStaff = isOwnerOrAdmin || Boolean(rawPerms?.can_manage_staff);
  const canManageBulkStaff = isOwnerOrAdmin || Boolean(rawPerms?.can_manage_bulk_staff) || Boolean(rawPerms?.can_manage_staff);

  const { data, isLoading } = useQuery({
    queryKey: ['staff-list', page, pageSize, search, roleFilter, statusFilter],
    queryFn: async () => {
      const res = await ApiClient.get(
        `/staff/GetStaffList?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}&roleId=${encodeURIComponent(roleFilter)}&status=${encodeURIComponent(statusFilter)}`
      );
      return res.data;
    },
  });

  const resetMutation = useMutation({
    mutationFn: async ({ staffUserId, newPassword }: { staffUserId: string; newPassword?: string }) => {
      const res = await ApiClient.post('/staff/ResetStaffPassword', {
        staffUserId,
        newPassword: newPassword || undefined,
      });
      return res.data;
    },
    onSuccess: (res) => {
      setResetResult({
        password: res.data?.temporaryPassword,
        email: resetTargetStaff.email,
        name: `${resetTargetStaff.first_name} ${resetTargetStaff.last_name}`.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      message.success('Staff password has been reset.');
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to reset password.');
    },
  });

  const handleOpenReset = (staff: any) => {
    setResetTargetStaff(staff);
    setCustomPassword('');
    setResetResult(null);
    setCopied(false);
    setResetModalOpen(true);
  };

  const handleExecuteReset = () => {
    if (!resetTargetStaff) return;
    resetMutation.mutate({
      staffUserId: resetTargetStaff.user_id,
      newPassword: customPassword.trim() ? customPassword.trim() : undefined,
    });
  };

  const handleOpenEdit = (staff: any) => {
    setSelectedStaff(staff);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleOpenCreate = () => {
    setSelectedStaff(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const copyResetPassword = () => {
    if (!resetResult) return;
    const text = `Staff Password Reset\nLogin Email: ${resetResult.email}\nNew Password: ${resetResult.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    message.success('Password copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const renderPermissionBadges = (record: any) => {
    const isOwner = Boolean(record.is_primary_owner) || record.role_id === 'ORGANIZATION_OWNER';
    if (isOwner) {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300 inline-flex items-center gap-1">
          <Crown className="w-3 h-3 text-amber-700" />
          Permanent Full Tenant Authority
        </span>
      );
    }

    if (record.role_id === 'ORGANIZATION_ADMIN') {
      return (
        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 text-[10px] font-semibold border border-indigo-200 inline-flex items-center gap-1">
          <Shield className="w-3 h-3 text-indigo-700" />
          Full Operational Access (PA Delegated)
        </span>
      );
    }

    let perms = record.permissions || {};
    if (typeof perms === 'string') {
      try {
        perms = JSON.parse(perms);
      } catch {
        perms = {};
      }
    }
    const badges: { label: string; enabled: boolean; color: string }[] = [
      { label: 'Edit Students', enabled: Boolean(perms.can_edit_students), color: 'bg-blue-50 text-blue-700 border-blue-200' },
      { label: 'Reset Passwords', enabled: Boolean(perms.can_reset_student_passwords), color: 'bg-amber-50 text-amber-700 border-amber-200' },
      { label: 'Courses', enabled: Boolean(perms.can_manage_courses), color: 'bg-purple-50 text-purple-700 border-purple-200' },
      { label: 'Campaigns', enabled: Boolean(perms.can_manage_campaigns), color: 'bg-rose-50 text-rose-700 border-rose-200' },
      { label: 'Manage Staff', enabled: Boolean(perms.can_manage_staff), color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      { label: 'Bulk Links & QR', enabled: Boolean(perms.can_manage_bulk_staff), color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
      { label: 'Reports', enabled: Boolean(perms.can_view_reports), color: 'bg-teal-50 text-teal-700 border-teal-200' },
    ];

    const active = badges.filter((b) => b.enabled);
    if (active.length === 0) {
      return <span className="text-[11px] text-gray-400 italic">No elevated rights</span>;
    }

    return (
      <div className="flex flex-wrap gap-1 max-w-xs">
        {active.map((b) => (
          <span key={b.label} className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${b.color}`}>
            {b.label}
          </span>
        ))}
      </div>
    );
  };

  const columns = [
    {
      title: 'Staff Member',
      key: 'name',
      render: (_: any, record: any) => {
        const isOwner = Boolean(record.is_primary_owner) || record.role_id === 'ORGANIZATION_OWNER';
        const isPA = Boolean(record.is_delegated_admin) || (record.role_id === 'ORGANIZATION_ADMIN' && !isOwner);

        return (
          <div className="flex items-center gap-3">
            <UserAvatar
              src={record.avatar_url}
              name={`${record.first_name} ${record.last_name}`}
              email={record.email}
              status={record.status}
              size="md"
              onClick={canManageStaff ? () => handleOpenEdit(record) : undefined}
            />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm text-[#111111]">
                  {record.first_name} {record.last_name}
                </span>
                {isOwner && (
                  <Tag color="gold" className="text-[10px] font-bold uppercase border-amber-300 bg-amber-50 text-amber-900 inline-flex items-center gap-1 m-0">
                    <Crown className="w-3 h-3 text-amber-600" />
                    Primary Owner
                  </Tag>
                )}
                {isPA && (
                  <Tag color="purple" className="text-[10px] font-semibold uppercase border-purple-200 bg-purple-50 text-purple-800 inline-flex items-center gap-1 m-0">
                    <Shield className="w-3 h-3 text-purple-600" />
                    PA / Delegated Admin
                  </Tag>
                )}
              </div>
              <div className="text-xs text-gray-500">{record.email}</div>
              {isOwner ? (
                <div className="text-[10px] text-amber-700 font-medium flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                  Matches Super Admin Login User ID (Owner)
                </div>
              ) : isPA ? (
                <div className="text-[10px] text-purple-700 font-medium mt-0.5">
                  Full Access (Subordinate to Primary Owner)
                </div>
              ) : (
                <div className="text-[11px] font-mono text-gray-400 mt-0.5">UID: {record.user_id}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Role',
      dataIndex: 'role_name',
      key: 'role_name',
      render: (role: string, record: any) => {
        const isOwner = Boolean(record.is_primary_owner) || record.role_id === 'ORGANIZATION_OWNER';
        const isPA = Boolean(record.is_delegated_admin) || (record.role_id === 'ORGANIZATION_ADMIN' && !isOwner);

        if (isOwner) {
          return (
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-100/80 text-amber-900 border border-amber-300 inline-flex items-center gap-1 shadow-sm">
              <Crown className="w-3 h-3 text-amber-700" />
              Organization Owner
            </span>
          );
        }
        if (isPA) {
          return (
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 inline-flex items-center gap-1">
              <Shield className="w-3 h-3 text-indigo-600" />
              Organization Admin (PA)
            </span>
          );
        }
        return (
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-gray-800 border border-gray-200">
            {role || record.role_id}
          </span>
        );
      },
    },
    {
      title: 'Page Control Rights',
      key: 'permissions',
      render: (_: any, record: any) => renderPermissionBadges(record),
    },
    {
      title: 'Last Active (Local)',
      key: 'last_active',
      render: (_: any, record: any) => (
        <div>
          <div className="text-xs text-gray-700 font-medium">
            {record.last_login_at ? formatLocal(record.last_login_at, 'DD MMM YYYY, hh:mm A') : 'Never logged in'}
          </div>
          {record.last_login_at_utc && (
            <div className="text-[10px] text-gray-400">UTC: {record.last_login_at_utc}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Last Login IP',
      dataIndex: 'last_login_ip',
      key: 'last_login_ip',
      render: (ip: string) =>
        ip ? (
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
            {ip}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <RbaStatusBadge status={status} />,
    },
    ...(canManageStaff
      ? [
          {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: any) => {
              const isTargetOwner = Boolean(record.is_primary_owner) || record.role_id === 'ORGANIZATION_OWNER';
              const isTargetAdmin = record.role_id === 'ORGANIZATION_ADMIN';
              const isCurrentOwnerOrSuper =
                effectiveUser?.isSuperAdmin ||
                effectiveUser?.is_super_admin ||
                ['ORGANIZATION_OWNER'].includes(effectiveUser?.role || effectiveUser?.role_id || '');
              const isCurrentSameUser = (effectiveUser?.userId || effectiveUser?.id || currentUser?.id) === record.user_id;

              // Primary Owner created by Super Admin cannot be edited or reset by subordinate staff / PAs
              if (isTargetOwner && !isCurrentOwnerOrSuper) {
                return (
                  <Tooltip title="The Primary Organization Owner account is protected and cannot be modified by subordinate administrators or staff.">
                    <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium inline-flex items-center gap-1 cursor-not-allowed">
                      <Shield className="w-3 h-3 text-amber-600" />
                      Owner Protected
                    </span>
                  </Tooltip>
                );
              }

              // Delegated Admin (PA) cannot be modified by another delegated Admin
              if (isTargetAdmin && !isCurrentOwnerOrSuper && !isCurrentSameUser) {
                return (
                  <Tooltip title="Delegated Administrator accounts can only be modified by the Primary Organization Owner or Super Admin.">
                    <span className="text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-medium inline-flex items-center gap-1 cursor-not-allowed">
                      <Shield className="w-3 h-3 text-indigo-600" />
                      Admin Protected
                    </span>
                  </Tooltip>
                );
              }

              return (
                <div className="flex items-center gap-1.5">
                  <Tooltip title={isTargetOwner ? 'Edit Organization Owner' : isTargetAdmin ? 'Modify or Demote PA / Admin Access' : 'Edit Staff & Permissions'}>
                    <Button
                      size="small"
                      type="text"
                      className="text-gray-600 hover:text-black hover:bg-gray-100"
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenEdit(record)}
                    />
                  </Tooltip>

                  <Tooltip title={isTargetOwner ? 'Reset Owner Password' : isTargetAdmin ? 'Reset PA / Admin Password' : 'Reset Staff Password'}>
                    <Button
                      size="small"
                      type="text"
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      icon={<KeyRound className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenReset(record)}
                    />
                  </Tooltip>
                </div>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <div>
      <RbaPageHeader
        title="Staff Directory"
        subtitle="Manage instructors, content managers, reviewers, and organization administrators with granular switch rights"
        action={
          (canManageStaff || canManageBulkStaff) ? (
            <div className="flex flex-wrap items-center gap-2">
              {canManageBulkStaff && (
                <Button
                  icon={<QrCode className="w-4 h-4 text-indigo-600" />}
                  onClick={() => setInviteModalOpen(true)}
                  className="font-medium"
                >
                  Bulk Staff Links & QR
                </Button>
              )}
              {canManageStaff && (
                <>
                  <Button
                    icon={<Shield className="w-4 h-4 text-emerald-600" />}
                    onClick={() => setRolePermsModalOpen(true)}
                    className="font-medium"
                  >
                    Role Rights & Defaults
                  </Button>
                  <Button
                    type="primary"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleOpenCreate}
                  >
                    Add Staff Member
                  </Button>
                </>
              )}
            </div>
          ) : undefined
        }
      />

      <Card className="!rounded-xl border border-[#e5e5e5]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="w-full sm:w-64">
              <Input
                prefix={<Search className="w-4 h-4 text-gray-400 mr-1" />}
                placeholder="Search staff by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                allowClear
              />
            </div>

            <Select
              value={roleFilter}
              onChange={(val) => {
                setRoleFilter(val);
                setPage(1);
              }}
              style={{ width: 175 }}
              options={[
                { label: 'All Roles', value: 'ALL' },
                { label: 'Primary Owner', value: 'ORGANIZATION_OWNER' },
                { label: 'Organization Admin', value: 'ORGANIZATION_ADMIN' },
                { label: 'Instructor', value: 'INSTRUCTOR' },
                { label: 'Content Manager', value: 'CONTENT_MANAGER' },
                { label: 'Manager', value: 'MANAGER' },
                { label: 'Reviewer', value: 'REVIEWER' },
                { label: 'Support Staff', value: 'SUPPORT_STAFF' },
              ]}
            />

            <Select
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              style={{ width: 140 }}
              options={[
                { label: 'All Statuses', value: 'ALL' },
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Suspended', value: 'SUSPENDED' },
              ]}
            />

            {(search || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <Button
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => {
                  setSearch('');
                  setRoleFilter('ALL');
                  setStatusFilter('ALL');
                  setPage(1);
                }}
              >
                Reset
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-500 font-medium">
            Total Staff: <span className="font-bold text-gray-800">{data?.pagination?.totalRecords || data?.data?.length || 0}</span>
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="membership_id"
          loading={isLoading}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.pagination?.totalRecords || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '30', '50'],
            showQuickJumper: true,
            showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total} staff members`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      <UserCreateEditModal
        open={modalOpen}
        mode={modalMode}
        userType="staff"
        initialData={selectedStaff}
        onClose={() => setModalOpen(false)}
      />

      <RolePermissionsModal
        open={rolePermsModalOpen}
        onClose={() => setRolePermsModalOpen(false)}
      />

      <StaffInviteModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />

      {/* Reset Staff Password Modal */}
      <Modal
        open={resetModalOpen}
        title={
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-600" />
            <span>Reset Staff Member Password</span>
          </div>
        }
        onCancel={() => {
          setResetModalOpen(false);
          setResetResult(null);
        }}
        footer={
          resetResult
            ? [
                <Button key="copy" type="primary" icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} onClick={copyResetPassword}>
                  {copied ? 'Copied' : 'Copy New Password'}
                </Button>,
                <Button key="close" onClick={() => setResetModalOpen(false)}>
                  Close
                </Button>,
              ]
            : [
                <Button key="cancel" onClick={() => setResetModalOpen(false)}>
                  Cancel
                </Button>,
                <Button
                  key="submit"
                  type="primary"
                  loading={resetMutation.isPending}
                  onClick={handleExecuteReset}
                >
                  Confirm Password Reset
                </Button>,
              ]
        }
      >
        {resetResult ? (
          <div className="py-3">
            <Alert
              type="success"
              showIcon
              message="Password Successfully Reset"
              description="Any active sessions on other devices or tabs for this staff member have been terminated."
              className="mb-4"
            />
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
              <div>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Staff Member</span>
                <div className="font-semibold text-gray-800 text-sm">{resetResult.name}</div>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Login Email</span>
                <div className="font-mono text-sm text-gray-900 bg-white p-2 rounded border border-gray-200 select-all">
                  {resetResult.email}
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Temporary Password</span>
                <div className="font-mono text-sm font-semibold text-emerald-700 bg-emerald-50/50 p-2 rounded border border-emerald-200 select-all">
                  {resetResult.password}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2 space-y-4">
            <p className="text-sm text-gray-600">
              You are resetting the password for{' '}
              <strong className="text-gray-900">
                {resetTargetStaff?.first_name} {resetTargetStaff?.last_name}
              </strong>{' '}
              ({resetTargetStaff?.email}).
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Custom Password (Optional)
              </label>
              <Input.Password
                placeholder="Leave blank to auto-generate a secure password"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
              />
              <span className="text-xs text-gray-500 flex items-center gap-1 mt-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                If left blank, the system will generate a strong 12-character random password.
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

