import { formatLocal } from '../../utils/dateTimeUtils';
import React, { useState } from 'react';
import {
  Modal,
  Tabs,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Button,
  Table,
  Tag,
  Switch,
  Progress,
  message,
  Card,
  QRCode,
  Drawer,
  Tooltip,
  Select,
} from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Share2,
  Plus,
  Copy,
  Check,
  QrCode,
  Users,
  Building2,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Download,
  UserCheck,
  UserPlus,
  Shield,
  BookOpen,
  BarChart3,
  KeyRound,
  UserCog,
} from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';

interface StaffInviteModalProps {
  open: boolean;
  onClose: () => void;
}

const ROLES = [
  { id: 'INSTRUCTOR', name: 'Instructor' },
  { id: 'CONTENT_MANAGER', name: 'Content Manager' },
  { id: 'MANAGER', name: 'Manager' },
  { id: 'REVIEWER', name: 'Reviewer' },
  { id: 'ORGANIZATION_ADMIN', name: 'Organization Admin (Full Rights)' },
];

export const StaffInviteModal: React.FC<StaffInviteModalProps> = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('list');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Selected invite for QR view modal
  const [selectedQrInvite, setSelectedQrInvite] = useState<any>(null);

  // Selected invite for Enrolled Staff Drawer
  const [staffDrawerOpen, setStaffDrawerOpen] = useState(false);
  const [selectedInviteForStaff, setSelectedInviteForStaff] = useState<any>(null);

  const [form] = Form.useForm();
  const [selectedRole, setSelectedRole] = useState<string>('INSTRUCTOR');

  // 1. Fetch role permission templates
  const { data: roleTemplates = [] } = useQuery({
    queryKey: ['role-permissions-list'],
    queryFn: async () => {
      const res = await ApiClient.get('/staff/GetRolePermissionsList');
      return res.data?.data || [];
    },
    enabled: open,
  });

  // 2. Fetch staff invite links for this organization
  const { data: inviteList = [], isLoading } = useQuery({
    queryKey: ['staff-invite-list'],
    queryFn: async () => {
      const res = await ApiClient.get('/staff/GetStaffInviteList');
      return res.data?.data || [];
    },
    enabled: open,
  });

  // 3. Fetch registered staff for selected invite link
  const { data: registeredStaff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['staff-invite-registrations', selectedInviteForStaff?.id],
    queryFn: async () => {
      if (!selectedInviteForStaff?.id) return [];
      const res = await ApiClient.get(`/staff/GetStaffInviteRegistrations/${selectedInviteForStaff.id}`);
      return res.data?.data || [];
    },
    enabled: staffDrawerOpen && !!selectedInviteForStaff?.id,
  });

  const getDefaultRolePermissions = (roleId: string): Record<string, boolean> => {
    switch (roleId) {
      case 'ORGANIZATION_ADMIN':
      case 'ORGANIZATION_OWNER':
        return {
          can_manage_courses: true,
          can_manage_campaigns: true,
          can_manage_staff: true,
          can_manage_bulk_staff: true,
          can_edit_students: true,
          can_reset_student_passwords: true,
          can_view_reports: true,
        };
      case 'INSTRUCTOR':
        return {
          can_manage_courses: true,
          can_manage_campaigns: true,
          can_manage_staff: false,
          can_manage_bulk_staff: false,
          can_edit_students: false,
          can_reset_student_passwords: false,
          can_view_reports: true,
        };
      case 'CONTENT_MANAGER':
        return {
          can_manage_courses: true,
          can_manage_campaigns: false,
          can_manage_staff: false,
          can_manage_bulk_staff: false,
          can_edit_students: false,
          can_reset_student_passwords: false,
          can_view_reports: false,
        };
      case 'MANAGER':
        return {
          can_manage_courses: false,
          can_manage_campaigns: false,
          can_manage_staff: false,
          can_manage_bulk_staff: false,
          can_edit_students: true,
          can_reset_student_passwords: true,
          can_view_reports: true,
        };
      case 'REVIEWER':
      case 'SUPPORT_STAFF':
      default:
        return {
          can_manage_courses: false,
          can_manage_campaigns: false,
          can_manage_staff: false,
          can_manage_bulk_staff: false,
          can_edit_students: false,
          can_reset_student_passwords: false,
          can_view_reports: true,
        };
    }
  };

  const applyRoleToForm = (roleId: string) => {
    const custom = roleTemplates.find((t: any) => t.roleId === roleId)?.permissions;
    const effective = custom || getDefaultRolePermissions(roleId);
    form.setFieldsValue({
      can_edit_students: Boolean(effective.can_edit_students),
      can_reset_student_passwords: Boolean(effective.can_reset_student_passwords),
      can_manage_courses: Boolean(effective.can_manage_courses),
      can_manage_campaigns: Boolean(effective.can_manage_campaigns),
      can_manage_staff: Boolean(effective.can_manage_staff),
      can_manage_bulk_staff: Boolean(effective.can_manage_bulk_staff),
      can_view_reports: Boolean(effective.can_view_reports),
    });
  };

  // 4. Create Staff Invite Mutation
  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        title: values.title,
        roleId: values.roleId,
        permissions: {
          can_edit_students: Boolean(values.can_edit_students),
          can_reset_student_passwords: Boolean(values.can_reset_student_passwords),
          can_manage_courses: Boolean(values.can_manage_courses),
          can_manage_campaigns: Boolean(values.can_manage_campaigns),
          can_manage_staff: Boolean(values.can_manage_staff),
          can_manage_bulk_staff: Boolean(values.can_manage_bulk_staff),
          can_view_reports: Boolean(values.can_view_reports),
        },
        maxRegistrations: values.maxRegistrations || 500,
        expiresAt: values.expiresAt ? values.expiresAt.toISOString() : undefined,
        customInviteCode: values.customInviteCode ? values.customInviteCode.trim() : undefined,
      };
      return ApiClient.post('/staff/CreateStaffInviteLink', payload);
    },
    onSuccess: (res) => {
      message.success('Staff invitation link created successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff-invite-list'] });
      form.resetFields();
      setActiveTab('list');
      setSelectedQrInvite(res.data?.data);
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to create staff invite link.');
    },
  });

  // 5. Toggle Status Mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ inviteId, isActive }: { inviteId: string; isActive: boolean }) => {
      return ApiClient.put(`/staff/ToggleStaffInviteStatus/${inviteId}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invite-list'] });
      message.success('Staff invite link status updated.');
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to update status.');
    },
  });

  const getShareUrl = (code: string) => {
    return `${window.location.origin}/staff/join?token=${code}`;
  };

  const copyToClipboard = (code: string) => {
    const url = getShareUrl(code);
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    message.success('Staff invitation link copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const downloadQrCode = (code: string, title: string) => {
    const canvas = document.getElementById(`qr-canvas-${code}`) as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `StaffInvite-QRCode-${title.replace(/[^a-zA-Z0-9]/g, '_')}-${code}.png`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const columns = [
    {
      title: 'Invite Link Title & Role',
      key: 'title',
      render: (_: any, record: any) => (
        <div>
          <div className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
            <span>{record.title}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Tag color="blue" className="text-[10px] font-semibold m-0">
              Role: {record.role_id}
            </Tag>
            <Tag color="purple" className="font-mono text-[10px] m-0">
              {record.invite_code}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Created By',
      key: 'created_by',
      width: 160,
      render: (_: any, record: any) => (
        <div className="text-xs">
          <div className="font-semibold text-gray-800 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">{record.creator_name || 'Organization Admin'}</span>
          </div>
          {record.creator_email && (
            <div className="text-[10px] text-gray-400 truncate mt-0.5">{record.creator_email}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Staff Onboarded',
      key: 'quota',
      width: 170,
      render: (_: any, record: any) => {
        const pct = Math.min(100, Math.round((record.current_registrations / record.max_registrations) * 100));
        return (
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-700">{record.current_registrations} joined</span>
              <span className="text-gray-400">of {record.max_registrations}</span>
            </div>
            <Progress
              percent={pct}
              size="small"
              status={pct >= 100 ? 'exception' : 'active'}
              strokeColor={pct >= 100 ? '#ef4444' : '#6366f1'}
            />
          </div>
        );
      },
    },
    {
      title: 'Expiry',
      key: 'expires',
      width: 140,
      render: (_: any, record: any) => (
        <div className="text-xs">
          {record.expires_at ? (
            <div>
              <div className="font-medium text-gray-700">{formatLocal(record.expires_at, 'DD-MM-YYYY')}</div>
              {record.is_expired ? (
                <Tag color="error" className="text-[10px] mt-0.5">Expired</Tag>
              ) : (
                <Tag color="success" className="text-[10px] mt-0.5">Active</Tag>
              )}
            </div>
          ) : (
            <span className="text-gray-400">Never expires</span>
          )}
        </div>
      ),
    },
    {
      title: 'Active',
      key: 'is_active',
      width: 80,
      render: (val: boolean, record: any) => (
        <Switch
          size="small"
          checked={record.is_active}
          onChange={(checked) => toggleMutation.mutate({ inviteId: record.id, isActive: checked })}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 170,
      render: (_: any, record: any) => (
        <div className="flex items-center gap-1.5">
          <Tooltip title="Copy Shareable Staff Registration Link">
            <Button
              size="small"
              icon={copiedCode === record.invite_code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              onClick={() => copyToClipboard(record.invite_code)}
            />
          </Tooltip>

          <Tooltip title="Show Scannable QR Code">
            <Button
              size="small"
              icon={<QrCode className="w-3.5 h-3.5 text-indigo-600" />}
              onClick={() => setSelectedQrInvite(record)}
            />
          </Tooltip>

          <Tooltip title="View Enrolled Staff Members">
            <Button
              size="small"
              icon={<Users className="w-3.5 h-3.5 text-blue-600" />}
              onClick={() => {
                setSelectedInviteForStaff(record);
                setStaffDrawerOpen(true);
              }}
            >
              <span className="text-xs">{record.current_registrations}</span>
            </Button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <>
      <Modal
        open={open}
        title={
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              <div>
                <div className="text-base font-bold text-gray-900">
                  Bulk Staff Invitation Links & QR Codes
                </div>
                <div className="text-xs text-gray-500 font-normal">
                  Generate shareable self-registration links and scannable QR codes to onboard 1,000+ staff members with pre-configured roles and permissions.
                </div>
              </div>
            </div>
          </div>
        }
        onCancel={onClose}
        footer={null}
        width={980}
        destroyOnHidden
      >
        <div className="mt-3">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'list',
                label: `Active Staff Links (${inviteList.length})`,
                children: (
                  <div className="space-y-4 pt-1">
                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>
                          Distribute invite links or display QR codes to onboard instructors, content managers, and tutors in bulk without manual creation.
                        </span>
                      </div>
                      <Button
                        type="primary"
                        size="small"
                        icon={<Plus className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setActiveTab('create');
                          applyRoleToForm('INSTRUCTOR');
                        }}
                      >
                        Generate New Staff Link
                      </Button>
                    </div>

                    <Table
                      columns={columns}
                      dataSource={inviteList}
                      rowKey="id"
                      loading={isLoading}
                      pagination={{ pageSize: 5 }}
                      size="middle"
                      className="border border-gray-100 rounded-xl overflow-hidden"
                    />
                  </div>
                ),
              },
              {
                key: 'create',
                label: '+ Generate Staff Invite Link & QR',
                children: (
                  <div className="pt-2 max-w-xl mx-auto">
                    <Form
                      form={form}
                      layout="vertical"
                      onFinish={(values) => createMutation.mutate(values)}
                      initialValues={{
                        roleId: 'INSTRUCTOR',
                        maxRegistrations: 500,
                        can_manage_courses: true,
                        can_manage_campaigns: true,
                      }}
                    >
                      <Form.Item
                        name="title"
                        label={<span className="text-xs font-semibold text-gray-700">Link Title / Department Batch</span>}
                        rules={[{ required: true, message: 'Enter link title or department' }]}
                      >
                        <Input
                          prefix={<Building2 className="w-4 h-4 text-gray-400 mr-1" />}
                          placeholder="e.g. Faculty of Computer Science Batch 2026 / Campus Tutors"
                        />
                      </Form.Item>

                      <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                          name="roleId"
                          label={<span className="text-xs font-semibold text-gray-700">Assigned Staff Role</span>}
                          rules={[{ required: true, message: 'Select staff role' }]}
                        >
                          <Select
                            onChange={(val) => {
                              setSelectedRole(val);
                              applyRoleToForm(val);
                            }}
                          >
                            {ROLES.map((r) => (
                              <Select.Option key={r.id} value={r.id}>
                                {r.name}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>

                        <Form.Item
                          name="maxRegistrations"
                          label={<span className="text-xs font-semibold text-gray-700">Max Onboarding Limit (Seats)</span>}
                          rules={[{ required: true, message: 'Enter max registrations' }]}
                        >
                          <InputNumber min={1} max={5000} className="w-full" placeholder="e.g. 500" />
                        </Form.Item>
                      </div>

                      {/* Page Control Rights Switches for this Invite */}
                      <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200 mb-4 space-y-2.5">
                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-200">
                          <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Pre-configured Page Control Rights for this Link</span>
                          </span>
                          <span className="text-[11px] text-gray-400">Pre-filled from role defaults</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                            <span>Edit Students</span>
                            <Form.Item name="can_edit_students" valuePropName="checked" noStyle>
                              <Switch size="small" />
                            </Form.Item>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                            <span>Reset Passwords</span>
                            <Form.Item name="can_reset_student_passwords" valuePropName="checked" noStyle>
                              <Switch size="small" />
                            </Form.Item>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                            <span>Manage Courses</span>
                            <Form.Item name="can_manage_courses" valuePropName="checked" noStyle>
                              <Switch
                                size="small"
                                onChange={(checked) => {
                                  if (!checked) {
                                    form.setFieldsValue({ can_manage_campaigns: false });
                                  }
                                }}
                              />
                            </Form.Item>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                            <span>Outreach & Campaigns</span>
                            <Form.Item name="can_manage_campaigns" valuePropName="checked" noStyle>
                              <Switch
                                size="small"
                                onChange={(checked) => {
                                  if (checked) {
                                    form.setFieldsValue({ can_manage_courses: true });
                                  }
                                }}
                              />
                            </Form.Item>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                            <span>Manage Staff</span>
                            <Form.Item name="can_manage_staff" valuePropName="checked" noStyle>
                              <Switch
                                size="small"
                                onChange={(checked) => {
                                  if (!checked) {
                                    form.setFieldsValue({ can_manage_bulk_staff: false });
                                  }
                                }}
                              />
                            </Form.Item>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                            <span>Bulk Staff Links & QR</span>
                            <Form.Item name="can_manage_bulk_staff" valuePropName="checked" noStyle>
                              <Switch
                                size="small"
                                onChange={(checked) => {
                                  if (checked) {
                                    form.setFieldsValue({ can_manage_staff: true });
                                  }
                                }}
                              />
                            </Form.Item>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                            <span>View Reports</span>
                            <Form.Item name="can_view_reports" valuePropName="checked" noStyle>
                              <Switch size="small" />
                            </Form.Item>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                          name="expiresAt"
                          label={<span className="text-xs font-semibold text-gray-700">Link Expiration Date (Optional)</span>}
                        >
                          <DatePicker
                            className="w-full"
                            placeholder="Never expires if empty"
                            disabledDate={(current) => current && current.valueOf() < Date.now()}
                          />
                        </Form.Item>

                        <Form.Item
                          name="customInviteCode"
                          label={<span className="text-xs font-semibold text-gray-700">Custom Code (Optional)</span>}
                        >
                          <Input placeholder="e.g. STF-CSE-FACULTY-2026" className="uppercase font-mono text-xs" />
                        </Form.Item>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <Button onClick={() => setActiveTab('list')}>Cancel</Button>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={createMutation.isPending}
                          className="!bg-black font-semibold"
                        >
                          Generate Staff Link & QR Code
                        </Button>
                      </div>
                    </Form>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </Modal>

      {/* Scannable QR Code Modal */}
      {selectedQrInvite && (
        <Modal
          open={!!selectedQrInvite}
          onCancel={() => setSelectedQrInvite(null)}
          footer={null}
          width={440}
          centered
        >
          <div className="text-center p-4 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900">{selectedQrInvite.title}</h3>
              <div className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1.5">
                <Tag color="blue" className="text-[10px] m-0">Role: {selectedQrInvite.role_id}</Tag>
                <span>• Code: <span className="font-mono font-semibold">{selectedQrInvite.invite_code}</span></span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border-2 border-gray-100 inline-block shadow-sm">
              <QRCode
                id={`qr-canvas-${selectedQrInvite.invite_code}`}
                value={getShareUrl(selectedQrInvite.invite_code)}
                size={210}
                bordered={false}
              />
            </div>

            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Scan this QR code from any smartphone or tablet camera to instantly open the staff registration portal.
            </p>

            <div className="flex items-center gap-2 justify-center pt-2">
              <Button
                icon={<Copy className="w-4 h-4" />}
                onClick={() => copyToClipboard(selectedQrInvite.invite_code)}
              >
                Copy Link
              </Button>
              <Button
                type="primary"
                icon={<Download className="w-4 h-4" />}
                onClick={() => downloadQrCode(selectedQrInvite.invite_code, selectedQrInvite.title)}
                className="!bg-black"
              >
                Download QR Code
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Enrolled Staff Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Staff Members Registered via Invite</span>
          </div>
        }
        placement="right"
        width={600}
        onClose={() => {
          setStaffDrawerOpen(false);
          setSelectedInviteForStaff(null);
        }}
        open={staffDrawerOpen}
      >
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700">
            <div className="font-semibold text-gray-900">{selectedInviteForStaff?.title}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Role: <Tag color="blue" className="text-[10px] m-0">{selectedInviteForStaff?.role_id}</Tag> • Code:{' '}
              <span className="font-mono font-semibold">{selectedInviteForStaff?.invite_code}</span>
            </div>
          </div>

          <Table
            dataSource={registeredStaff}
            rowKey="redemption_id"
            loading={loadingStaff}
            pagination={{ pageSize: 8 }}
            size="small"
            columns={[
              {
                title: 'Staff Member',
                key: 'user',
                render: (_: any, record: any) => (
                  <div>
                    <div className="font-semibold text-xs text-gray-900">{record.user_name}</div>
                    <div className="text-[11px] text-gray-500">{record.email}</div>
                    {record.phone && <div className="text-[10px] text-gray-400">{record.phone}</div>}
                  </div>
                ),
              },
              {
                title: 'Role & Status',
                key: 'role',
                width: 120,
                render: (_: any, record: any) => (
                  <div>
                    <Tag color="blue" className="text-[10px]">{record.role_id}</Tag>
                    <div><Tag color="green" className="text-[10px] mt-0.5">{record.member_status}</Tag></div>
                  </div>
                ),
              },
              {
                title: 'Joined Date',
                key: 'joined_at',
                width: 140,
                render: (_: any, record: any) => (
                  <div className="text-xs">
                    <div className="font-medium text-gray-700">{record.joined_at ? formatLocal(record.joined_at, 'DD-MM-YYYY') : 'N/A'}</div>
                    <div className="text-[10px] text-gray-400">IP: {record.client_ip || '127.0.0.1'}</div>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </Drawer>
    </>
  );
};
