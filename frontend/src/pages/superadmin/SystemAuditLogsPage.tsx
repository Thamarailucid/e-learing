import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Card, Tag, Modal, Input, Select, DatePicker, Button, Tooltip, Row, Col } from 'antd';
import {
  ShieldAlert,
  Eye,
  Search,
  RotateCcw,
  LogIn,
  KeyRound,
  CreditCard,
  Users,
  Gift,
  Globe,
  Check,
  Copy,
  RefreshCw,
  Activity,
  FileText,
  Building,
  Shield,
  Ban,
  CheckCircle,
} from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { ApiClient } from '../../services/api/ApiClient';
import { RbaPageHeader } from '../../components/common/RbaPageHeader';
import { formatFriendlyLocal } from '../../utils/dateTimeUtils';

const { RangePicker } = DatePicker;

interface ActionDisplayInfo {
  label: string;
  category: string;
  color: string;
  icon: React.ReactNode;
}

const getActionDisplay = (action: string): ActionDisplayInfo => {
  switch (action) {
    case 'USER_LOGIN':
      return {
        label: 'User Login',
        category: 'Auth',
        color: 'success',
        icon: <LogIn className="w-3.5 h-3.5 inline mr-1" />,
      };
    case 'SECURITY_PIRACY_VIOLATION':
      return {
        label: 'Piracy Violation',
        category: 'Security',
        color: 'error',
        icon: <ShieldAlert className="w-3.5 h-3.5 inline mr-1" />,
      };
    case 'PLAN_TIER_UPDATED':
      return {
        label: 'Plan Updated',
        category: 'Plan',
        color: 'purple',
        icon: <CreditCard className="w-3.5 h-3.5 inline mr-1" />,
      };
    case 'ORGANIZATION_CREATED':
      return {
        label: 'Organization Created',
        category: 'Organization',
        color: 'purple',
        icon: <Building className="w-3.5 h-3.5 inline mr-1" />,
      };
    case 'ORGANIZATION_SUSPENDED':
      return {
        label: 'Organization Suspended',
        category: 'Organization',
        color: 'red',
        icon: <Ban className="w-3.5 h-3.5 inline mr-1" />,
      };
    case 'ORGANIZATION_ACTIVATED':
      return {
        label: 'Organization Activated',
        category: 'Organization',
        color: 'green',
        icon: <CheckCircle className="w-3.5 h-3.5 inline mr-1" />,
      };
    case 'ORGANIZATION_PROFILE_UPDATED':
      return {
        label: 'Org Profile Updated',
        category: 'Organization',
        color: 'blue',
        icon: <Building className="w-3.5 h-3.5 inline mr-1" />,
      };
    case 'ORGANIZATION_OWNER_UPDATED':
      return {
        label: 'Org Owner Updated',
        category: 'Organization',
        color: 'cyan',
        icon: <Users className="w-3.5 h-3.5 inline mr-1" />,
      };
    case 'STUDENT_PASSWORD_RESET':
      return {
        label: 'Student Password Reset',
        category: 'Password',
        color: 'gold',
        icon: <KeyRound className="w-3.5 h-3.5 inline mr-1" />,
      };
    case 'STAFF_PASSWORD_RESET':
      return {
        label: 'Staff Password Reset',
        category: 'Password',
        color: 'orange',
        icon: <KeyRound className="w-3.5 h-3.5 inline mr-1" />,
      };
    case 'SUPER_ADMIN_PASSWORD_RESET':
      return {
        label: 'Super Admin Reset',
        category: 'Password',
        color: 'volcano',
        icon: <KeyRound className="w-3.5 h-3.5 inline mr-1" />,
      };
    case 'FIRST_TIME_PASSWORD_RESET':
      return {
        label: 'Initial Password Reset',
        category: 'Password',
        color: 'blue',
        icon: <KeyRound className="w-3.5 h-3.5 inline mr-1" />,
      };
    case 'CAMPAIGN_COURSE_REDEEMED':
      return {
        label: 'Campaign Redeemed',
        category: 'Campaign',
        color: 'cyan',
        icon: <Gift className="w-3.5 h-3.5 inline mr-1" />,
      };
    case 'STAFF_REGISTER_VIA_INVITE':
      return {
        label: 'Staff Joined via Invite',
        category: 'Staff',
        color: 'geekblue',
        icon: <Users className="w-3.5 h-3.5 inline mr-1" />,
      };
    default:
      if (action.includes('SECURITY') || action.includes('VIOLATION')) {
        return {
          label: action.replace(/_/g, ' '),
          category: 'Security',
          color: 'error',
          icon: <ShieldAlert className="w-3.5 h-3.5 inline mr-1" />,
        };
      }
      if (action.includes('LOGIN')) {
        return {
          label: action.replace(/_/g, ' '),
          category: 'Auth',
          color: 'success',
          icon: <LogIn className="w-3.5 h-3.5 inline mr-1" />,
        };
      }
      if (action.includes('PASSWORD')) {
        return {
          label: action.replace(/_/g, ' '),
          category: 'Password',
          color: 'orange',
          icon: <KeyRound className="w-3.5 h-3.5 inline mr-1" />,
        };
      }
      if (action.includes('STAFF')) {
        return {
          label: action.replace(/_/g, ' '),
          category: 'Staff',
          color: 'blue',
          icon: <Users className="w-3.5 h-3.5 inline mr-1" />,
        };
      }
      if (action.includes('COURSE')) {
        return {
          label: action.replace(/_/g, ' '),
          category: 'Course',
          color: 'cyan',
          icon: <FileText className="w-3.5 h-3.5 inline mr-1" />,
        };
      }
      if (action.includes('PLAN') || action.includes('ORGANIZATION')) {
        return {
          label: action.replace(/_/g, ' '),
          category: 'Plan',
          color: 'purple',
          icon: <CreditCard className="w-3.5 h-3.5 inline mr-1" />,
        };
      }
      return {
        label: action.replace(/_/g, ' '),
        category: 'System',
        color: 'default',
        icon: <Activity className="w-3.5 h-3.5 inline mr-1" />,
      };
  }
};

export const SystemAuditLogsPage: React.FC = () => {
  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filter States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [action, setAction] = useState('ALL');
  const [resource, setResource] = useState('ALL');
  const [organizationId, setOrganizationId] = useState('ALL');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  // Modal State
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Fetch filter options & summary stats
  const { data: filterOptions, refetch: refetchFilterOptions } = useQuery({
    queryKey: ['audit-log-filter-options'],
    queryFn: async () => {
      const res = await ApiClient.get('/superadmin/GetAuditLogFilterOptions');
      return res.data?.data;
    },
    refetchInterval: false,
  });

  // Calculate start and end ISO dates for query
  const startDate = dateRange?.[0] ? dateRange[0].startOf('day').toISOString() : undefined;
  const endDate = dateRange?.[1] ? dateRange[1].endOf('day').toISOString() : undefined;

  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('pageSize', pageSize.toString());
  if (search.trim()) queryParams.set('search', search.trim());
  if (category !== 'ALL') queryParams.set('category', category);
  if (action !== 'ALL') queryParams.set('action', action);
  if (resource !== 'ALL') queryParams.set('resource', resource);
  if (organizationId !== 'ALL') queryParams.set('organizationId', organizationId);
  if (startDate) queryParams.set('startDate', startDate);
  if (endDate) queryParams.set('endDate', endDate);

  // Fetch logs with filters
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      'system-audit-logs',
      page,
      pageSize,
      search,
      category,
      action,
      resource,
      organizationId,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const res = await ApiClient.get(`/superadmin/GetPlatformAuditLogList?${queryParams.toString()}`);
      return res.data;
    },
    refetchInterval: false,
  });

  // Count active filters
  const activeFiltersCount = [
    Boolean(search.trim()),
    category !== 'ALL',
    action !== 'ALL',
    resource !== 'ALL',
    organizationId !== 'ALL',
    Boolean(dateRange),
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setSearch('');
    setCategory('ALL');
    setAction('ALL');
    setResource('ALL');
    setOrganizationId('ALL');
    setDateRange(null);
    setPage(1);
  };

  const handleCopyJson = (content: any) => {
    navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = filterOptions?.stats || {
    totalEvents: 0,
    securityEvents: 0,
    authEvents: 0,
    adminEvents: 0,
  };

  const columns = [
    {
      title: 'Timestamp (IST)',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 210,
      render: (date: string) => (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-gray-800">
            {formatFriendlyLocal(date)}
          </span>
          <span className="text-[11px] text-gray-400 font-mono">
            {dayjs(date).format('YYYY-MM-DD HH:mm:ss')}
          </span>
        </div>
      ),
    },
    {
      title: 'Action / Type',
      dataIndex: 'action',
      key: 'action',
      width: 220,
      render: (actionStr: string) => {
        const display = getActionDisplay(actionStr);
        return (
          <Tooltip title={`System Action Code: ${actionStr}`}>
            <Tag color={display.color} className="text-xs font-medium py-0.5 px-2 !rounded-md inline-flex items-center">
              {display.icon}
              {display.label}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Resource',
      dataIndex: 'resource',
      key: 'resource',
      width: 170,
      render: (res: string, record: any) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
            {res}
          </span>
          {record.resource_id && (
            <Tooltip title={`Resource ID: ${record.resource_id}`}>
              <span className="text-[11px] text-gray-400 font-mono truncate max-w-[140px] block cursor-pointer hover:text-gray-600">
                {record.resource_id.length > 16
                  ? `${record.resource_id.slice(0, 8)}...${record.resource_id.slice(-6)}`
                  : record.resource_id}
              </span>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Organization',
      dataIndex: 'organization_name',
      key: 'organization_name',
      width: 190,
      render: (org: string) =>
        org ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-900 font-medium">
            <Building className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span className="truncate">{org}</span>
          </div>
        ) : (
          <Tag color="default" className="text-xs text-gray-500 !rounded inline-flex items-center gap-1">
            <Globe className="w-3 h-3" /> Platform Global
          </Tag>
        ),
    },
    {
      title: 'Performed By',
      dataIndex: 'user_email',
      key: 'user_email',
      width: 200,
      render: (email: string, record: any) => {
        const fullName = [record.user_first_name, record.user_last_name].filter(Boolean).join(' ');
        return (
          <div className="flex flex-col">
            {fullName ? (
              <span className="text-xs font-semibold text-gray-900">{fullName}</span>
            ) : null}
            <span className="text-xs text-gray-600 font-mono truncate max-w-[180px]">
              {email || 'System'}
            </span>
          </div>
        );
      },
    },
    {
      title: 'IP Address',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 140,
      render: (ip: string) => (
        <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded inline-flex items-center gap-1">
          <Globe className="w-3 h-3 text-gray-400" />
          {ip || '—'}
        </span>
      ),
    },
    {
      title: 'Details',
      key: 'details',
      width: 110,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Button
          size="small"
          type="link"
          icon={<Eye className="w-3.5 h-3.5" />}
          onClick={() => setSelectedRecord(record)}
          className="text-xs text-blue-600 hover:text-blue-700 !px-2 inline-flex items-center gap-1"
        >
          View Data
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <RbaPageHeader
          title="Platform Security & System Audit Logs"
          subtitle="Real-time, immutable audit trail tracking administrative actions, user logins, security violations, and tenant updates"
        />
        <Button
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />}
          onClick={() => {
            refetch();
            refetchFilterOptions();
          }}
          className="!rounded-lg text-xs font-medium self-start md:self-auto"
        >
          Refresh Logs
        </Button>
      </div>

      {/* Summary Metrics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card className="!rounded-xl border border-gray-200 hover:shadow-sm transition-all !bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Audit Events</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.totalEvents.toLocaleString()}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="!rounded-xl border border-gray-200 hover:shadow-sm transition-all !bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-rose-600 uppercase tracking-wider">Security Incidents</p>
                <h3 className="text-2xl font-bold text-rose-600 mt-1">
                  {stats.securityEvents.toLocaleString()}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="!rounded-xl border border-gray-200 hover:shadow-sm transition-all !bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Auth Logins</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                  {stats.authEvents.toLocaleString()}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <LogIn className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="!rounded-xl border border-gray-200 hover:shadow-sm transition-all !bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">Admin & Plan Events</p>
                <h3 className="text-2xl font-bold text-purple-600 mt-1">
                  {stats.adminEvents.toLocaleString()}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filter Toolbar Card */}
      <Card className="!rounded-xl border border-gray-200 shadow-sm !p-4">
        <div className="space-y-4">
          {/* Top Row: Search + Date Range + Reset Button */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Free text search */}
            <div className="md:col-span-5">
              <Input
                prefix={<Search className="w-4 h-4 text-gray-400 mr-1" />}
                placeholder="Search by email, name, IP address, resource ID, action..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                allowClear
                className="!rounded-lg h-10 text-xs"
              />
            </div>

            {/* Date Range Picker */}
            <div className="md:col-span-5">
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  setDateRange(dates as [Dayjs | null, Dayjs | null]);
                  setPage(1);
                }}
                className="w-full !rounded-lg h-10 text-xs"
                presets={[
                  { label: 'Today', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
                  { label: 'Last 7 Days', value: [dayjs().subtract(7, 'day').startOf('day'), dayjs().endOf('day')] },
                  { label: 'Last 30 Days', value: [dayjs().subtract(30, 'day').startOf('day'), dayjs().endOf('day')] },
                  { label: 'This Month', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
                ]}
              />
            </div>

            {/* Reset Filters Button */}
            <div className="md:col-span-2 flex justify-end">
              <Button
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={handleResetFilters}
                disabled={activeFiltersCount === 0}
                className="w-full !rounded-lg h-10 text-xs font-medium inline-flex items-center justify-center"
              >
                Reset Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
              </Button>
            </div>
          </div>

          {/* Bottom Row: Granular Filters (Category, Specific Action, Resource, Organization) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
            {/* Category / Reduced Type */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Type Category
              </label>
              <Select
                value={category}
                onChange={(val) => {
                  setCategory(val);
                  if (val !== 'ALL') setAction('ALL');
                  setPage(1);
                }}
                className="w-full !rounded-lg"
                options={[
                  { value: 'ALL', label: 'All Categories' },
                  { value: 'AUTH', label: '🔐 Authentication (Logins)' },
                  { value: 'PASSWORD', label: '🔑 Password Resets' },
                  { value: 'SECURITY', label: '🛡️ Security & Piracy' },
                  { value: 'PLAN', label: '💳 Plans & Subscriptions' },
                  { value: 'STAFF', label: '👥 Staff Management' },
                  { value: 'CAMPAIGN', label: '🎁 Courses & Campaigns' },
                ]}
              />
            </div>

            {/* Specific Action */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Specific Action
              </label>
              <Select
                value={action}
                onChange={(val) => {
                  setAction(val);
                  setPage(1);
                }}
                className="w-full !rounded-lg"
                showSearch
                optionFilterProp="label"
                options={[
                  { value: 'ALL', label: 'All Actions' },
                  ...(filterOptions?.actions?.map((a: any) => ({
                    value: a.action,
                    label: `${a.action} (${a.count})`,
                  })) || []),
                ]}
              />
            </div>

            {/* Resource */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Target Resource
              </label>
              <Select
                value={resource}
                onChange={(val) => {
                  setResource(val);
                  setPage(1);
                }}
                className="w-full !rounded-lg"
                options={[
                  { value: 'ALL', label: 'All Resources' },
                  ...(filterOptions?.resources?.map((r: string) => ({
                    value: r,
                    label: r,
                  })) || []),
                ]}
              />
            </div>

            {/* Organization */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Tenant / Scope
              </label>
              <Select
                value={organizationId}
                onChange={(val) => {
                  setOrganizationId(val);
                  setPage(1);
                }}
                className="w-full !rounded-lg"
                options={[
                  { value: 'ALL', label: 'All Organizations & Global' },
                  { value: 'global', label: '🌐 Platform Global (System)' },
                  ...(filterOptions?.organizations?.map((org: any) => ({
                    value: org.id,
                    label: org.name,
                  })) || []),
                ]}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card className="!rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading || isFetching}
          scroll={{ x: 1080 }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.pagination?.totalRecords || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '30', '50', '100'],
            showTotal: (total, range) => (
              <span className="text-xs text-gray-500">
                Showing <strong className="text-gray-900">{range[0]}</strong> to{' '}
                <strong className="text-gray-900">{range[1]}</strong> of{' '}
                <strong className="text-gray-900">{total.toLocaleString()}</strong> audit records
              </span>
            ),
            onChange: (p, ps) => {
              setPage(p);
              if (ps !== pageSize) {
                setPageSize(ps);
              }
            },
          }}
        />
      </Card>

      {/* Event Details & Metadata Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Shield className="w-5 h-5 text-blue-600" />
            Audit Event Inspection & Metadata
          </div>
        }
        open={!!selectedRecord}
        onCancel={() => setSelectedRecord(null)}
        width={720}
        footer={[
          <Button
            key="copy"
            icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            onClick={() => handleCopyJson(selectedRecord?.metadata || selectedRecord)}
            className="!rounded-lg text-xs"
          >
            {copied ? 'Copied JSON!' : 'Copy JSON'}
          </Button>,
          <Button
            key="close"
            type="primary"
            onClick={() => setSelectedRecord(null)}
            className="!rounded-lg text-xs"
          >
            Close
          </Button>,
        ]}
      >
        {selectedRecord && (
          <div className="space-y-4 pt-2">
            {/* Event Summary Grid */}
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">Action Code:</span>
                <Tag color={getActionDisplay(selectedRecord.action).color} className="font-mono text-xs font-semibold">
                  {selectedRecord.action}
                </Tag>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Timestamp (IST):</span>
                <span className="font-semibold text-gray-800">
                  {formatFriendlyLocal(selectedRecord.created_at)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Performed By:</span>
                <span className="font-mono text-gray-800">
                  {selectedRecord.user_email || 'System (Internal)'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Client IP Address:</span>
                <span className="font-mono text-gray-800">
                  {selectedRecord.ip_address || '127.0.0.1'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Target Resource:</span>
                <span className="font-mono text-gray-800">
                  {selectedRecord.resource}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Resource ID:</span>
                <span className="font-mono text-gray-800 truncate block">
                  {selectedRecord.resource_id || 'N/A'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400 block mb-0.5">Organization:</span>
                <span className="font-semibold text-gray-800">
                  {selectedRecord.organization_name || 'Platform Global (System Level)'}
                </span>
              </div>
            </div>

            {/* Metadata Payload JSON */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Event Metadata Payload
                </span>
                <span className="text-[11px] text-gray-400">
                  {selectedRecord.metadata ? 'JSONB Document' : 'No custom payload'}
                </span>
              </div>
              <pre className="p-4 bg-slate-950 text-emerald-400 text-xs rounded-xl overflow-x-auto font-mono max-h-80 overflow-y-auto border border-slate-800">
                {JSON.stringify(selectedRecord.metadata || { notice: 'No additional metadata logged for this event' }, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
