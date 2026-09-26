import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Card, Tag, Modal, Form, Input, Select, message } from 'antd';
import { Building2, Users, BookOpen, Award, Plus, Ban, CheckCircle } from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';
import { RbaPageHeader } from '../../components/common/RbaPageHeader';

export const SuperAdminDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Metrics Query
  const { data: metrics } = useQuery({
    queryKey: ['super-admin-dashboard'],
    queryFn: async () => {
      const res = await ApiClient.get('/superadmin/GetSuperAdminDashboard');
      return res.data.data;
    },
  });

  // Organizations Query
  const { data: orgsData, isLoading } = useQuery({
    queryKey: ['super-admin-orgs'],
    queryFn: async () => {
      const res = await ApiClient.get('/superadmin/GetOrganizationList?page=1&pageSize=20');
      return res.data;
    },
  });

  // Create Org Mutation
  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      return ApiClient.post('/superadmin/CreateOrganization', values);
    },
    onSuccess: () => {
      message.success('Organization and Owner account created successfully.');
      queryClient.invalidateQueries({ queryKey: ['super-admin-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-dashboard'] });
      setIsCreateModalOpen(false);
      form.resetFields();
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to create organization.');
    },
  });

  // Suspend/Activate Mutations
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ orgId, action }: { orgId: string; action: 'Suspend' | 'Activate' }) => {
      return ApiClient.post(`/superadmin/${action}Organization/${orgId}`);
    },
    onSuccess: () => {
      message.success('Organization status updated.');
      queryClient.invalidateQueries({ queryKey: ['super-admin-orgs'] });
    },
  });

  const columns = [
    {
      title: 'Organization Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <div>
          <div className="font-semibold text-sm text-[#111111]">{text}</div>
          <div className="text-xs text-gray-500">/{record.slug}</div>
        </div>
      ),
    },
    {
      title: 'Plan Tier',
      dataIndex: 'plan_type',
      key: 'plan_type',
      render: (plan: string) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
          {plan}
        </span>
      ),
    },
    {
      title: 'Students',
      dataIndex: 'student_count',
      key: 'student_count',
      render: (val: number) => <span className="text-xs font-medium">{val || 0}</span>,
    },
    {
      title: 'Courses',
      dataIndex: 'course_count',
      key: 'course_count',
      render: (val: number) => <span className="text-xs font-medium">{val || 0}</span>,
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
        <div className="flex items-center gap-2">
          {record.status === 'ACTIVE' ? (
            <Button
              size="small"
              danger
              icon={<Ban className="w-3 h-3" />}
              onClick={() => toggleStatusMutation.mutate({ orgId: record.id, action: 'Suspend' })}
            >
              Suspend
            </Button>
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
        title="Platform Administration"
        subtitle="Global tenant oversight, metrics, and multi-tenant isolation controls"
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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="!rounded-xl border border-[#e5e5e5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 font-medium">Organizations</div>
              <div className="text-2xl font-bold text-[#111111] mt-1">
                {metrics?.totalOrganizations ?? 0}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="!rounded-xl border border-[#e5e5e5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 font-medium">Total Users</div>
              <div className="text-2xl font-bold text-[#111111] mt-1">
                {metrics?.totalUsers ?? 0}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="!rounded-xl border border-[#e5e5e5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 font-medium">Courses Published</div>
              <div className="text-2xl font-bold text-[#111111] mt-1">
                {metrics?.totalCourses ?? 0}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="!rounded-xl border border-[#e5e5e5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 font-medium">Certificates Issued</div>
              <div className="text-2xl font-bold text-[#111111] mt-1">
                {metrics?.totalCertificatesIssued ?? 0}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Organizations Table */}
      <Card title="Managed Organizations" className="!rounded-xl border border-[#e5e5e5]">
        <Table
          columns={columns}
          dataSource={orgsData?.data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 'max-content' }}
          pagination={false}
        />
      </Card>

      {/* Create Organization Modal */}
      <Modal
        title="Create New Organization Tenant"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onOk={() => form.validateFields().then((vals) => createMutation.mutate(vals))}
        confirmLoading={createMutation.isPending}
        width={560}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="Organization Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Apex Coding Academy" />
          </Form.Item>
          <Form.Item
            name="slug"
            label="Subdomain / Slug"
            rules={[{ required: true }]}
            tooltip="Lowercase letters and numbers only"
          >
            <Input placeholder="apex-academy" />
          </Form.Item>
          <Form.Item name="planType" label="Plan Tier" initialValue="STARTER">
            <Select>
              <Select.Option value="STARTER">Starter Tier (₹1,999/mo)</Select.Option>
              <Select.Option value="BUSINESS">Business Tier (₹7,999/mo)</Select.Option>
              <Select.Option value="ENTERPRISE">Enterprise Tier (Custom)</Select.Option>
            </Select>
          </Form.Item>
          <div className="border-t border-gray-100 pt-4 mt-4">
            <div className="text-xs font-semibold text-gray-800 mb-3">Owner Provisioning</div>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="ownerFirstName" label="First Name" rules={[{ required: true }]}>
                <Input placeholder="Owner name" />
              </Form.Item>
              <Form.Item name="ownerLastName" label="Last Name" rules={[{ required: true }]}>
                <Input placeholder="Last name" />
              </Form.Item>
            </div>
            <Form.Item name="ownerEmail" label="Owner Email" rules={[{ required: true, type: 'email' }]}>
              <Input placeholder="owner@academy.com" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
