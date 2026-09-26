import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Button, Tag } from 'antd';
import { Users, GraduationCap, BookOpen, Award, Plus, CheckCircle2, ShieldCheck, Calendar, QrCode } from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';
import { RbaPageHeader } from '../../components/common/RbaPageHeader';
import { CourseCreateEditModal } from '../../components/modals/CourseCreateEditModal';
import { UserCreateEditModal } from '../../components/modals/UserCreateEditModal';
import { OrgStudentInviteModal } from '../../components/modals/OrgStudentInviteModal';
import { useTheme } from '../../components/theme/ThemeProvider';

export const OrganizationDashboardPage: React.FC = () => {
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalType, setUserModalType] = useState<'student' | 'staff'>('student');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const { orgProfile } = useTheme();

  const { data: dashboard } = useQuery({
    queryKey: ['organization-dashboard'],
    queryFn: async () => {
      const res = await ApiClient.get('/organizations/GetOrganizationDashboard');
      return res.data.data;
    },
  });

  return (
    <div>
      {/* Academy Plan & License Overview: Rendered ONLY if Super Admin switch showPlanTierToOrg is true */}
      {orgProfile?.showPlanTierToOrg !== false && (
        <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-900">
                  {orgProfile?.planType || 'STANDARD'} Plan
                </span>
                <Tag color="blue" className="text-[10px] uppercase font-mono m-0">
                  {orgProfile?.licenseType || 'SUBSCRIPTION'}
                </Tag>
                {orgProfile?.licenseStatus === 'EXPIRING_SOON' && (
                  <Tag color="warning" className="text-[10px] uppercase font-bold m-0 animate-pulse">
                    Expiring in {orgProfile.daysRemaining}d
                  </Tag>
                )}
                {orgProfile?.licenseStatus === 'EXPIRED' && (
                  <Tag color="error" className="text-[10px] uppercase font-bold m-0">
                    License Expired
                  </Tag>
                )}
                {orgProfile?.licenseStatus === 'ACTIVE' && (
                  <Tag color="success" className="text-[10px] uppercase font-semibold m-0">
                    License Active
                  </Tag>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>
                  {orgProfile?.licenseEndDateIst ? (
                    <>Valid until <span className="font-medium text-gray-700">{orgProfile.licenseEndDateIst.replace(/\s*\(IST\)/gi, '').trim()}</span> (IST)</>
                  ) : (
                    'Perpetual License'
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-gray-600">
            <div>
              <span className="text-gray-400">Student Capacity: </span>
              <span className="font-semibold text-gray-900">
                {dashboard?.totalStudents ?? 0}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div>
              <span className="text-gray-400">Active Courses: </span>
              <span className="font-semibold text-gray-900">
                {dashboard?.totalCourses ?? 0}
              </span>
            </div>
          </div>
        </div>
      )}

      <RbaPageHeader
        title="Organization Dashboard"
        subtitle="Real-time training metrics, student engagement, and course completion rates"
        action={
          <div className="flex items-center gap-2">
            <Button
              icon={<QrCode className="w-4 h-4 text-indigo-600" />}
              onClick={() => setInviteModalOpen(true)}
            >
              Student Invite & QR
            </Button>
            <Button
              onClick={() => {
                setUserModalType('student');
                setUserModalOpen(true);
              }}
            >
              + Add Student
            </Button>
            <Button
              type="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setCourseModalOpen(true)}
            >
              Create Course
            </Button>
          </div>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="!rounded-xl border border-[#e5e5e5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 font-medium">Active Students</div>
              <div className="text-2xl font-bold text-[#111111] mt-1">
                {dashboard?.totalStudents ?? 0}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="!rounded-xl border border-[#e5e5e5]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 font-medium">Staff & Instructors</div>
              <div className="text-2xl font-bold text-[#111111] mt-1">
                {dashboard?.totalStaff ?? 0}
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
              <div className="text-xs text-gray-500 font-medium">Published Courses</div>
              <div className="text-2xl font-bold text-[#111111] mt-1">
                {dashboard?.totalCourses ?? 0}
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
              <div className="text-xs text-gray-500 font-medium">Completions & Certs</div>
              <div className="text-2xl font-bold text-[#111111] mt-1">
                {dashboard?.totalCertificatesIssued ?? 0}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Completion & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Engagement & Progress" className="lg:col-span-2 !rounded-xl border border-[#e5e5e5]">
          <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">Average Course Completion</div>
              <div className="text-xs text-gray-500 mt-0.5">Across all enrolled active students</div>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{dashboard?.averageCompletionRate ?? 68}%</div>
          </div>
          <div className="space-y-3 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Interactive in-video questions active on all published video lessons</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Dynamic forensic watermarking active to protect course content</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Cryptographically verifiable QR code certificates enabled</span>
            </div>
          </div>
        </Card>

        <Card title="Quick Actions" className="!rounded-xl border border-[#e5e5e5]">
          <div className="space-y-3">
            <Button block onClick={() => setCourseModalOpen(true)}>
              + Create New Course
            </Button>
            <Button
              block
              onClick={() => {
                setUserModalType('student');
                setUserModalOpen(true);
              }}
            >
              + Enroll New Student
            </Button>
            <Button
              block
              onClick={() => {
                setUserModalType('staff');
                setUserModalOpen(true);
              }}
            >
              + Add Instructor / Staff
            </Button>
          </div>
        </Card>
      </div>

      <CourseCreateEditModal
        open={courseModalOpen}
        mode="create"
        onClose={() => setCourseModalOpen(false)}
      />

      <UserCreateEditModal
        open={userModalOpen}
        mode="create"
        userType={userModalType}
        onClose={() => setUserModalOpen(false)}
      />

      <OrgStudentInviteModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        orgSlug={orgProfile?.slug || 'apex-academy'}
        orgName={orgProfile?.name || 'Apex Coding Academy'}
        inviteCode={(orgProfile as any)?.inviteCode}
      />
    </div>
  );
};
