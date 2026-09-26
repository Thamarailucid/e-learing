import { formatLocal } from '../../utils/dateTimeUtils';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Card, Input, Select, Modal, Form, message, Alert, Tooltip } from 'antd';
import { Plus, Search, Edit2, KeyRound, Copy, Check, ShieldAlert, Sparkles, UserCheck, QrCode, RotateCcw } from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';
import { RbaPageHeader } from '../../components/common/RbaPageHeader';
import { RbaStatusBadge } from '../../components/common/RbaStatusBadge';
import { UserAvatar } from '../../components/common/UserAvatar';
import { UserCreateEditModal } from '../../components/modals/UserCreateEditModal';
import { OrgStudentInviteModal } from '../../components/modals/OrgStudentInviteModal';
import { SecureStorageService } from '../../services/storage/SecureStorageService';

export const StudentListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [enrollmentFilter, setEnrollmentFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Reset Password State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetStudent, setResetTargetStudent] = useState<any>(null);
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

  // Strict Page Control Permissions
  const canEditStudents = isOwnerOrAdmin || Boolean(rawPerms?.can_edit_students);
  const canResetPasswords = isOwnerOrAdmin || Boolean(rawPerms?.can_reset_student_passwords);

  const { data, isLoading } = useQuery({
    queryKey: ['student-list', page, pageSize, search, statusFilter, enrollmentFilter],
    queryFn: async () => {
      const res = await ApiClient.get(
        `/students/GetStudentList?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}&enrollmentFilter=${encodeURIComponent(enrollmentFilter)}`
      );
      return res.data;
    },
  });

  const resetMutation = useMutation({
    mutationFn: async ({ studentUserId, newPassword }: { studentUserId: string; newPassword?: string }) => {
      const res = await ApiClient.post('/students/ResetStudentPassword', {
        studentUserId,
        newPassword: newPassword || undefined,
      });
      return res.data;
    },
    onSuccess: (res) => {
      setResetResult({
        password: res.data?.temporaryPassword,
        email: resetTargetStudent.email,
        name: `${resetTargetStudent.first_name} ${resetTargetStudent.last_name}`.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ['student-list'] });
      message.success('Student password has been reset.');
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to reset password.');
    },
  });

  const handleOpenReset = (student: any) => {
    setResetTargetStudent(student);
    setCustomPassword('');
    setResetResult(null);
    setCopied(false);
    setResetModalOpen(true);
  };

  const handleExecuteReset = () => {
    if (!resetTargetStudent) return;
    resetMutation.mutate({
      studentUserId: resetTargetStudent.user_id,
      newPassword: customPassword.trim() ? customPassword.trim() : undefined,
    });
  };

  const handleOpenEdit = (student: any) => {
    setSelectedStudent(student);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleOpenCreate = () => {
    setSelectedStudent(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const copyResetPassword = () => {
    if (!resetResult) return;
    const text = `Student Password Reset\nLogin Email: ${resetResult.email}\nNew Password: ${resetResult.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    message.success('Password copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const columns = [
    {
      title: 'Student (Learner)',
      key: 'name',
      render: (_: any, record: any) => (
        <div className="flex items-center gap-3">
          <UserAvatar
            src={record.avatar_url}
            name={`${record.first_name} ${record.last_name}`}
            email={record.email}
            status={record.status}
            size="md"
            onClick={canEditStudents ? () => handleOpenEdit(record) : undefined}
          />
          <div>
            <div className="font-semibold text-sm text-[#111111]">
              {record.first_name} {record.last_name}
            </div>
            <div className="text-xs text-gray-500">{record.email}</div>
            <div className="text-[11px] font-mono text-gray-400 mt-0.5">UID: {record.user_id}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => (
        <span className="text-xs text-gray-600">{phone || '—'}</span>
      ),
    },
    {
      title: 'Enrolled Courses',
      dataIndex: 'enrolled_courses_count',
      key: 'enrolled_courses_count',
      render: (val: number) => <span className="text-xs font-semibold">{val || 0}</span>,
    },
    {
      title: 'Certificates',
      dataIndex: 'certificates_count',
      key: 'certificates_count',
      render: (val: number) => <span className="text-xs font-semibold text-amber-600">{val || 0}</span>,
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
    // Actions column: only rendered if user has at least edit or reset permission
    ...(canEditStudents || canResetPasswords
      ? [
          {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: any) => (
              <div className="flex items-center gap-1.5">
                {/* STRICT PAGE CONTROL: Only render edit button if canEditStudents is true! */}
                {canEditStudents && (
                  <Tooltip title="Edit Student Details">
                    <Button
                      size="small"
                      type="text"
                      className="text-gray-600 hover:text-black hover:bg-gray-100"
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenEdit(record)}
                    />
                  </Tooltip>
                )}

                {/* STRICT PAGE CONTROL: Only render reset password button if canResetPasswords is true! */}
                {canResetPasswords && (
                  <Tooltip title="Reset Student Password">
                    <Button
                      size="small"
                      type="text"
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      icon={<KeyRound className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenReset(record)}
                    />
                  </Tooltip>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <RbaPageHeader
        title="Students & Learners"
        subtitle="Manage enrolled students, login credentials, course access entitlements, and progress tracking"
        action={
          <div className="flex items-center gap-2">
            <Button
              icon={<QrCode className="w-4 h-4 text-indigo-600" />}
              onClick={() => setInviteModalOpen(true)}
            >
              Registration Link & QR
            </Button>
            {canEditStudents && (
              <Button
                type="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleOpenCreate}
              >
                Enroll New Student
              </Button>
            )}
          </div>
        }
      />

      {/* Notice if staff member has restricted permissions */}
      {!canEditStudents && (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message="Restricted Permission View"
          description="Your account role does not have the 'Edit Student Details' permission switch enabled. Student edit controls are hidden according to organization access policies."
        />
      )}

      <Card className="!rounded-xl border border-[#e5e5e5]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="w-full sm:w-64">
              <Input
                prefix={<Search className="w-4 h-4 text-gray-400 mr-1" />}
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                allowClear
              />
            </div>

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

            <Select
              value={enrollmentFilter}
              onChange={(val) => {
                setEnrollmentFilter(val);
                setPage(1);
              }}
              style={{ width: 175 }}
              options={[
                { label: 'All Enrollments', value: 'ALL' },
                { label: 'Enrolled (≥1 Course)', value: 'ENROLLED' },
                { label: 'Not Enrolled (0 Courses)', value: 'NOT_ENROLLED' },
              ]}
            />

            {(search || statusFilter !== 'ALL' || enrollmentFilter !== 'ALL') && (
              <Button
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                  setEnrollmentFilter('ALL');
                  setPage(1);
                }}
              >
                Reset
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-500 font-medium">
            Total Learners: <span className="font-bold text-gray-800">{data?.pagination?.totalRecords || data?.data?.length || 0}</span>
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
            showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total} learners`,
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
        userType="student"
        initialData={selectedStudent}
        onClose={() => setModalOpen(false)}
      />

      {/* Reset Student Password Modal */}
      <Modal
        open={resetModalOpen}
        title={
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-600" />
            <span>Reset Student Password</span>
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
              description="Any active sessions on other devices or tabs for this student have been terminated."
              className="mb-4"
            />
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
              <div>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Learner</span>
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
                {resetTargetStudent?.first_name} {resetTargetStudent?.last_name}
              </strong>{' '}
              ({resetTargetStudent?.email}).
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

      <OrgStudentInviteModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        orgSlug={effectiveUser?.activeOrganizationSlug || effectiveUser?.organization_slug || 'apex-academy'}
        orgName={effectiveUser?.activeOrganizationName || effectiveUser?.organization_name || 'Apex Coding Academy'}
      />
    </div>
  );
};

