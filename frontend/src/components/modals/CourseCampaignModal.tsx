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
} from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';

interface CourseCampaignModalProps {
  open: boolean;
  course: any;
  onClose: () => void;
}

export const CourseCampaignModal: React.FC<CourseCampaignModalProps> = ({
  open,
  course,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('list');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Selected campaign for QR view modal
  const [selectedQrCampaign, setSelectedQrCampaign] = useState<any>(null);

  // Selected campaign for Enrolled Students Drawer
  const [studentsDrawerOpen, setStudentsDrawerOpen] = useState(false);
  const [selectedCampaignForStudents, setSelectedCampaignForStudents] = useState<any>(null);

  const [form] = Form.useForm();

  // 1. Fetch campaigns for this course
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['course-campaigns', course?.id],
    queryFn: async () => {
      if (!course?.id) return [];
      const res = await ApiClient.get(`/campaigns/GetCourseCampaignList/${course.id}`);
      return res.data?.data || [];
    },
    enabled: open && !!course?.id,
  });

  // 2. Fetch enrolled students for selected campaign
  const { data: enrolledStudents = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['campaign-enrolled-students', selectedCampaignForStudents?.id],
    queryFn: async () => {
      if (!selectedCampaignForStudents?.id) return [];
      const res = await ApiClient.get(`/campaigns/GetCampaignRedemptions/${selectedCampaignForStudents.id}`);
      return res.data?.data || [];
    },
    enabled: studentsDrawerOpen && !!selectedCampaignForStudents?.id,
  });

  // 3. Create Campaign Mutation
  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        campaignName: values.campaignName,
        targetInstitution: values.targetInstitution,
        maxRedemptions: values.maxRedemptions || 100,
        expiresAt: values.expiresAt ? values.expiresAt.toISOString() : undefined,
        customInviteCode: values.customInviteCode ? values.customInviteCode.trim() : undefined,
      };
      return ApiClient.post(`/campaigns/CreateCampaignLink/${course.id}`, payload);
    },
    onSuccess: (res) => {
      message.success('Outreach campaign link created successfully!');
      queryClient.invalidateQueries({ queryKey: ['course-campaigns', course?.id] });
      form.resetFields();
      setActiveTab('list');
      setSelectedQrCampaign(res.data?.data);
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to create campaign link.');
    },
  });

  // 4. Toggle Campaign Status Mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ campaignId, isActive }: { campaignId: string; isActive: boolean }) => {
      return ApiClient.put(`/campaigns/ToggleCampaignStatus/${campaignId}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-campaigns', course?.id] });
      message.success('Campaign status updated.');
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to update status.');
    },
  });

  const getShareUrl = (code: string) => {
    return `${window.location.origin}/course/join?token=${code}`;
  };

  const copyToClipboard = (code: string) => {
    const url = getShareUrl(code);
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    message.success('Share link copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const downloadQrCode = (code: string, collegeName: string) => {
    const canvas = document.getElementById(`qr-canvas-${code}`) as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `QRCode-${collegeName.replace(/[^a-zA-Z0-9]/g, '_')}-${code}.png`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const columns = [
    {
      title: 'Target Institution & Campaign',
      key: 'institution',
      render: (_: any, record: any) => (
        <div>
          <div className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>{record.target_institution}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{record.campaign_name}</div>
          <div className="mt-1 flex items-center gap-1">
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
          <div className="font-semibold text-gray-800 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">{record.creator_name || 'Staff Member'}</span>
          </div>
          {record.creator_email && (
            <div className="text-[10px] text-gray-400 truncate mt-0.5">{record.creator_email}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Seats Claimed',
      key: 'quota',
      width: 170,
      render: (_: any, record: any) => {
        const pct = Math.min(100, Math.round((record.current_redemptions / record.max_redemptions) * 100));
        return (
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-700">{record.current_redemptions} claimed</span>
              <span className="text-gray-400">of {record.max_redemptions}</span>
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
          onChange={(checked) => toggleMutation.mutate({ campaignId: record.id, isActive: checked })}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 170,
      render: (_: any, record: any) => (
        <div className="flex items-center gap-1.5">
          <Tooltip title="Copy Shareable Link">
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
              onClick={() => setSelectedQrCampaign(record)}
            />
          </Tooltip>

          <Tooltip title="View Enrolled Students">
            <Button
              size="small"
              icon={<Users className="w-3.5 h-3.5 text-blue-600" />}
              onClick={() => {
                setSelectedCampaignForStudents(record);
                setStudentsDrawerOpen(true);
              }}
            >
              <span className="text-xs">{record.current_redemptions}</span>
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
              <Share2 className="w-5 h-5 text-indigo-600" />
              <div>
                <div className="text-base font-bold text-gray-900">
                  College Outreach & Campaign Links
                </div>
                <div className="text-xs text-gray-500 font-normal">
                  Course: <span className="font-semibold text-gray-700">{course?.title}</span>
                  {course?.is_private && (
                    <Tag color="purple" className="ml-2 text-[10px]">
                      Private Protected
                    </Tag>
                  )}
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
                label: `Active Outreach Links (${campaigns.length})`,
                children: (
                  <div className="space-y-4 pt-1">
                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>
                          Distribute private courses to partner colleges, workshops, and student batches with allocated seat limits and anti-piracy protection.
                        </span>
                      </div>
                      <Button
                        type="primary"
                        size="small"
                        icon={<Plus className="w-3.5 h-3.5" />}
                        onClick={() => setActiveTab('create')}
                      >
                        Create New Link
                      </Button>
                    </div>

                    <Table
                      columns={columns}
                      dataSource={campaigns}
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
                label: '+ Create Outreach Campaign Link',
                children: (
                  <div className="pt-2 max-w-xl mx-auto">
                    <Form
                      form={form}
                      layout="vertical"
                      onFinish={(values) => createMutation.mutate(values)}
                      initialValues={{ maxRedemptions: 100 }}
                    >
                      <Form.Item
                        name="targetInstitution"
                        label={<span className="text-xs font-semibold text-gray-700">Target Institution / College Name</span>}
                        rules={[{ required: true, message: 'Enter target college or partner name' }]}
                      >
                        <Input
                          prefix={<Building2 className="w-4 h-4 text-gray-400 mr-1" />}
                          placeholder="e.g. St. Joseph College of Engineering"
                        />
                      </Form.Item>

                      <Form.Item
                        name="campaignName"
                        label={<span className="text-xs font-semibold text-gray-700">Campaign / Purpose Name</span>}
                        rules={[{ required: true, message: 'Enter campaign purpose' }]}
                      >
                        <Input placeholder="e.g. Free Tech Seminar Batch 2026 / Campus Drive" />
                      </Form.Item>

                      <div className="grid grid-cols-2 gap-4">
                        <Form.Item
                          name="maxRedemptions"
                          label={<span className="text-xs font-semibold text-gray-700">Student Free Quota Limit</span>}
                          rules={[{ required: true, message: 'Enter maximum student seats' }]}
                        >
                          <InputNumber min={1} max={10000} className="w-full" placeholder="100" />
                        </Form.Item>

                        <Form.Item
                          name="expiresAt"
                          label={<span className="text-xs font-semibold text-gray-700">Link Expiration Date (Optional)</span>}
                        >
                          <DatePicker showTime className="w-full" placeholder="Select expiry date" />
                        </Form.Item>
                      </div>

                      <Form.Item
                        name="customInviteCode"
                        label={<span className="text-xs font-semibold text-gray-700">Custom Invite Code (Optional)</span>}
                        extra="Leave blank to auto-generate a secure token like CMP-SJCE-8821"
                      >
                        <Input placeholder="e.g. CMP-SJCE-2026" className="uppercase font-mono" />
                      </Form.Item>

                      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <Button onClick={() => setActiveTab('list')}>Cancel</Button>
                        <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                          Generate Secure Share Link & QR
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

      {/* QR Code Presentation Modal */}
      {selectedQrCampaign && (
        <Modal
          open={!!selectedQrCampaign}
          title={
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-indigo-600" />
              <span>Mobile QR Code — {selectedQrCampaign.target_institution}</span>
            </div>
          }
          onCancel={() => setSelectedQrCampaign(null)}
          footer={null}
          width={420}
          centered
        >
          <div className="text-center py-4 space-y-4">
            <p className="text-xs text-gray-500">
              Students at <strong>{selectedQrCampaign.target_institution}</strong> can scan this QR code with their phones to claim free course access.
            </p>

            <div className="p-4 bg-white rounded-2xl border-2 border-indigo-100 inline-block shadow-md">
              <QRCode
                id={`qr-canvas-${selectedQrCampaign.invite_code}`}
                value={getShareUrl(selectedQrCampaign.invite_code)}
                size={220}
                bordered={false}
              />
            </div>

            <div className="p-3 bg-gray-50 rounded-xl text-xs font-mono text-gray-600 break-all select-all">
              {getShareUrl(selectedQrCampaign.invite_code)}
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button
                icon={<Copy className="w-4 h-4" />}
                onClick={() => copyToClipboard(selectedQrCampaign.invite_code)}
              >
                Copy Link
              </Button>
              <Button
                type="primary"
                icon={<Download className="w-4 h-4" />}
                onClick={() => downloadQrCode(selectedQrCampaign.invite_code, selectedQrCampaign.target_institution)}
              >
                Download QR Image
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Enrolled Students Drawer */}
      <Drawer
        open={studentsDrawerOpen}
        title={
          <div>
            <div className="text-sm font-bold text-gray-900">
              Students Enrolled via Campaign
            </div>
            <div className="text-xs text-indigo-600 font-medium">
              {selectedCampaignForStudents?.target_institution} ({enrolledStudents.length} Students)
            </div>
          </div>
        }
        onClose={() => setStudentsDrawerOpen(false)}
        width={560}
      >
        <Table
          dataSource={enrolledStudents}
          rowKey="redemption_id"
          loading={loadingStudents}
          pagination={{ pageSize: 10 }}
          size="small"
          columns={[
            {
              title: 'Student',
              key: 'student',
              render: (_: any, r: any) => (
                <div>
                  <div className="font-semibold text-xs text-gray-900">
                    {r.first_name} {r.last_name}
                  </div>
                  <div className="text-[11px] text-gray-500">{r.email}</div>
                  {r.phone && <div className="text-[10px] text-gray-400">{r.phone}</div>}
                </div>
              ),
            },
            {
              title: 'Client IP',
              dataIndex: 'ip_address',
              key: 'ip_address',
              width: 120,
              render: (ip: string) => (
                <Tag color="default" className="text-[10px] font-mono m-0">
                  {ip || '127.0.0.1'}
                </Tag>
              ),
            },
            {
              title: 'Claim Date',
              dataIndex: 'redeemed_at',
              key: 'redeemed_at',
              width: 140,
              render: (d: string) => <span className="text-[11px] text-gray-600">{d ? formatLocal(d) : 'N/A'}</span>,
            },
          ]}
        />
      </Drawer>
    </>
  );
};
