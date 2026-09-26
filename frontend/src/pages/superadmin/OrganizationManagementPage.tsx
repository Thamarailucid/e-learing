import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Card, Tag, Modal, Form, Input, Select, InputNumber, message, Popconfirm, Tabs, Tooltip, DatePicker, Switch, Upload } from 'antd';
import { Plus, Edit2, Ban, CheckCircle, Search, LogIn, KeyRound, Copy, Check, ExternalLink, Building, Globe, User, Mail, Clock, Sparkles, Shield, Calendar, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';
import { ApiClient } from '../../services/api/ApiClient';
import { SecureStorageService } from '../../services/storage/SecureStorageService';
import { RbaPageHeader } from '../../components/common/RbaPageHeader';
import { formatLocal } from '../../utils/dateTimeUtils';

export const OrganizationManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);

  // Created Academy Credentials Modal State
  const [createdCredentials, setCreatedCredentials] = useState<{
    orgName: string;
    email: string;
    password: string;
    slug: string;
    id?: string;
  } | null>(null);

  // Reset Password Success State
  const [resetResult, setResetResult] = useState<{
    orgName: string;
    ownerEmail: string;
    ownerName: string;
    newPassword: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  const [createForm] = Form.useForm();
  const [managePlanForm] = Form.useForm();
  const [manageProfileForm] = Form.useForm();
  const [manageOwnerForm] = Form.useForm();
  const [resetPwdForm] = Form.useForm();

  // Organizations Query
  const { data: orgsData, isLoading } = useQuery({
    queryKey: ['super-admin-orgs', search],
    queryFn: async () => {
      const res = await ApiClient.get(`/superadmin/GetOrganizationList?page=1&pageSize=50&search=${search}`);
      return res.data;
    },
  });

  // Create Org Mutation
  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        ...values,
        licenseStartDate: values.licenseStartDate ? values.licenseStartDate.toISOString() : null,
        licenseEndDate: values.licenseEndDate ? values.licenseEndDate.toISOString() : null,
      };
      return ApiClient.post('/superadmin/CreateOrganization', payload);
    },
    onSuccess: (res: any) => {
      message.success('Organization created successfully.');
      queryClient.invalidateQueries({ queryKey: ['super-admin-orgs'] });
      setIsCreateModalOpen(false);

      const createdData = res.data?.data;
      setCreatedCredentials({
        id: createdData?.id,
        orgName: createdData?.name || createForm.getFieldValue('name'),
        slug: createdData?.slug || createForm.getFieldValue('slug'),
        email: createdData?.ownerEmail || createForm.getFieldValue('ownerEmail'),
        password: createdData?.initialPassword || createForm.getFieldValue('ownerPassword') || 'OrgOwner@2026!',
      });
      createForm.resetFields();
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to create organization.');
    },
  });

  // Update Plan Tier Mutation
  const updatePlanMutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        ...values,
        licenseStartDate: values.licenseStartDate ? values.licenseStartDate.toISOString() : null,
        licenseEndDate: values.licenseEndDate ? values.licenseEndDate.toISOString() : null,
      };
      return ApiClient.put(`/superadmin/UpdateOrganizationPlanTier/${selectedOrg.id}`, payload);
    },
    onSuccess: () => {
      message.success('Organization plan tier and quotas updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['super-admin-orgs'] });
      setIsManageModalOpen(false);
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to update plan tier.');
    },
  });

  // Update Profile Mutation (Name, Slug, Domain, Logo)
  const updateProfileMutation = useMutation({
    mutationFn: async (values: any) => {
      return ApiClient.put(`/superadmin/UpdateOrganizationProfile/${selectedOrg.id}`, values);
    },
    onSuccess: () => {
      message.success('Organization profile & branding updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['super-admin-orgs'] });
      setIsManageModalOpen(false);
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to update organization profile.');
    },
  });

  // Update Owner Account Mutation (Login Email, Name, Phone, Password)
  const updateOwnerMutation = useMutation({
    mutationFn: async (values: any) => {
      return ApiClient.put(`/superadmin/UpdateOrganizationOwner/${selectedOrg.id}`, values);
    },
    onSuccess: (res: any) => {
      message.success('Organization owner login account updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['super-admin-orgs'] });
      setIsManageModalOpen(false);
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to update owner login account.');
    },
  });

  // Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await ApiClient.post(`/superadmin/ResetOrganizationOwnerPassword/${selectedOrg.id}`, values);
      return res.data?.data;
    },
    onSuccess: (data: any) => {
      message.success(`Password reset for ${data.ownerEmail}`);
      queryClient.invalidateQueries({ queryKey: ['super-admin-orgs'] });
      setIsResetPwdModalOpen(false);
      resetPwdForm.resetFields();
      setResetResult({
        orgName: data.organizationName || selectedOrg.name,
        ownerEmail: data.ownerEmail,
        ownerName: data.ownerName,
        newPassword: data.newPassword,
      });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to reset owner password.');
    },
  });

  // Suspend/Activate Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ orgId, action }: { orgId: string; action: 'Suspend' | 'Activate' }) => {
      return ApiClient.post(`/superadmin/${action}Organization/${orgId}`);
    },
    onSuccess: () => {
      message.success('Organization status updated.');
      queryClient.invalidateQueries({ queryKey: ['super-admin-orgs'] });
    },
  });

  // Direct Super Admin switch into Academy portal
  const handleEnterAcademy = async (org: any) => {
    try {
      const res = await ApiClient.post('/auth/PostSwitchActiveOrganization', {
        organizationId: org.id,
      });
      const currentSession = SecureStorageService.GetDecryptedValue<any>('session');
      if (currentSession) {
        currentSession.user.activeOrganizationId = res.data.data.activeOrganizationId;
        currentSession.tokens.accessToken = res.data.data.accessToken;
        currentSession.activeOrganizationName = org.name;
        currentSession.activeOrganizationLogo = org.logo_url;
        currentSession.activeOrganizationSlug = org.slug;
        SecureStorageService.SetEncryptedValue('session', currentSession);
      }
      message.success(`Entering ${org.name} portal...`);
      navigate('/organization/dashboard');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to enter organization portal.');
    }
  };

  const handleOpenManageModal = (org: any) => {
    setSelectedOrg(org);
    managePlanForm.setFieldsValue({
      planType: org.plan_type,
      maxStudents: org.max_students,
      maxCourses: org.max_courses,
      licenseType: org.license_type || 'SUBSCRIPTION',
      licenseStartDate: org.license_start_date ? dayjs(org.license_start_date) : null,
      licenseEndDate: org.license_end_date ? dayjs(org.license_end_date) : null,
      licenseIsActive: org.license_is_active !== false,
      showPlanTierToOrg: org.show_plan_tier_to_org !== false,
      licenseWarningDays: org.license_warning_days ?? 2,
    });
    manageProfileForm.setFieldsValue({
      name: org.name,
      slug: org.slug,
      domain: org.domain || '',
      logoUrl: org.logo_url || '',
    });
    manageOwnerForm.setFieldsValue({
      email: org.owner_email || '',
      firstName: org.owner_first_name || '',
      lastName: org.owner_last_name || '',
      phone: org.owner_phone || '',
      password: '',
    });
    setIsManageModalOpen(true);
  };

  const handleOpenResetPassword = (org: any) => {
    setSelectedOrg(org);
    resetPwdForm.setFieldsValue({
      ownerEmail: org.owner_email || '',
      newPassword: '',
    });
    setIsResetPwdModalOpen(true);
  };

  const getPlanColor = (plan: string) => {
    if (plan === 'ENTERPRISE') return 'purple';
    if (plan === 'BUSINESS') return 'blue';
    return 'default';
  };

  const columns = [
    {
      title: 'Academy / Organization',
      key: 'name',
      render: (_: any, record: any) => (
        <div className="flex items-center gap-3">
          {record.logo_url ? (
            <img src={record.logo_url} alt="" className="w-8 h-8 rounded object-contain border border-gray-100 bg-white" />
          ) : (
            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-700">
              {record.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="font-semibold text-sm text-[#111111]">{record.name}</div>
            <div className="text-xs text-gray-500 font-mono flex items-center gap-1.5">
              <span>/{record.slug}</span>
              {record.domain && <span className="text-blue-500 font-sans text-[11px]">({record.domain})</span>}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Login User ID (Owner)',
      key: 'owner',
      render: (_: any, record: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-semibold text-xs text-gray-900 font-mono select-all">
              {record.owner_email || 'No Owner Assigned'}
            </span>
            {record.owner_email && (
              <Button
                type="text"
                size="small"
                className="!p-0.5 !h-auto text-gray-400 hover:text-blue-600"
                onClick={() => {
                  navigator.clipboard.writeText(record.owner_email);
                  message.success('Login Email copied!');
                }}
                title="Copy Login Email"
              >
                <Copy className="w-3 h-3" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3 text-gray-400" />
              <span>{record.owner_first_name ? `${record.owner_first_name} ${record.owner_last_name || ''}` : 'Owner Account'}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              <span>
                {(() => {
                  if (!record.owner_last_login_at) return 'Never logged in';
                  const formatted = formatLocal(record.owner_last_login_at, 'DD MMM, hh:mm A');
                  return formatted === 'N/A' ? 'Never logged in' : `Active: ${formatted}`;
                })()}
              </span>
            </span>
            {record.owner_last_login_ip && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-mono border border-blue-100" title="Last Login IP Address">
                <Globe className="w-2.5 h-2.5 text-blue-500" />
                {record.owner_last_login_ip}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Plan & License',
      key: 'plan_type',
      render: (_: any, record: any) => {
        const getLicenseStatusTag = () => {
          if (record.license_status === 'DISABLED') {
            return <Tag color="default" className="text-[10px] uppercase font-semibold">Disabled</Tag>;
          }
          if (record.license_status === 'EXPIRED') {
            return <Tag color="error" className="text-[10px] uppercase font-bold">Expired</Tag>;
          }
          if (record.license_status === 'EXPIRING_SOON') {
            return <Tag color="warning" className="text-[10px] uppercase font-bold animate-pulse">Expiring ({record.days_remaining}d left)</Tag>;
          }
          return <Tag color="success" className="text-[10px] uppercase font-semibold">Active</Tag>;
        };

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag color={getPlanColor(record.plan_type)} className="font-bold text-xs uppercase px-1.5 py-0.5 m-0">
                {record.plan_type}
              </Tag>
              <Tag className="text-[10px] font-mono uppercase px-1.5 py-0.5 m-0 bg-slate-50 text-slate-700 border-slate-200">
                {record.license_type || 'SUBSCRIPTION'}
              </Tag>
              {getLicenseStatusTag()}
              <Button
                size="small"
                type="text"
                className="!p-0.5 !h-auto text-gray-400 hover:text-blue-600"
                icon={<Edit2 className="w-3 h-3" />}
                onClick={() => handleOpenManageModal(record)}
                title="Edit Academy Plan & License"
              />
            </div>

            {/* License Dates */}
            <div className="text-[10px] text-gray-500 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5 text-gray-400 shrink-0" />
              <span>
                {record.license_end_date ? (
                  <>Expires: <span className="font-medium text-gray-700">{formatLocal(record.license_end_date, 'DD MMM YYYY')}</span></>
                ) : (
                  <span className="text-gray-400">No expiration (Perpetual)</span>
                )}
              </span>
            </div>

            {/* Portal Visibility Switch Indicator */}
            <div className="text-[10px] flex items-center gap-1">
              {record.show_plan_tier_to_org === false ? (
                <span className="text-amber-600 flex items-center gap-1 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                  <EyeOff className="w-2.5 h-2.5" /> Org Portal: Plan Hidden
                </span>
              ) : (
                <span className="text-emerald-700 flex items-center gap-1 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                  <Eye className="w-2.5 h-2.5" /> Org Portal: Plan Visible
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Students Quota',
      key: 'students',
      render: (_: any, record: any) => (
        <div className="text-xs">
          <span className="font-semibold text-gray-900">{record.student_count || 0}</span>
          <span className="text-gray-400"> / {record.max_students > 50000 ? 'Unlimited' : record.max_students}</span>
        </div>
      ),
    },
    {
      title: 'Courses Quota',
      key: 'courses',
      render: (_: any, record: any) => (
        <div className="text-xs">
          <span className="font-semibold text-gray-900">{record.course_count || 0}</span>
          <span className="text-gray-400"> / {record.max_courses > 5000 ? 'Unlimited' : record.max_courses}</span>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'error'}>{status}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="small"
            type="primary"
            ghost
            icon={<LogIn className="w-3 h-3 mr-1" />}
            onClick={() => handleEnterAcademy(record)}
            className="text-xs font-medium !border-blue-500 !text-blue-600 hover:!bg-blue-50"
          >
            Enter Academy
          </Button>

          <Button
            size="small"
            icon={<KeyRound className="w-3 h-3 text-amber-600" />}
            onClick={() => handleOpenResetPassword(record)}
            className="text-xs"
            title="Reset Owner Password"
          >
            Reset Pwd
          </Button>

          <Button
            size="small"
            onClick={() => handleOpenManageModal(record)}
            className="text-xs"
          >
            Settings
          </Button>

          {record.status === 'ACTIVE' ? (
            <Popconfirm
              title="Suspend Organization?"
              description="Users belonging to this organization will be blocked from accessing courses."
              onConfirm={() => toggleStatusMutation.mutate({ orgId: record.id, action: 'Suspend' })}
            >
              <Button size="small" danger icon={<Ban className="w-3 h-3" />}>
                Suspend
              </Button>
            </Popconfirm>
          ) : (
            <Button
              size="small"
              icon={<CheckCircle className="w-3 h-3 text-emerald-600" />}
              onClick={() => toggleStatusMutation.mutate({ orgId: record.id, action: 'Activate' })}
            >
              Activate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <RbaPageHeader
        title="Organizations Directory"
        subtitle="Manage customer academies, configure branding & logos, reset owner credentials, and manage tenant quotas"
        action={
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Organization
          </Button>
        }
      />

      <Card className="!rounded-xl border border-[#e5e5e5]">
        <div className="mb-4 max-w-sm">
          <Input
            prefix={<Search className="w-4 h-4 text-gray-400 mr-1" />}
            placeholder="Search academies by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Table
          columns={columns}
          dataSource={orgsData?.data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 'max-content' }}
          pagination={false}
        />
      </Card>

      {/* Manage Academy & Plan Modal */}
      <Modal
        title={`Manage Academy — ${selectedOrg?.name}`}
        open={isManageModalOpen}
        onCancel={() => setIsManageModalOpen(false)}
        footer={null}
        width={540}
      >
        <Tabs
          defaultActiveKey="plan"
          items={[
            {
              key: 'plan',
              label: 'Subscription Tier & Quotas',
              children: (
                <Form
                  form={managePlanForm}
                  layout="vertical"
                  onFinish={(vals) => updatePlanMutation.mutate(vals)}
                  className="mt-2"
                >
                  <Form.Item name="planType" label="Subscription Plan Tier" rules={[{ required: true }]}>
                    <Select
                      onChange={(val) => {
                        if (val === 'STARTER') {
                          managePlanForm.setFieldsValue({ maxStudents: 200, maxCourses: 25 });
                        } else if (val === 'BUSINESS') {
                          managePlanForm.setFieldsValue({ maxStudents: 2000, maxCourses: 200 });
                        } else if (val === 'ENTERPRISE') {
                          managePlanForm.setFieldsValue({ maxStudents: 100000, maxCourses: 10000 });
                        }
                      }}
                    >
                      <Select.Option value="STARTER">Starter Tier (Up to 200 Students)</Select.Option>
                      <Select.Option value="BUSINESS">Business Tier (Up to 2,000 Students)</Select.Option>
                      <Select.Option value="ENTERPRISE">Enterprise Tier (Unlimited / Custom)</Select.Option>
                    </Select>
                  </Form.Item>

                  <div className="grid grid-cols-2 gap-4">
                    <Form.Item name="maxStudents" label="Max Students" rules={[{ required: true }]}>
                      <InputNumber min={10} max={1000000} className="w-full" />
                    </Form.Item>
                    <Form.Item name="maxCourses" label="Max Courses" rules={[{ required: true }]}>
                      <InputNumber min={1} max={100000} className="w-full" />
                    </Form.Item>
                  </div>

                  <div className="border-t border-gray-100 pt-3 mt-1 mb-3">
                    <div className="text-xs font-semibold text-gray-800 flex items-center gap-1.5 mb-2">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      License Validity & Org Portal Visibility
                    </div>

                    <Form.Item name="licenseType" label="License Type" initialValue="SUBSCRIPTION">
                      <Select>
                        <Select.Option value="SUBSCRIPTION">Subscription (Standard SaaS)</Select.Option>
                        <Select.Option value="ANNUAL">Annual Contract</Select.Option>
                        <Select.Option value="TRIAL">Trial Period</Select.Option>
                        <Select.Option value="ENTERPRISE">Enterprise Multi-Year</Select.Option>
                        <Select.Option value="LIFETIME">Lifetime Perpetual</Select.Option>
                      </Select>
                    </Form.Item>

                    <div className="grid grid-cols-2 gap-4">
                      <Form.Item name="licenseStartDate" label="License Start Date">
                        <DatePicker className="w-full" placeholder="Start Date" format="YYYY-MM-DD" />
                      </Form.Item>
                      <Form.Item name="licenseEndDate" label="License End Date" tooltip="When reached, the academy license will expire and trigger renewal alerts">
                        <DatePicker className="w-full" placeholder="End Date" format="YYYY-MM-DD" />
                      </Form.Item>
                    </div>

                    <Form.Item
                      name="licenseWarningDays"
                      label="Expiry Warning Threshold (Days)"
                      tooltip="Number of days before expiration to show the 'Expiring Soon' alert popup (Default: 2 days)"
                      initialValue={2}
                    >
                      <InputNumber min={1} max={90} className="w-full" addonAfter="days before expiry" />
                    </Form.Item>

                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-3 mt-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-medium text-gray-900">License Status Active</div>
                          <div className="text-[11px] text-gray-500">Disable switch to immediately block/suspend academy license</div>
                        </div>
                        <Form.Item name="licenseIsActive" valuePropName="checked" noStyle initialValue={true}>
                          <Switch checkedChildren="Active" unCheckedChildren="Off" />
                        </Form.Item>
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-200/60 pt-2.5">
                        <div>
                          <div className="text-xs font-medium text-gray-900">Show Plan Tier in Org Portal</div>
                          <div className="text-[11px] text-gray-500">If switched off, plan badges and tier details are hidden from the academy view</div>
                        </div>
                        <Form.Item name="showPlanTierToOrg" valuePropName="checked" noStyle initialValue={true}>
                          <Switch checkedChildren="Visible" unCheckedChildren="Hidden" />
                        </Form.Item>
                      </div>
                    </div>
                  </div>

                  <Button type="primary" htmlType="submit" loading={updatePlanMutation.isPending} block className="mt-3">
                    Save Plan, License & Visibility Settings
                  </Button>
                </Form>
              ),
            },
            {
              key: 'profile',
              label: 'Academy Identity & Logo',
              children: (
                <Form
                  form={manageProfileForm}
                  layout="vertical"
                  onFinish={(vals) => updateProfileMutation.mutate(vals)}
                  className="mt-2"
                >
                  <Form.Item name="name" label="Academy Name" rules={[{ required: true }]}>
                    <Input placeholder="Academy Name" />
                  </Form.Item>

                  <Form.Item name="slug" label="Subdomain / Slug" rules={[{ required: true }]}>
                    <Input placeholder="slug" />
                  </Form.Item>

                  <Form.Item name="domain" label="Custom Domain (CNAME)">
                    <Input placeholder="learn.academy.com" />
                  </Form.Item>

                  <Form.Item name="logoUrl" label="Academy Logo Image URL" tooltip="Direct HTTPS image link to logo or upload one directly">
                    <div className="flex gap-2">
                      <Input placeholder="https://domain.com/logo.png" className="flex-1" />
                      <Upload
                        showUploadList={false}
                        accept="image/*"
                        beforeUpload={async (file) => {
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const msg = message.loading('Uploading logo...', 0);
                            const res = await ApiClient.post(`/superadmin/UploadOrganizationLogo/${selectedOrg.id}`, formData, {
                              headers: { 'Content-Type': 'multipart/form-data' },
                            });
                            msg();
                            message.success('Logo uploaded successfully');
                            manageProfileForm.setFieldsValue({ logoUrl: res.data?.data?.url });
                          } catch (err: any) {
                            message.destroy();
                            message.error(err.response?.data?.message || 'Failed to upload logo');
                          }
                          return false;
                        }}
                      >
                        <Button>Upload Photo</Button>
                      </Upload>
                    </div>
                  </Form.Item>

                  <Button type="primary" htmlType="submit" loading={updateProfileMutation.isPending} block>
                    Update Academy Identity
                  </Button>
                </Form>
              ),
            },
            {
              key: 'owner',
              label: 'Login User & Owner Account',
              children: (
                <Form
                  form={manageOwnerForm}
                  layout="vertical"
                  onFinish={(vals) => updateOwnerMutation.mutate(vals)}
                  className="mt-2"
                >
                  <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 mb-3">
                    <div className="font-semibold flex items-center gap-1.5 mb-1">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      Current Login User ID (Email):
                    </div>
                    <div className="font-mono text-xs font-bold text-blue-900">{selectedOrg?.owner_email || 'No email assigned'}</div>
                    <div className="text-[11px] text-gray-500 mt-1 flex items-center justify-between">
                      <span>Name: {selectedOrg?.owner_first_name} {selectedOrg?.owner_last_name}</span>
                      <span className="font-mono text-[10px]">UID: {selectedOrg?.owner_user_id}</span>
                    </div>
                  </div>

                  <Form.Item
                    name="email"
                    label="Login Email Address (User ID)"
                    rules={[{ required: true, type: 'email', message: 'Valid email is required' }]}
                    tooltip="This is the username used to sign in to the academy portal"
                  >
                    <Input prefix={<Mail className="w-4 h-4 text-gray-400 mr-1" />} placeholder="owner@domain.com" />
                  </Form.Item>

                  <div className="grid grid-cols-2 gap-3">
                    <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
                      <Input placeholder="First Name" />
                    </Form.Item>
                    <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
                      <Input placeholder="Last Name" />
                    </Form.Item>
                  </div>

                  <Form.Item name="phone" label="Contact Phone">
                    <Input placeholder="+1 234 567 8900" />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    label="Override Password (Optional)"
                    extra="Leave blank to keep existing password unchanged"
                  >
                    <Input.Password placeholder="Enter new password to change" />
                  </Form.Item>

                  <Button type="primary" htmlType="submit" loading={updateOwnerMutation.isPending} block>
                    Save Owner Account & Login Credentials
                  </Button>
                </Form>
              ),
            },
          ]}
        />
      </Modal>

      {/* Super Admin Reset Owner Password Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>Reset Owner Password & Login ID — {selectedOrg?.name}</span>
          </div>
        }
        open={isResetPwdModalOpen}
        onCancel={() => setIsResetPwdModalOpen(false)}
        onOk={() => resetPwdForm.validateFields().then((vals) => resetPasswordMutation.mutate(vals))}
        confirmLoading={resetPasswordMutation.isPending}
        okText="Update Password & Login ID"
        width={480}
      >
        <div className="py-2">
          {/* Current Login Account Display */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 mb-4 text-xs text-amber-950">
            <div className="font-semibold text-xs flex items-center gap-1.5 text-amber-900 mb-1">
              <User className="w-3.5 h-3.5 text-amber-700" />
              Current Login User Account:
            </div>
            <div className="flex items-center justify-between font-mono bg-white px-2.5 py-1.5 rounded border border-amber-200 mt-1">
              <span className="font-bold text-gray-900 select-all">{selectedOrg?.owner_email || 'No email assigned'}</span>
              {selectedOrg?.owner_email && (
                <Button
                  size="small"
                  type="text"
                  icon={<Copy className="w-3 h-3 text-gray-500" />}
                  onClick={() => {
                    navigator.clipboard.writeText(selectedOrg.owner_email);
                    message.success('Email copied to clipboard');
                  }}
                >
                  Copy
                </Button>
              )}
            </div>
            <div className="text-[11px] text-gray-500 mt-1.5 flex items-center justify-between">
              <span>Owner: <strong>{selectedOrg?.owner_first_name} {selectedOrg?.owner_last_name}</strong></span>
              <span className="font-mono text-[10px]">ID: {selectedOrg?.owner_user_id?.slice(0, 8)}...</span>
            </div>
          </div>

          <Form form={resetPwdForm} layout="vertical">
            <Form.Item
              name="ownerEmail"
              label="Login Email Address (User ID)"
              tooltip="You can update the owner's login email ID here if needed"
              rules={[{ required: true, type: 'email', message: 'Valid email is required' }]}
            >
              <Input prefix={<Mail className="w-4 h-4 text-gray-400 mr-1" />} placeholder="owner@academy.com" />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label="New Password"
              extra="Leave blank to default to: OrgOwner@2026!"
            >
              <Input.Password
                prefix={<KeyRound className="w-4 h-4 text-gray-400 mr-1" />}
                placeholder="Default: OrgOwner@2026!"
              />
            </Form.Item>

            <div className="flex justify-end mb-2">
              <Button
                size="small"
                type="dashed"
                icon={<Sparkles className="w-3.5 h-3.5 text-amber-600" />}
                onClick={() => {
                  const gen = `Pass@${Math.floor(1000 + Math.random() * 9000)}!`;
                  resetPwdForm.setFieldsValue({ newPassword: gen });
                  message.info(`Generated password: ${gen}`);
                }}
              >
                Generate Random Password
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      {/* Reset Password Success Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle className="w-5 h-5" />
            <span>Password Reset Completed!</span>
          </div>
        }
        open={!!resetResult}
        onCancel={() => setResetResult(null)}
        footer={[
          <Button key="close" onClick={() => setResetResult(null)}>
            Done
          </Button>,
          <Button
            key="copy"
            type="primary"
            icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            onClick={() => {
              if (resetResult) {
                navigator.clipboard.writeText(
                  `Academy: ${resetResult.orgName}\nOwner Email: ${resetResult.ownerEmail}\nNew Password: ${resetResult.newPassword}`
                );
                setCopied(true);
                message.success('New credentials copied!');
                setTimeout(() => setCopied(false), 3000);
              }
            }}
          >
            {copied ? 'Copied' : 'Copy New Credentials'}
          </Button>,
        ]}
        width={460}
      >
        <div className="py-2 text-xs">
          <p className="text-gray-600 mb-3">
            The owner password for <strong>{resetResult?.orgName}</strong> has been updated successfully:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono space-y-2">
            <div>Owner Email: <strong>{resetResult?.ownerEmail}</strong></div>
            <div>
              New Password:{' '}
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {resetResult?.newPassword}
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Create Organization Modal */}
      <Modal
        title="Create New Organization Tenant"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onOk={() => createForm.validateFields().then((vals) => createMutation.mutate(vals))}
        confirmLoading={createMutation.isPending}
        width={880}
      >
        <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 mb-4">
          <strong>Tenant Provisioning:</strong> Creating an academy creates an isolated organization schema, default branding themes, and provisions the initial Owner account.
        </div>

        <Form form={createForm} layout="vertical" className="mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* LEFT COLUMN: Academy Details & Owner Provisioning */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 pb-2 border-b border-gray-200 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <Building className="w-4 h-4 text-blue-600" />
                <span>Academy & Subscription Tier</span>
              </div>

              <Form.Item name="name" label="Organization / Academy Name" rules={[{ required: true, message: 'Please enter academy name' }]}>
                <Input placeholder="e.g. Apex Coding Academy" />
              </Form.Item>

              <Form.Item
                name="slug"
                label="Subdomain / Slug"
                rules={[{ required: true, message: 'Please enter unique slug' }]}
                tooltip="Lowercase letters, numbers, and dashes only"
              >
                <Input placeholder="apex-academy" />
              </Form.Item>

              <Form.Item name="planType" label="Subscription Plan Tier" initialValue="STARTER">
                <Select>
                  <Select.Option value="STARTER">Starter Tier (₹1,999/mo · 200 Students · 25 Courses)</Select.Option>
                  <Select.Option value="BUSINESS">Business Tier (₹7,999/mo · 2,000 Students · 200 Courses)</Select.Option>
                  <Select.Option value="ENTERPRISE">Enterprise Tier (Custom · Unlimited Students & Courses)</Select.Option>
                </Select>
              </Form.Item>

              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>Owner Account Provisioning</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  The owner will use these credentials to log in to their dedicated academy portal at <code>/login</code>.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <Form.Item name="ownerFirstName" label="First Name" rules={[{ required: true, message: 'First name is required' }]}>
                    <Input placeholder="e.g. Rahul" />
                  </Form.Item>
                  <Form.Item name="ownerLastName" label="Last Name" rules={[{ required: true, message: 'Last name is required' }]}>
                    <Input placeholder="e.g. Sharma" />
                  </Form.Item>
                </div>

                <Form.Item name="ownerEmail" label="Owner Email" rules={[{ required: true, message: 'Owner email is required' }]}>
                  <Input placeholder="e.g. owner@apexacademy.com" />
                </Form.Item>

                <Form.Item
                  name="ownerPassword"
                  label="Owner Initial Password"
                  extra={<span className="text-gray-400">Leave blank to use default password: <code>OrgOwner@2026!</code></span>}
                >
                  <Input.Password placeholder="Default: OrgOwner@2026!" />
                </Form.Item>
              </div>
            </div>

            {/* RIGHT COLUMN: License & Expiry Configuration */}
            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200 space-y-3">
              <div className="flex items-center gap-1.5 pb-2 border-b border-gray-200 text-xs font-bold text-gray-800 uppercase tracking-wide">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>License & Expiry Configuration</span>
              </div>

              <Form.Item name="licenseType" label="License Type" initialValue="SUBSCRIPTION">
                <Select>
                  <Select.Option value="SUBSCRIPTION">Subscription (Standard SaaS)</Select.Option>
                  <Select.Option value="ANNUAL">Annual Contract</Select.Option>
                  <Select.Option value="TRIAL">Trial Period</Select.Option>
                  <Select.Option value="ENTERPRISE">Enterprise Multi-Year</Select.Option>
                  <Select.Option value="LIFETIME">Lifetime Perpetual</Select.Option>
                </Select>
              </Form.Item>

              <div className="grid grid-cols-2 gap-3">
                <Form.Item name="licenseStartDate" label="License Start Date">
                  <DatePicker className="w-full" placeholder="Start Date" format="YYYY-MM-DD" />
                </Form.Item>
                <Form.Item name="licenseEndDate" label="License End Date" tooltip="When reached, the academy license will expire and trigger renewal alerts">
                  <DatePicker className="w-full" placeholder="End Date" format="YYYY-MM-DD" />
                </Form.Item>
              </div>

              <Form.Item
                name="licenseWarningDays"
                label="Expiry Warning Threshold (Days)"
                tooltip="Days before expiration to show 'Expiring Soon' alert popup (Default: 2 days)"
                initialValue={2}
              >
                <InputNumber min={1} max={90} className="w-full" addonAfter="days before expiry" />
              </Form.Item>

              <div className="bg-white rounded-xl p-3 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-900">License Status Active</div>
                    <div className="text-[11px] text-gray-500">Enable or disable this organization's active license</div>
                  </div>
                  <Form.Item name="licenseIsActive" valuePropName="checked" noStyle initialValue={true}>
                    <Switch checkedChildren="Active" unCheckedChildren="Off" />
                  </Form.Item>
                </div>

                <div className="flex items-center justify-between border-t border-gray-200/60 pt-2.5">
                  <div>
                    <div className="text-xs font-medium text-gray-900">Show Plan Tier in Org Portal</div>
                    <div className="text-[11px] text-gray-500">Hide or show plan tier & quotas in the academy portal</div>
                  </div>
                  <Form.Item name="showPlanTierToOrg" valuePropName="checked" noStyle initialValue={true}>
                    <Switch checkedChildren="Visible" unCheckedChildren="Hidden" />
                  </Form.Item>
                </div>
              </div>
            </div>
          </div>
        </Form>
      </Modal>

      {/* Created Credentials Success Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle className="w-5 h-5" />
            <span>Academy Created Successfully!</span>
          </div>
        }
        open={!!createdCredentials}
        onCancel={() => setCreatedCredentials(null)}
        footer={[
          <Button key="close" onClick={() => setCreatedCredentials(null)}>
            Dismiss
          </Button>,
          <Button
            key="copy"
            icon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            onClick={() => {
              if (createdCredentials) {
                const text = `=== ACADEMY LOGIN CREDENTIALS ===\nAcademy: ${createdCredentials.orgName}\nPortal URL: ${window.location.origin}/login\nOwner Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nRole: Organization Owner`;
                navigator.clipboard.writeText(text);
                setCopied(true);
                message.success('Academy credentials copied to clipboard!');
                setTimeout(() => setCopied(false), 3000);
              }
            }}
          >
            {copied ? 'Copied Details' : 'Copy Credentials'}
          </Button>,
          <Button
            key="enter"
            type="primary"
            icon={<ExternalLink className="w-4 h-4" />}
            onClick={() => {
              if (createdCredentials?.id) {
                handleEnterAcademy({ id: createdCredentials.id, name: createdCredentials.orgName, slug: createdCredentials.slug });
              } else {
                navigate('/organization/dashboard');
              }
            }}
          >
            Enter Academy Now
          </Button>,
        ]}
        width={500}
      >
        <div className="py-2">
          <p className="text-xs text-gray-600 mb-4">
            Share these login credentials with the Academy Owner. They can sign in at the main login page to start managing staff, building courses, and enrolling students.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 font-mono text-xs space-y-2.5">
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500">Academy Name:</span>
              <span className="font-semibold text-gray-900">{createdCredentials?.orgName}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500">Subdomain / Slug:</span>
              <span className="text-indigo-600 font-semibold">/{createdCredentials?.slug}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500">Login URL:</span>
              <span className="text-gray-900 underline font-sans">{window.location.origin}/login</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500">Owner Email:</span>
              <span className="font-bold text-gray-900">{createdCredentials?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Initial Password:</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {createdCredentials?.password}
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
            <strong>Note for Super Admin:</strong> You can also jump into this academy's dashboard at any time without their password by clicking the <strong>"Enter Academy"</strong> button in the Organizations table.
          </div>
        </div>
      </Modal>
    </div>
  );
};
