import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Progress, Tag, Modal, Input, message, Tooltip } from 'antd';
import {
  PlayCircle,
  Award,
  Compass,
  Clock,
  Lock,
  Sparkles,
  Building,
  BookOpen,
  Gift,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Tv
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ApiClient } from '../../services/api/ApiClient';
import { RbaPageHeader } from '../../components/common/RbaPageHeader';
import { SecureStorageService } from '../../services/storage/SecureStorageService';
import { formatLocal } from '../../utils/dateTimeUtils';
import { CertificateViewerModal } from '../../components/certificate/CertificateViewerModal';

export const StudentDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = SecureStorageService.GetDecryptedValue<any>('session');
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'EXCLUSIVE' | 'PUBLIC'>('ALL');

  // Exclusive Offer / Campus Redemption Modal State
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  // 1. Fetch Student's Enrolled Courses (Includes Public, Private & Exclusive courses)
  const { data: enrolledCourses = [], isLoading: isCoursesLoading } = useQuery({
    queryKey: ['my-enrolled-courses'],
    queryFn: async () => {
      const res = await ApiClient.get('/courses/GetStudentEnrolledCourses');
      return res.data?.data || [];
    },
  });

  // 2. Fallback: Public course recommendations if student has no enrollments yet
  const { data: catalogCourses = [] } = useQuery({
    queryKey: ['student-catalog-preview'],
    queryFn: async () => {
      const res = await ApiClient.get('/courses/GetCourseList?page=1&pageSize=6&isPublicOnly=true');
      return res.data?.data || [];
    },
    enabled: enrolledCourses.length === 0,
  });

  // 3. Fetch Earned Certificates
  const { data: certsData = [] } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: async () => {
      const res = await ApiClient.get('/certificates/GetStudentCertificateList');
      return res.data?.data || [];
    },
  });

  // Redeem Exclusive Offer Mutation
  const redeemMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await ApiClient.post('/campaigns/RedeemCampaignLink', { inviteCode: code.trim() });
      return res.data;
    },
    onSuccess: (data) => {
      message.success(data?.message || 'Exclusive offer claimed successfully!');
      setRedeemModalOpen(false);
      setInviteCode('');
      queryClient.invalidateQueries({ queryKey: ['my-enrolled-courses'] });
      queryClient.invalidateQueries({ queryKey: ['student-enrolled-courses'] });
      setActiveTab('EXCLUSIVE');
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to redeem invitation code. Please verify the code and try again.');
    },
  });

  const exclusiveCourses = enrolledCourses.filter((c: any) => c.is_exclusive);
  const publicCourses = enrolledCourses.filter((c: any) => !c.is_exclusive);

  const displayedCourses =
    activeTab === 'EXCLUSIVE'
      ? exclusiveCourses
      : activeTab === 'PUBLIC'
      ? publicCourses
      : enrolledCourses;

  const activeCourse = enrolledCourses.length > 0 ? enrolledCourses[0] : null;

  const lastLogin = session?.user?.lastLoginAt || session?.user?.lastLoginAtUtc || session?.user?.last_login_at;
  const activeStatusText =
    lastLogin && formatLocal(lastLogin, 'DD MMM, hh:mm A') !== 'N/A'
      ? formatLocal(lastLogin, 'DD MMM, hh:mm A')
      : 'Active Now';

  const formatSeconds = (sec: number) => {
    if (!sec || sec <= 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      <RbaPageHeader
        title={`Welcome back, ${session?.user?.firstName || 'Learner'}!`}
        subtitle={
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span>Track your progress, resume video lectures, and earn verified certificates</span>
            <Tag
              color="default"
              className="text-[11px] font-normal inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-600"
            >
              <Clock className="w-3 h-3 text-gray-500" />
              <span>Active: {activeStatusText}</span>
            </Tag>
          </div>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              icon={<Gift className="w-4 h-4 text-purple-600" />}
              onClick={() => setRedeemModalOpen(true)}
              className="font-semibold text-xs border-purple-300 text-purple-700 hover:!border-purple-400 hover:!bg-purple-50"
            >
              Redeem Exclusive Offer
            </Button>
            <Button
              type="primary"
              icon={<Compass className="w-4 h-4" />}
              onClick={() => navigate('/student/catalog')}
              className="!bg-black font-semibold text-xs"
            >
              Explore Catalog
            </Button>
          </div>
        }
      />

      {/* Quick Learning Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 bg-white border border-gray-200 rounded-2xl shadow-2xs min-w-0">
          <div className="text-xs text-gray-500 font-medium truncate">Enrolled Courses</div>
          <div className="text-lg sm:text-xl font-bold text-gray-900 mt-0.5">{enrolledCourses.length}</div>
        </div>

        <div className="p-3 sm:p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl shadow-2xs min-w-0">
          <div className="text-xs text-purple-700 font-semibold flex items-center gap-1 truncate">
            <Lock className="w-3 h-3 text-purple-600 shrink-0" />
            <span className="truncate">Exclusive Access</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-900 mt-0.5">{exclusiveCourses.length}</div>
        </div>

        <div className="p-3 sm:p-3.5 bg-white border border-gray-200 rounded-2xl shadow-2xs min-w-0">
          <div className="text-xs text-gray-500 font-medium truncate">Completed Courses</div>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 mt-0.5">
            {enrolledCourses.filter((c: any) => c.is_completed || Math.round(c.progress_percentage) >= 100).length}
          </div>
        </div>

        <div
          onClick={() => navigate('/student/certificates')}
          className="p-3 sm:p-3.5 bg-white border border-gray-200 rounded-2xl shadow-2xs hover:border-amber-300 cursor-pointer transition-all min-w-0"
        >
          <div className="text-xs text-amber-700 font-semibold flex items-center justify-between gap-1">
            <span className="truncate">Certificates</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-amber-600 mt-0.5">{certsData.length}</div>
        </div>
      </div>

      {/* Continue Learning Spotlight Banner with DYNAMIC RESUME */}
      {activeCourse && (
        <Card className="!rounded-3xl border border-gray-200 shadow-sm bg-gradient-to-r from-gray-950 via-gray-900 to-black text-white p-0 overflow-hidden w-full min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-4 sm:p-6 w-full min-w-0">
            <div className="space-y-2.5 w-full max-w-xl min-w-0">
              <div className="flex flex-wrap items-center gap-2 max-w-full">
                <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg bg-white/20 text-white shrink-0">
                  Continue Learning
                </span>
                {activeCourse.is_exclusive && (
                  <Tag
                    color="purple"
                    className="text-xs font-bold uppercase tracking-wider border-purple-400/60 bg-purple-900/80 text-purple-200 inline-flex items-center gap-1.5 py-0.5 px-2.5 m-0 max-w-full"
                  >
                    <Lock className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                    <span className="truncate max-w-[200px] sm:max-w-xs">
                      Exclusive Access {activeCourse.target_institution ? `• ${activeCourse.target_institution}` : ''}
                    </span>
                  </Tag>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1 break-words">{activeCourse.title}</h2>

              {/* Dynamic Last Watched Lesson Highlight */}
              {activeCourse.last_lesson_title && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-emerald-300 text-xs font-medium backdrop-blur-xs max-w-full">
                  <Tv className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate min-w-0">
                    Resume: <strong className="font-semibold">{activeCourse.last_lesson_title}</strong>
                    {activeCourse.last_position_seconds > 0 && (
                      <span className="text-gray-300 font-normal"> (at {formatSeconds(activeCourse.last_position_seconds)})</span>
                    )}
                  </span>
                </div>
              )}

              <p className="text-xs text-gray-300 line-clamp-2 break-words">
                {activeCourse.short_description ||
                  activeCourse.description ||
                  'Resume your interactive video lesson and pick up right where you left off.'}
              </p>

              <div className="pt-2 w-full max-w-xs">
                <div className="flex justify-between text-xs text-gray-300 mb-1">
                  <span>
                    Course Progress ({activeCourse.completed_lessons_count || 0}/{activeCourse.total_lessons_count || 1} Lessons)
                  </span>
                  <span className="font-semibold text-emerald-400">
                    {Math.round(activeCourse.progress_percentage || 0)}%
                  </span>
                </div>
                <Progress
                  percent={Math.round(activeCourse.progress_percentage || 0)}
                  showInfo={false}
                  strokeColor={activeCourse.is_exclusive ? '#a855f7' : '#10b981'}
                />
              </div>
            </div>

            <Button
              size="large"
              type="primary"
              icon={<PlayCircle className="w-5 h-5" />}
              onClick={() => {
                const url = `/student/learn/${activeCourse.id}${activeCourse.last_lesson_id ? `?lesson=${activeCourse.last_lesson_id}` : ''}`;
                navigate(url);
              }}
              className="!bg-white !text-black !border-none font-bold hover:!bg-gray-100 shadow-md h-12 px-6 rounded-xl w-full md:w-auto shrink-0"
            >
              Resume Lesson
            </Button>
          </div>
        </Card>
      )}

      {/* Enrolled Courses Section with Filtering & Dynamic Resume per card */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-[#111111]">My Courses</h3>
            <p className="text-xs text-gray-500">
              Access your enrolled programs, exclusive partner access courses, and lesson materials
            </p>
          </div>

          {enrolledCourses.length > 0 && (
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto max-w-full no-scrollbar">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 whitespace-nowrap ${
                  activeTab === 'ALL'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({enrolledCourses.length})
              </button>
              {exclusiveCourses.length > 0 && (
                <button
                  onClick={() => setActiveTab('EXCLUSIVE')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap ${
                    activeTab === 'EXCLUSIVE'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-purple-700 hover:bg-purple-100/60'
                  }`}
                >
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>Exclusive ({exclusiveCourses.length})</span>
                </button>
              )}
              {publicCourses.length > 0 && (
                <button
                  onClick={() => setActiveTab('PUBLIC')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 whitespace-nowrap ${
                    activeTab === 'PUBLIC'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Public ({publicCourses.length})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Empty State: No Courses Enrolled */}
        {displayedCourses.length === 0 ? (
          <Card className="!rounded-2xl border border-gray-200 text-center py-10 bg-white">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-base text-gray-900">
                {activeTab === 'EXCLUSIVE'
                  ? 'No Exclusive Partner Courses Yet'
                  : 'No Courses Enrolled Yet'}
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                {activeTab === 'EXCLUSIVE'
                  ? 'If you have received a college or campus campaign redemption code, click "Redeem Exclusive Offer" to claim your free course access.'
                  : 'Start your learning journey by browsing verified courses from our catalog, or enter your campus redemption link.'}
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  icon={<Gift className="w-4 h-4 text-purple-600" />}
                  onClick={() => setRedeemModalOpen(true)}
                  className="font-bold text-xs"
                >
                  Redeem Exclusive Offer
                </Button>
                <Button
                  type="primary"
                  className="!bg-black font-bold text-xs"
                  onClick={() => navigate('/student/catalog')}
                >
                  Explore Public Catalog
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          /* Grid of Enrolled Courses with Dynamic Resume */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedCourses.map((c: any) => (
              <Card
                key={c.id}
                hoverable
                className={`!rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                  c.is_exclusive
                    ? 'border-purple-300 shadow-xs hover:border-purple-500 hover:shadow-md'
                    : 'border-[#e5e5e5] hover:border-gray-400'
                }`}
                onClick={() => {
                  const url = `/student/learn/${c.id}${c.last_lesson_id ? `?lesson=${c.last_lesson_id}` : ''}`;
                  navigate(url);
                }}
              >
                <div>
                  {/* Thumbnail / Header */}
                  <div className="relative h-44 bg-gradient-to-tr from-gray-900 to-gray-800 rounded-xl mb-3 overflow-hidden flex items-center justify-center text-gray-400">
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                    ) : (
                      <PlayCircle className="w-12 h-12 text-white/50" />
                    )}

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                      {c.is_exclusive ? (
                        <Tag
                          color="purple"
                          className="text-[10px] font-bold uppercase tracking-wider border-purple-300 bg-purple-900/90 text-purple-100 inline-flex items-center gap-1 shadow-xs m-0"
                        >
                          <Lock className="w-3 h-3 text-purple-300" />
                          Exclusive Access
                        </Tag>
                      ) : (
                        <Tag color="blue" className="text-[10px] font-medium m-0 bg-blue-50 text-blue-700 border-blue-200">
                          {c.category || 'Course'}
                        </Tag>
                      )}

                      <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium">
                        {c.level || 'All Levels'}
                      </span>
                    </div>
                  </div>

                  {/* College / Campaign Institution Tag */}
                  {c.target_institution && (
                    <div className="mb-1.5">
                      <Tag
                        color="cyan"
                        className="text-[10px] font-semibold inline-flex items-center gap-1 m-0 bg-cyan-50 border-cyan-200 text-cyan-800"
                      >
                        <Building className="w-3 h-3 text-cyan-600" />
                        <span>Partner: {c.target_institution}</span>
                      </Tag>
                    </div>
                  )}

                  <h4 className="font-bold text-sm text-[#111111] line-clamp-1">{c.title}</h4>

                  {/* Dynamic Last Watched Lesson preview */}
                  {c.last_lesson_title && (
                    <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-1 truncate">
                      <Tv className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="truncate">Resume: {c.last_lesson_title}</span>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                    {c.short_description || c.description || 'Interactive video curriculum with hands-on practice.'}
                  </p>

                  {/* Real Course Progress */}
                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                      <span>
                        Progress ({c.completed_lessons_count || 0}/{c.total_lessons_count || 1} Lessons)
                      </span>
                      <span className={`font-semibold ${c.is_exclusive ? 'text-purple-700' : 'text-emerald-700'}`}>
                        {Math.round(c.progress_percentage || 0)}%
                      </span>
                    </div>
                    <Progress
                      percent={Math.round(c.progress_percentage || 0)}
                      showInfo={false}
                      strokeColor={c.is_exclusive ? '#8b5cf6' : '#10b981'}
                      size="small"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500">{c.total_lessons_count || 1} Lessons</span>
                  <span className={`font-bold ${c.is_exclusive ? 'text-purple-700' : 'text-black'}`}>
                    {Math.round(c.progress_percentage || 0) > 0 ? 'Resume Lesson →' : 'Start Course →'}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Certificates Shortcut Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-300/60 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
            <Award className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-gray-900 break-words">Academic Certificates & Credentials Portal</h4>
            <p className="text-xs text-gray-600 mt-0.5 break-words">
              You have earned <strong>{certsData.length}</strong> official certificate(s). View high-resolution credentials, verify tamper-proof IDs, or download print-ready PDFs.
            </p>
          </div>
        </div>

        <Button
          type="primary"
          icon={<ArrowRight className="w-4 h-4" />}
          onClick={() => navigate('/student/certificates')}
          className="!bg-black font-bold text-xs h-9 rounded-xl w-full sm:w-auto shrink-0"
        >
          Open Certificates ({certsData.length})
        </Button>
      </div>

      {/* Redeem Exclusive Offer Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-600" />
            <span>Redeem Exclusive Offer / Campus Access</span>
          </div>
        }
        open={redeemModalOpen}
        onCancel={() => {
          setRedeemModalOpen(false);
          setInviteCode('');
        }}
        footer={null}
        destroyOnClose
        centered
      >
        <div className="py-2 space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            Enter your university, outreach campaign, or partner invitation code (e.g.{' '}
            <code className="px-1.5 py-0.5 bg-gray-100 rounded text-purple-700 font-mono">CMP-XXXX-XXXX</code>) to immediately unlock private course access.
          </p>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Campaign Invite Code / Voucher Token
            </label>
            <Input
              placeholder="e.g. CMP-PSGC-D91V-7NW9"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              size="large"
              className="font-mono text-sm uppercase"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button onClick={() => setRedeemModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              loading={redeemMutation.isPending}
              disabled={!inviteCode.trim()}
              onClick={() => redeemMutation.mutate(inviteCode)}
              className="!bg-purple-600 hover:!bg-purple-500 font-bold"
            >
              Claim Exclusive Course
            </Button>
          </div>
        </div>
      </Modal>

      {/* Certificate Viewer Modal */}
      <CertificateViewerModal
        open={!!selectedCert}
        onClose={() => setSelectedCert(null)}
        cert={selectedCert}
      />
    </div>
  );
};
