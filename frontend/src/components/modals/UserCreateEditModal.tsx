import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Switch, message, Typography, Button, Alert, Tag } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, KeyRound, Copy, Check, UserCheck, Sparkles, CheckCheck, XCircle, User, Settings2, ShieldCheck } from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';
import { UserAvatarPicker } from '../common/UserAvatarPicker';

const { Text } = Typography;

interface UserCreateEditModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  userType: 'staff' | 'student';
  initialData?: any;
  onClose: () => void;
}

export const UserCreateEditModal: React.FC<UserCreateEditModalProps> = ({
  open,
  mode,
  userType,
  initialData,
  onClose,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>('INSTRUCTOR');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password?: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch organization default role permissions templates
  const { data: roleTemplates = [] } = useQuery({
    queryKey: ['role-permissions-list'],
    queryFn: async () => {
      const res = await ApiClient.get('/staff/GetRolePermissionsList');
      return res.data?.data || [];
    },
    enabled: open && userType === 'staff',
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

  const applyRoleDefaultPermissions = (roleId: string) => {
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

  // Monitor permissions for active count display
  const watchedPermissions = Form.useWatch([], form);

  const getActiveRightsCount = () => {
    if (selectedRole === 'ORGANIZATION_ADMIN') return 7;
    const perms = [
      form.getFieldValue('can_edit_students'),
      form.getFieldValue('can_reset_student_passwords'),
      form.getFieldValue('can_manage_courses'),
      form.getFieldValue('can_manage_campaigns'),
      form.getFieldValue('can_manage_staff'),
      form.getFieldValue('can_manage_bulk_staff'),
      form.getFieldValue('can_view_reports'),
    ];
    return perms.filter(Boolean).length;
  };

  const handleCampaignSwitchChange = (checked: boolean) => {
    if (checked) {
      form.setFieldsValue({
        can_manage_campaigns: true,
        can_manage_courses: true,
      });
      message.info('Course Management enabled automatically (required for College Outreach & Campaigns).');
    } else {
      form.setFieldsValue({ can_manage_campaigns: false });
    }
  };

  const handleCourseSwitchChange = (checked: boolean) => {
    if (!checked) {
      const campaignsActive = form.getFieldValue('can_manage_campaigns');
      if (campaignsActive) {
        form.setFieldsValue({
          can_manage_courses: false,
          can_manage_campaigns: false,
        });
        message.warning('College Outreach & Campaigns disabled automatically (requires Course Management).');
        return;
      }
    }
    form.setFieldsValue({ can_manage_courses: checked });
  };

  const handleBulkStaffSwitchChange = (checked: boolean) => {
    if (checked) {
      form.setFieldsValue({
        can_manage_bulk_staff: true,
        can_manage_staff: true,
      });
      message.info('Staff Directory Management enabled automatically (required for Bulk Staff Links & QR).');
    } else {
      form.setFieldsValue({ can_manage_bulk_staff: false });
    }
  };

  const handleStaffSwitchChange = (checked: boolean) => {
    if (!checked) {
      const bulkStaffActive = form.getFieldValue('can_manage_bulk_staff');
      if (bulkStaffActive) {
        form.setFieldsValue({
          can_manage_staff: false,
          can_manage_bulk_staff: false,
        });
        message.warning('Bulk Staff Links & QR disabled automatically (requires Staff Directory Management).');
        return;
      }
    }
    form.setFieldsValue({ can_manage_staff: checked });
  };

  useEffect(() => {
    if (open) {
      setCreatedCredentials(null);
      setCopied(false);
      const initialAvatar = initialData?.avatar_url || initialData?.avatarUrl || null;
      setAvatarUrl(initialAvatar);

      if (mode === 'edit' && initialData) {
        let perms = initialData.permissions || {};
        if (typeof perms === 'string') {
          try {
            perms = JSON.parse(perms);
          } catch {
            perms = {};
          }
        }
        form.setFieldsValue({
          firstName: initialData.first_name,
          lastName: initialData.last_name,
          email: initialData.email,
          phone: initialData.phone || '',
          roleId: initialData.role_id || 'INSTRUCTOR',
          status: initialData.status || 'ACTIVE',
          avatarUrl: initialAvatar || '',
          can_edit_students: Boolean(perms.can_edit_students),
          can_reset_student_passwords: Boolean(perms.can_reset_student_passwords),
          can_manage_courses: Boolean(perms.can_manage_courses),
          can_manage_campaigns: Boolean(perms.can_manage_campaigns),
          can_manage_staff: Boolean(perms.can_manage_staff),
          can_manage_bulk_staff: Boolean(perms.can_manage_bulk_staff),
          can_view_reports: Boolean(perms.can_view_reports),
        });
        setSelectedRole(initialData.role_id || 'INSTRUCTOR');
      } else {
        form.resetFields();
        form.setFieldsValue({
          roleId: 'INSTRUCTOR',
          status: 'ACTIVE',
          avatarUrl: '',
        });
        setSelectedRole('INSTRUCTOR');
        applyRoleDefaultPermissions('INSTRUCTOR');
      }
    }
  }, [open, mode, initialData, form]);

  const isTargetPrimaryOwner = initialData?.role_id === 'ORGANIZATION_OWNER' || Boolean(initialData?.is_primary_owner);
  const isSelectedAdmin = selectedRole === 'ORGANIZATION_ADMIN';
  const isSelectedOwner = selectedRole === 'ORGANIZATION_OWNER' || isTargetPrimaryOwner;
  const isOrgUser = isSelectedOwner || isSelectedAdmin;
  const isOwner = isTargetPrimaryOwner || selectedRole === 'ORGANIZATION_OWNER';
  const isFullAdmin = isOrgUser;

  const handleGrantAllRights = () => {
    form.setFieldsValue({
      can_edit_students: true,
      can_reset_student_passwords: true,
      can_manage_courses: true,
      can_manage_campaigns: true,
      can_manage_staff: true,
      can_manage_bulk_staff: true,
      can_view_reports: true,
    });
    message.success('All page control rights enabled.');
  };

  const handleRevokeAllRights = () => {
    form.setFieldsValue({
      can_edit_students: false,
      can_reset_student_passwords: false,
      can_manage_courses: false,
      can_manage_campaigns: false,
      can_manage_staff: false,
      can_manage_bulk_staff: false,
      can_view_reports: false,
    });
    message.info('All elevated rights revoked.');
  };

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (mode === 'create') {
        if (userType === 'staff') {
          const permissions = isFullAdmin
            ? {
                can_edit_students: true,
                can_reset_student_passwords: true,
                can_manage_courses: true,
                can_manage_campaigns: true,
                can_manage_staff: true,
                can_manage_bulk_staff: true,
                can_view_reports: true,
              }
            : {
                can_edit_students: Boolean(values.can_edit_students),
                can_reset_student_passwords: Boolean(values.can_reset_student_passwords),
                can_manage_courses: Boolean(values.can_manage_courses),
                can_manage_campaigns: Boolean(values.can_manage_campaigns) && Boolean(values.can_manage_courses),
                can_manage_staff: Boolean(values.can_manage_staff),
                can_manage_bulk_staff: Boolean(values.can_manage_bulk_staff) && Boolean(values.can_manage_staff),
                can_view_reports: Boolean(values.can_view_reports),
              };

          return ApiClient.post('/staff/CreateStaffMember', {
            email: values.email,
            firstName: values.firstName,
            lastName: values.lastName,
            roleId: values.roleId,
            phone: values.phone,
            password: values.password || undefined,
            avatarUrl: avatarUrl || undefined,
            permissions,
          });
        } else {
          return ApiClient.post('/students/CreateStudent', {
            email: values.email,
            firstName: values.firstName,
            lastName: values.lastName,
            phone: values.phone,
            password: values.password || undefined,
            avatarUrl: avatarUrl || undefined,
          });
        }
      } else {
        // Edit mode
        if (userType === 'staff') {
          const staffUserId = initialData.user_id;
          const permissions = isFullAdmin
            ? {
                can_edit_students: true,
                can_reset_student_passwords: true,
                can_manage_courses: true,
                can_manage_campaigns: true,
                can_manage_staff: true,
                can_manage_bulk_staff: true,
                can_view_reports: true,
              }
            : {
                can_edit_students: Boolean(values.can_edit_students),
                can_reset_student_passwords: Boolean(values.can_reset_student_passwords),
                can_manage_courses: Boolean(values.can_manage_courses),
                can_manage_campaigns: Boolean(values.can_manage_campaigns) && Boolean(values.can_manage_courses),
                can_manage_staff: Boolean(values.can_manage_staff),
                can_manage_bulk_staff: Boolean(values.can_manage_bulk_staff) && Boolean(values.can_manage_staff),
                can_view_reports: Boolean(values.can_view_reports),
              };

          return ApiClient.put('/staff/UpdateStaffMember', {
            staffUserId,
            firstName: values.firstName,
            lastName: values.lastName,
            phone: values.phone,
            roleId: values.roleId,
            status: values.status,
            avatarUrl: avatarUrl !== undefined ? avatarUrl : null,
            permissions,
          });
        } else {
          const studentUserId = initialData.user_id;
          return ApiClient.put('/students/UpdateStudentDetails', {
            studentUserId,
            firstName: values.firstName,
            lastName: values.lastName,
            phone: values.phone,
            status: values.status,
            avatarUrl: avatarUrl !== undefined ? avatarUrl : null,
          });
        }
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [userType === 'staff' ? 'staff-list' : 'student-list'] });
      const initialPwd = res.data?.data?.initialPassword;
      if (mode === 'create' && initialPwd) {
        setCreatedCredentials({
          email: res.data?.data?.email,
          password: initialPwd,
          name: `${res.data?.data?.firstName || ''} ${res.data?.data?.lastName || ''}`.trim(),
        });
      } else {
        message.success(`${userType === 'staff' ? 'Staff member' : 'Student'} saved successfully.`);
        onClose();
      }
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to save user.');
    },
  });

  const handleOk = () => {
    form.validateFields().then((values) => {
      saveMutation.mutate(values);
    });
  };

  const copyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Platform Access Credentials\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    message.success('Login credentials copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const roleDisplay = isOwner
    ? 'Organization Owner'
    : isOrgUser
    ? 'Organization Admin'
    : userType === 'staff'
    ? 'Staff Member'
    : 'Student';

  const title = `${mode === 'create' ? 'Add New' : 'Edit'} ${roleDisplay}`;
  const activeRightsCount = getActiveRightsCount();

  return (
    <>
      <Modal
        open={open && !createdCredentials}
        title={title}
        onCancel={onClose}
        onOk={handleOk}
        confirmLoading={saveMutation.isPending}
        destroyOnHidden
        width={userType === 'staff' && !isOrgUser ? 880 : 540}
      >
      <Form form={form} layout="vertical" className="mt-4">
        {userType === 'staff' ? (
          isOrgUser ? (
            /* Single-Column Clean Layout for Organization Users (Owner & Admin) - NO Page Control Rights shown! */
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Organization Member Identity & Role</span>
              </div>

              <UserAvatarPicker
                value={avatarUrl}
                onChange={(url) => {
                  setAvatarUrl(url);
                  form.setFieldValue('avatarUrl', url);
                }}
                name={`${form.getFieldValue('firstName') || ''} ${form.getFieldValue('lastName') || ''}`}
                email={form.getFieldValue('email')}
                size="sm"
              />

              <div className="grid grid-cols-2 gap-3">
                <Form.Item
                  name="firstName"
                  label="First Name"
                  rules={[{ required: true, message: 'Please enter first name' }]}
                >
                  <Input placeholder="First Name" />
                </Form.Item>
                <Form.Item
                  name="lastName"
                  label="Last Name"
                  rules={[{ required: true, message: 'Please enter last name' }]}
                >
                  <Input placeholder="Last Name" />
                </Form.Item>
              </div>

              <Form.Item
                name="email"
                label="Email Address (Login User ID)"
                rules={[{ required: true, type: 'email', message: 'Valid email is required' }]}
              >
                <Input placeholder="user@novacodex.in" disabled={mode === 'edit'} />
              </Form.Item>

              <div className="grid grid-cols-2 gap-3">
                <Form.Item name="phone" label="Phone Number">
                  <Input placeholder="+91 98765 43210" />
                </Form.Item>

                {mode === 'edit' && (
                  <Form.Item name="status" label="Account Status" rules={[{ required: true }]}>
                    <Select>
                      <Select.Option value="ACTIVE">ACTIVE</Select.Option>
                      <Select.Option value="INACTIVE">INACTIVE</Select.Option>
                      <Select.Option value="SUSPENDED">SUSPENDED</Select.Option>
                    </Select>
                  </Form.Item>
                )}
              </div>

              <Form.Item
                name="roleId"
                label="Assigned Role"
                rules={[{ required: true, message: 'Please select a role' }]}
              >
                <Select
                  placeholder="Select staff role"
                  disabled={isTargetPrimaryOwner}
                  onChange={(val) => {
                    setSelectedRole(val);
                    if (val !== 'ORGANIZATION_ADMIN' && val !== 'ORGANIZATION_OWNER') {
                      applyRoleDefaultPermissions(val);
                    }
                  }}
                >
                  {isTargetPrimaryOwner && (
                    <Select.Option value="ORGANIZATION_OWNER">👑 Organization Owner (Primary Tenant)</Select.Option>
                  )}
                  <Select.Option value="ORGANIZATION_ADMIN">🛡️ Organization Admin (PA / Full Rights)</Select.Option>
                  <Select.Option value="INSTRUCTOR">Instructor</Select.Option>
                  <Select.Option value="CONTENT_MANAGER">Content Manager</Select.Option>
                  <Select.Option value="MANAGER">Manager</Select.Option>
                  <Select.Option value="REVIEWER">Reviewer</Select.Option>
                </Select>
              </Form.Item>

              {/* Full Organization Authority Notice Card */}
              <div className={`p-3.5 rounded-xl flex items-start gap-2.5 text-xs ${
                isTargetPrimaryOwner
                  ? 'bg-amber-50/80 border border-amber-200 text-amber-950'
                  : 'bg-indigo-50/80 border border-indigo-200 text-indigo-950'
              }`}>
                <ShieldCheck className={`w-4 h-4 shrink-0 mt-0.5 ${
                  isTargetPrimaryOwner ? 'text-amber-600' : 'text-indigo-600'
                }`} />
                <div>
                  <div className="font-semibold">
                    {isTargetPrimaryOwner
                      ? '👑 Primary Organization Owner (Ultimate Authority)'
                      : '🛡️ Organization Administrator (PA / Delegated Authority)'}
                  </div>
                  <div className="text-[11px] mt-0.5 leading-relaxed opacity-90">
                    {isTargetPrimaryOwner
                      ? 'This account matches the Login User ID (Owner) provisioned by Super Admin. The Owner permanently retains 100% full authority across all courses, students, staff, analytics, and platform configurations. This role cannot be demoted or edited by subordinate staff.'
                      : 'This staff member possesses full operational administrator rights across all courses, campaigns, staff, and analytics. Note: This delegated access is subordinate to the Primary Organization Owner, who retains full authority to modify, demote, or change these rights at any time.'}
                  </div>
                </div>
              </div>

              {mode === 'create' && (
                <Form.Item
                  name="password"
                  label="Initial Password"
                  rules={[{ min: 6, message: 'Minimum 6 characters' }]}
                  extra={
                    <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Leave empty to automatically generate a secure 12-character random password.
                    </span>
                  }
                >
                  <Input.Password placeholder="Leave empty for auto-generated password" />
                </Form.Item>
              )}
            </div>
          ) : (
            /* Responsive 2-Column Layout for Staff: Left = Identity & Role; Right = Page Control Rights */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* LEFT COLUMN: Identity & Role */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>Member Identity & Role</span>
                </div>

                <UserAvatarPicker
                  value={avatarUrl}
                  onChange={(url) => {
                    setAvatarUrl(url);
                    form.setFieldValue('avatarUrl', url);
                  }}
                  name={`${form.getFieldValue('firstName') || ''} ${form.getFieldValue('lastName') || ''}`}
                  email={form.getFieldValue('email')}
                  size="sm"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Form.Item
                    name="firstName"
                    label="First Name"
                    rules={[{ required: true, message: 'Please enter first name' }]}
                  >
                    <Input placeholder="First Name" />
                  </Form.Item>
                  <Form.Item
                    name="lastName"
                    label="Last Name"
                    rules={[{ required: true, message: 'Please enter last name' }]}
                  >
                    <Input placeholder="Last Name" />
                  </Form.Item>
                </div>

                <Form.Item
                  name="email"
                  label="Email Address (Login User ID)"
                  rules={[{ required: true, type: 'email', message: 'Valid email is required' }]}
                >
                  <Input placeholder="user@novacodex.in" disabled={mode === 'edit'} />
                </Form.Item>

                <div className="grid grid-cols-2 gap-3">
                  <Form.Item name="phone" label="Phone Number">
                    <Input placeholder="+91 98765 43210" />
                  </Form.Item>

                  {mode === 'edit' && (
                    <Form.Item name="status" label="Account Status" rules={[{ required: true }]}>
                      <Select>
                        <Select.Option value="ACTIVE">ACTIVE</Select.Option>
                        <Select.Option value="INACTIVE">INACTIVE</Select.Option>
                        <Select.Option value="SUSPENDED">SUSPENDED</Select.Option>
                      </Select>
                    </Form.Item>
                  )}
                </div>

                <Form.Item
                  name="roleId"
                  label="Assigned Role"
                  rules={[{ required: true, message: 'Please select a role' }]}
                >
                  <Select
                    placeholder="Select staff role"
                    onChange={(val) => {
                      setSelectedRole(val);
                      applyRoleDefaultPermissions(val);
                    }}
                  >
                    <Select.Option value="INSTRUCTOR">Instructor</Select.Option>
                    <Select.Option value="CONTENT_MANAGER">Content Manager</Select.Option>
                    <Select.Option value="MANAGER">Manager</Select.Option>
                    <Select.Option value="REVIEWER">Reviewer</Select.Option>
                    <Select.Option value="ORGANIZATION_ADMIN">Organization Admin (Full Rights)</Select.Option>
                  </Select>
                </Form.Item>

                {mode === 'create' && (
                  <Form.Item
                    name="password"
                    label="Initial Password"
                    rules={[{ min: 6, message: 'Minimum 6 characters' }]}
                    extra={
                      <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Leave empty to auto-generate a secure 12-char temporary password.
                      </span>
                    }
                  >
                    <Input.Password placeholder="Leave empty for auto-generated password" />
                  </Form.Item>
                )}
              </div>

              {/* RIGHT COLUMN: Page Control Rights & Feature Switches */}
              <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 uppercase tracking-wide">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <span>Page Control Rights</span>
                  </div>
                  <Tag color={activeRightsCount > 0 ? 'blue' : 'default'} className="m-0 text-xs font-semibold">
                    {`${activeRightsCount} of 7 Active`}
                  </Tag>
                </div>

                <p className="text-xs text-gray-500 mb-3">
                  Toggle granular rights for this staff account. Turning a switch OFF completely hides the corresponding action buttons from their view.
                </p>

                {/* Quick Action Buttons: Grant All Rights & Revoke All */}
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    size="small"
                    icon={<CheckCheck className="w-3.5 h-3.5" />}
                    onClick={handleGrantAllRights}
                    className="text-xs font-medium text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100"
                  >
                    Grant All Rights
                  </Button>
                  <Button
                    size="small"
                    icon={<XCircle className="w-3.5 h-3.5" />}
                    onClick={handleRevokeAllRights}
                    className="text-xs font-medium text-gray-600 bg-white border-gray-200 hover:bg-gray-100"
                  >
                    Revoke All
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-200/80 hover:border-gray-300 transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-gray-800">Edit Student Details</div>
                      <div className="text-[11px] text-gray-500">Show edit pencil icon & allow modifying student profiles</div>
                    </div>
                    <Form.Item name="can_edit_students" valuePropName="checked" noStyle>
                      <Switch size="small" />
                    </Form.Item>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-200/80 hover:border-gray-300 transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-gray-800">Reset Student Passwords</div>
                      <div className="text-[11px] text-gray-500">Show key icon & allow issuing new temporary passwords</div>
                    </div>
                    <Form.Item name="can_reset_student_passwords" valuePropName="checked" noStyle>
                      <Switch size="small" />
                    </Form.Item>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-200/80 hover:border-gray-300 transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-gray-800">Manage Courses & Curriculum</div>
                      <div className="text-[11px] text-gray-500">Author courses, modules, lessons, quizzes & taxonomies</div>
                    </div>
                    <Form.Item name="can_manage_courses" valuePropName="checked" noStyle>
                      <Switch size="small" onChange={handleCourseSwitchChange} />
                    </Form.Item>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-200/80 hover:border-gray-300 transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                        <span>College Outreach & Campaign Links</span>
                        <Tag color="purple" className="text-[10px] m-0 py-0 px-1 font-normal">Requires Courses</Tag>
                      </div>
                      <div className="text-[11px] text-gray-500">Generate college share links, scannable QR codes & free seat quotas</div>
                    </div>
                    <Form.Item name="can_manage_campaigns" valuePropName="checked" noStyle>
                      <Switch size="small" onChange={handleCampaignSwitchChange} />
                    </Form.Item>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-200/80 hover:border-gray-300 transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-gray-800">Manage Staff Directory</div>
                      <div className="text-[11px] text-gray-500">Create and modify staff accounts & access switches</div>
                    </div>
                    <Form.Item name="can_manage_staff" valuePropName="checked" noStyle>
                      <Switch size="small" onChange={handleStaffSwitchChange} />
                    </Form.Item>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-200/80 hover:border-gray-300 transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                        <span>Bulk Staff & User Invite Links (QR)</span>
                        <Tag color="cyan" className="text-[10px] m-0 py-0 px-1 font-normal">Requires Staff</Tag>
                      </div>
                      <div className="text-[11px] text-gray-500">Generate bulk onboarding links, scannable QR codes, and seat quotas for staff</div>
                    </div>
                    <Form.Item name="can_manage_bulk_staff" valuePropName="checked" noStyle>
                      <Switch size="small" onChange={handleBulkStaffSwitchChange} />
                    </Form.Item>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-200/80 hover:border-gray-300 transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-gray-800">View Audit Logs & Reports</div>
                      <div className="text-[11px] text-gray-500">Access security logs, IP audits, and student analytics</div>
                    </div>
                    <Form.Item name="can_view_reports" valuePropName="checked" noStyle>
                      <Switch size="small" />
                    </Form.Item>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          /* Student Form: Clean layout */
          <div>
            <div className="mb-4">
              <UserAvatarPicker
                value={avatarUrl}
                onChange={(url) => {
                  setAvatarUrl(url);
                  form.setFieldValue('avatarUrl', url);
                }}
                name={`${form.getFieldValue('firstName') || ''} ${form.getFieldValue('lastName') || ''}`}
                email={form.getFieldValue('email')}
                size="sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: 'Please enter first name' }]}
              >
                <Input placeholder="First Name" />
              </Form.Item>
              <Form.Item
                name="lastName"
                label="Last Name"
                rules={[{ required: true, message: 'Please enter last name' }]}
              >
                <Input placeholder="Last Name" />
              </Form.Item>
            </div>

            <Form.Item
              name="email"
              label="Email Address (Login ID)"
              rules={[{ required: true, type: 'email', message: 'Valid email is required' }]}
            >
              <Input placeholder="student@example.com" disabled={mode === 'edit'} />
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="phone" label="Phone Number">
                <Input placeholder="+91 98765 43210" />
              </Form.Item>

              {mode === 'edit' && (
                <Form.Item name="status" label="Account Status" rules={[{ required: true }]}>
                  <Select>
                    <Select.Option value="ACTIVE">ACTIVE</Select.Option>
                    <Select.Option value="INACTIVE">INACTIVE</Select.Option>
                    <Select.Option value="SUSPENDED">SUSPENDED</Select.Option>
                  </Select>
                </Form.Item>
              )}
            </div>

            {mode === 'create' && (
              <Form.Item
                name="password"
                label="Initial Password"
                rules={[{ min: 6, message: 'Minimum 6 characters' }]}
                extra={
                  <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Leave empty to automatically generate a secure 12-character random password.
                  </span>
                }
              >
                <Input.Password placeholder="Leave empty for auto-generated password" />
              </Form.Item>
            )}
          </div>
        )}
      </Form>
    </Modal>

    {createdCredentials && (
      <Modal
        open={Boolean(createdCredentials)}
        title={
          <div className="flex items-center gap-2 text-emerald-700">
            <UserCheck className="w-5 h-5" />
            <span>{userType === 'staff' ? 'Staff Member' : 'Student'} Enrolled Successfully</span>
          </div>
        }
        onCancel={() => {
          setCreatedCredentials(null);
          onClose();
        }}
        footer={[
          <Button key="copy" type="primary" icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} onClick={copyCredentials}>
            {copied ? 'Copied' : 'Copy Credentials'}
          </Button>,
          <Button key="done" onClick={() => {
            setCreatedCredentials(null);
            onClose();
          }}>
            Done
          </Button>,
        ]}
      >
        <div className="py-3">
          <Alert
            type="success"
            showIcon
            message="User created with secure temporary credentials"
            description="Share these login credentials securely. Upon first login, the user will be prompted to set their permanent password."
            className="mb-4"
          />

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">User Name</span>
              <div className="font-semibold text-gray-800 text-sm">{createdCredentials.name}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Login Email (User ID)</span>
              <div className="font-mono text-sm font-semibold text-gray-900 bg-white p-2 rounded border border-gray-200 select-all">
                {createdCredentials.email}
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Initial Temporary Password</span>
              <div className="font-mono text-sm font-semibold text-emerald-700 bg-emerald-50/50 p-2 rounded border border-emerald-200 select-all flex items-center justify-between">
                <span>{createdCredentials.password}</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    )}
  </>
  );
};
