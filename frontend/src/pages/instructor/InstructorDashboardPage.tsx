import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Card, Tag, Input, Select, Popconfirm, message } from 'antd';
import { Plus, Edit3, Eye, Video, Share2, Lock, Globe, Search, RotateCcw, BookOpen, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ApiClient } from '../../services/api/ApiClient';
import { RbaPageHeader } from '../../components/common/RbaPageHeader';
import { RbaStatusBadge } from '../../components/common/RbaStatusBadge';
import { CourseCreateEditModal } from '../../components/modals/CourseCreateEditModal';
import { CourseCampaignModal } from '../../components/modals/CourseCampaignModal';
import { SecureStorageService } from '../../services/storage/SecureStorageService';

export const InstructorDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const basePath = location.pathname.startsWith('/organization') ? '/organization' : '/instructor';
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [selectedCampaignCourse, setSelectedCampaignCourse] = useState<any>(null);

  // Multi-criteria filters & pagination state
  const [search, setSearch] = useState('');
  const [accessTypeFilter, setAccessTypeFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
  const effectiveUser = profileRes || session?.user;

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

  const canManageCourses = isOwnerOrAdmin || Boolean(rawPerms?.can_manage_courses);
  const canManageCampaigns = isOwnerOrAdmin || (Boolean(rawPerms?.can_manage_campaigns) && canManageCourses);

  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['course-list', page, pageSize, search, accessTypeFilter, levelFilter, statusFilter],
    queryFn: async () => {
      const res = await ApiClient.get(
        `/courses/GetCourseList?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}&accessType=${encodeURIComponent(accessTypeFilter)}&level=${encodeURIComponent(levelFilter)}&status=${encodeURIComponent(statusFilter)}`
      );
      return res.data;
    },
  });

  const columns = [
    {
      title: 'Course Title & Access',
      key: 'title',
      render: (_: any, record: any) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200 flex items-center justify-center">
            {record.thumbnail_url ? (
              <img
                src={record.thumbnail_url}
                alt={record.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <BookOpen className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div>
            <div className="font-semibold text-sm text-[#111111] flex items-center gap-1.5 flex-wrap">
              {record.is_private ? (
                <Lock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              )}
              <span>{record.title}</span>
              {record.is_private ? (
                <Tag color="purple" className="text-[10px] m-0 font-medium">
                  Private Outreach
                </Tag>
              ) : (
                <Tag color="blue" className="text-[10px] m-0 font-medium">
                  Public Catalog
                </Tag>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {record.category || 'General'} • {record.level || 'All Levels'}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Lessons',
      dataIndex: 'total_lessons_count',
      key: 'total_lessons_count',
      render: (val: number) => <span className="text-xs font-medium">{val || 0} lessons</span>,
    },
    {
      title: 'Enrolled Students',
      dataIndex: 'total_enrolled_students',
      key: 'total_enrolled_students',
      render: (val: number) => <span className="text-xs font-medium">{val || 0}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <RbaStatusBadge status={status} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <div className="flex items-center gap-2">
          {canManageCampaigns && (
            <Button
              size="small"
              icon={<Share2 className="w-3.5 h-3.5 text-indigo-600" />}
              onClick={() => {
                setSelectedCampaignCourse(record);
                setCampaignModalOpen(true);
              }}
            >
              Outreach & Share
            </Button>
          )}
          {canManageCourses && (
            <Button
              size="small"
              icon={<Edit3 className="w-3 h-3" />}
              onClick={() => navigate(`${basePath}/course/${record.id}/builder`)}
            >
              Course Builder
            </Button>
          )}
          <Button
            size="small"
            icon={<Eye className="w-3 h-3" />}
            onClick={() => navigate(`${basePath}/learn/${record.id}`)}
          >
            Preview
          </Button>
          {canManageCourses && (
            <Popconfirm
              title="Delete Course"
              description="Are you sure you want to delete this course? This action cannot be undone."
              onConfirm={async () => {
                try {
                  await ApiClient.delete(`/courses/DeleteCourse/${record.id}`);
                  message.success('Course deleted successfully');
                  queryClient.invalidateQueries({ queryKey: ['course-list'] });
                } catch (err: any) {
                  message.error(err.response?.data?.message || 'Failed to delete course');
                }
              }}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<Trash2 className="w-3 h-3" />} />
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <RbaPageHeader
        title="Instructor Studio"
        subtitle="Author curriculum, upload private/public video lessons, manage college outreach campaigns, and configure anti-piracy rules"
        action={
          canManageCourses ? (
            <Button
              type="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setCourseModalOpen(true)}
            >
              Create New Course
            </Button>
          ) : undefined
        }
      />

      <Card className="!rounded-xl border border-[#e5e5e5]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="w-full sm:w-64">
              <Input
                prefix={<Search className="w-4 h-4 text-gray-400 mr-1" />}
                placeholder="Search course title or category..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                allowClear
              />
            </div>

            <Select
              value={accessTypeFilter}
              onChange={(val) => {
                setAccessTypeFilter(val);
                setPage(1);
              }}
              style={{ width: 175 }}
              options={[
                { label: 'All Catalog & Outreach', value: 'ALL' },
                { label: 'Public Catalog', value: 'PUBLIC' },
                { label: 'Private Outreach', value: 'PRIVATE' },
              ]}
            />

            <Select
              value={levelFilter}
              onChange={(val) => {
                setLevelFilter(val);
                setPage(1);
              }}
              style={{ width: 145 }}
              options={[
                { label: 'All Levels', value: 'ALL' },
                { label: 'Beginner', value: 'BEGINNER' },
                { label: 'Intermediate', value: 'INTERMEDIATE' },
                { label: 'Advanced', value: 'ADVANCED' },
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
                { label: 'Published', value: 'PUBLISHED' },
                { label: 'Draft', value: 'DRAFT' },
                { label: 'Archived', value: 'ARCHIVED' },
              ]}
            />

            {(search || accessTypeFilter !== 'ALL' || levelFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <Button
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => {
                  setSearch('');
                  setAccessTypeFilter('ALL');
                  setLevelFilter('ALL');
                  setStatusFilter('ALL');
                  setPage(1);
                }}
              >
                Reset
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-500 font-medium">
            Total Courses: <span className="font-bold text-gray-800">{coursesData?.pagination?.totalRecords || coursesData?.data?.length || 0}</span>
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={coursesData?.data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: coursesData?.pagination?.totalRecords || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '30', '50'],
            showQuickJumper: true,
            showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total} courses`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      <CourseCreateEditModal
        open={courseModalOpen}
        mode="create"
        onClose={() => setCourseModalOpen(false)}
      />

      {selectedCampaignCourse && (
        <CourseCampaignModal
          open={campaignModalOpen}
          course={selectedCampaignCourse}
          onClose={() => {
            setCampaignModalOpen(false);
            setSelectedCampaignCourse(null);
          }}
        />
      )}
    </div>
  );
};
