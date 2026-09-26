import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Tag, Progress, Tabs, Modal, message, Empty, Tooltip } from 'antd';
import {
  Award,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  Share2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
  Copy,
  BookOpen,
  Printer
} from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';
import { CertificateViewerModal } from '../../components/certificate/CertificateViewerModal';
import { CertificateData } from '../../components/certificate/CertificateView';
import { formatLocal } from '../../utils/dateTimeUtils';

export const StudentCertificatesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'earned' | 'claimable' | 'in_progress'>('earned');
  const [selectedCert, setSelectedCert] = useState<CertificateData | null>(null);
  const [viewerModalOpen, setViewerModalOpen] = useState(false);

  // Fetch student certificates overview
  const { data: overview, isLoading } = useQuery({
    queryKey: ['student-certificates-overview'],
    queryFn: async () => {
      const res = await ApiClient.get('/certificates/GetStudentCertificateOverview');
      return res.data?.data;
    },
    staleTime: 60000,
    refetchInterval: false,
  });

  // Claim Certificate Mutation
  const claimMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const res = await ApiClient.post('/certificates/GenerateCertificate', { courseId });
      return res.data?.data;
    },
    onSuccess: (newCert) => {
      message.success('Congratulations! Your official certificate has been generated.');
      queryClient.invalidateQueries({ queryKey: ['student-certificates-overview'] });
      queryClient.invalidateQueries({ queryKey: ['student-enrolled-courses'] });
      // Automatically open the viewer modal with the new cert
      setSelectedCert(newCert);
      setViewerModalOpen(true);
      setActiveTab('earned');
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to claim certificate. Please check course requirements.');
    },
  });

  const earnedCertificates: CertificateData[] = overview?.earnedCertificates || [];
  const claimableCourses: any[] = overview?.claimableCourses || [];
  const inProgressCourses: any[] = overview?.inProgressCourses || [];
  const stats = overview?.stats || {
    totalEarned: earnedCertificates.length,
    readyToClaim: claimableCourses.length,
    inProgress: inProgressCourses.length,
  };

  const handleViewCert = (cert: CertificateData) => {
    setSelectedCert(cert);
    setViewerModalOpen(true);
  };

  const handleCopyVerification = (cert: CertificateData) => {
    const url = cert.verification_url || `${window.location.origin}/verify/${cert.certificate_number}`;
    navigator.clipboard.writeText(url);
    message.success('Verification URL copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-gray-900 to-black text-white p-6 sm:p-8 rounded-3xl border border-amber-900/30 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Verified Academic Credentials</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              My Certificates & Diplomas
            </h1>
            <p className="text-sm text-gray-300 leading-relaxed">
              Showcase your verified achievements. Every certificate is cryptographically recorded with a unique credential ID and verifiable online by universities and employers worldwide.
            </p>
          </div>

          <div className="flex flex-row md:flex-col gap-3 shrink-0">
            <Button
              type="primary"
              size="large"
              icon={<BookOpen className="w-4 h-4" />}
              onClick={() => navigate('/student/catalog')}
              className="!bg-amber-500 hover:!bg-amber-400 !text-black !border-none font-bold shadow-md"
            >
              Explore More Courses
            </Button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{stats.totalEarned}</div>
              <div className="text-xs text-gray-400">Earned Certificates</div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{stats.readyToClaim}</div>
              <div className="text-xs text-gray-400">Ready to Claim</div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{stats.inProgress}</div>
              <div className="text-xs text-gray-400">Courses in Progress</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="bg-white p-2 sm:p-3 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            onClick={() => setActiveTab('earned')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'earned'
                ? 'bg-black text-white shadow-sm'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Earned Certificates</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'earned' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
              {stats.totalEarned}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('claimable')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'claimable'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Ready to Claim</span>
            {stats.readyToClaim > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black animate-pulse">
                {stats.readyToClaim}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('in_progress')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'in_progress'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            <Clock className="w-4 h-4 text-blue-300 shrink-0" />
            <span>In Progress</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'in_progress' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
              {stats.inProgress}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Earned Certificates */}
      {activeTab === 'earned' && (
        <div>
          {earnedCertificates.length === 0 ? (
            <Card className="!rounded-3xl border border-gray-200 text-center py-12">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No Certificates Earned Yet</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Complete all required lessons in your enrolled courses to automatically unlock official certificates signed by academy instructors.
                </p>
                {claimableCourses.length > 0 ? (
                  <Button
                    type="primary"
                    className="!bg-emerald-600 font-bold"
                    onClick={() => setActiveTab('claimable')}
                  >
                    You have {claimableCourses.length} course(s) ready to claim!
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    className="!bg-black font-bold"
                    onClick={() => navigate('/student/dashboard')}
                  >
                    Go to My Courses
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {earnedCertificates.map((cert) => (
                <Card
                  key={cert.certificate_number}
                  className="!rounded-3xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Visual Certificate Card Header */}
                    <div className="relative h-36 bg-gradient-to-br from-amber-50 via-amber-100/60 to-amber-200/40 border-b border-amber-200/60 p-4 flex flex-col justify-between rounded-t-2xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {cert.organization_logo_url ? (
                            <img
                              src={cert.organization_logo_url}
                              alt={cert.organization_name}
                              className="h-6 max-w-[90px] object-contain rounded"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                              {cert.organization_name?.charAt(0) || 'A'}
                            </div>
                          )}
                          <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[140px]">
                            {cert.organization_name}
                          </span>
                        </div>
                        <Tag color="gold" className="m-0 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-amber-600" />
                          Verified
                        </Tag>
                      </div>

                      <div className="text-center py-1">
                        <Award className="w-10 h-10 text-amber-600 mx-auto drop-shadow-sm group-hover:scale-110 transition-transform" />
                        <div className="text-[10px] uppercase font-bold tracking-widest text-amber-800/80 mt-1">
                          {cert.certificate_title || 'Certificate of Completion'}
                        </div>
                      </div>
                    </div>

                    {/* Certificate Info Body */}
                    <div className="p-5 space-y-3">
                      <h3 className="font-bold text-base text-gray-900 leading-snug line-clamp-2">
                        {cert.course_title}
                      </h3>

                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-gray-500">
                          <span>Credential ID:</span>
                          <span className="font-mono font-bold text-gray-800 text-[11px] select-all">
                            {cert.certificate_number}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-gray-500">
                          <span>Issued To:</span>
                          <span className="font-semibold text-gray-800">{cert.student_name}</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-500">
                          <span>Issue Date:</span>
                          <span className="font-semibold text-gray-800">
                            {formatLocal(cert.issue_date, 'DD MMM YYYY')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-5 pt-0 grid grid-cols-2 gap-2">
                    <Button
                      type="primary"
                      icon={<Eye className="w-4 h-4" />}
                      onClick={() => handleViewCert(cert)}
                      className="!bg-black font-bold text-xs h-9 rounded-xl col-span-2"
                    >
                      View & Print Certificate
                    </Button>
                    <Button
                      icon={<Copy className="w-3.5 h-3.5" />}
                      onClick={() => handleCopyVerification(cert)}
                      className="text-xs h-9 rounded-xl font-medium"
                    >
                      Copy Link
                    </Button>
                    <Button
                      icon={<ExternalLink className="w-3.5 h-3.5" />}
                      onClick={() => window.open(`/verify/${cert.certificate_number}`, '_blank')}
                      className="text-xs h-9 rounded-xl font-medium"
                    >
                      Verify
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Ready to Claim */}
      {activeTab === 'claimable' && (
        <div>
          {claimableCourses.length === 0 ? (
            <Card className="!rounded-3xl border border-gray-200 text-center py-12">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">All Completed Certificates Claimed</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  You have already claimed certificates for all your 100% completed courses. Keep progressing through your active courses to unlock more!
                </p>
                <Button
                  type="primary"
                  className="!bg-black font-bold"
                  onClick={() => setActiveTab('in_progress')}
                >
                  View Courses in Progress
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-emerald-950">
                      You have {claimableCourses.length} course certificate(s) ready to claim!
                    </div>
                    <div className="text-xs text-emerald-800">
                      You have successfully satisfied 100% of all lesson requirements. Click below to generate your official credential.
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {claimableCourses.map((c: any) => (
                  <Card
                    key={c.course_id}
                    className="!rounded-3xl border-2 border-emerald-300 overflow-hidden shadow-sm flex flex-col justify-between"
                  >
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <Tag color="success" className="font-bold text-xs uppercase m-0">
                          100% Completed
                        </Tag>
                        <span className="text-xs text-gray-400 font-medium">{c.organization_name}</span>
                      </div>

                      <h3 className="font-bold text-base text-gray-900 leading-snug">{c.course_title}</h3>

                      <div className="bg-emerald-50/60 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
                        <span>Lessons Completed:</span>
                        <span className="font-bold">{c.completed_lessons_count}/{c.total_lessons_count}</span>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <Button
                        type="primary"
                        size="large"
                        icon={<Award className="w-4 h-4" />}
                        loading={claimMutation.isPending}
                        onClick={() => claimMutation.mutate(c.course_id)}
                        className="w-full !bg-emerald-600 hover:!bg-emerald-500 font-bold rounded-xl h-10 shadow-sm"
                      >
                        Claim Official Certificate
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: In Progress Courses */}
      {activeTab === 'in_progress' && (
        <div>
          {inProgressCourses.length === 0 ? (
            <Card className="!rounded-3xl border border-gray-200 text-center py-12">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No Courses Currently in Progress</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Enroll in courses from the public catalog or redeem your college exclusive campaign link to start learning.
                </p>
                <Button
                  type="primary"
                  className="!bg-black font-bold"
                  onClick={() => navigate('/student/catalog')}
                >
                  Explore Course Catalog
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProgressCourses.map((c: any) => {
                const pct = Math.round(c.progress_percentage || 0);
                const remaining = c.remaining_lessons_count ?? Math.max(0, (c.total_lessons_count || 1) - (c.completed_lessons_count || 0));

                return (
                  <Card
                    key={c.course_id}
                    className="!rounded-3xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <Tag color="blue" className="text-xs font-semibold m-0">
                          {c.category || 'General'}
                        </Tag>
                        <span className="text-xs text-gray-500 font-medium">
                          {c.level || 'All Levels'}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-gray-900 leading-snug line-clamp-2">
                        {c.course_title}
                      </h3>

                      <div className="pt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progress to Certificate</span>
                          <span className="font-bold text-gray-900">{pct}%</span>
                        </div>
                        <Progress percent={pct} strokeColor="#4f46e5" showInfo={false} />
                        <div className="text-[11px] text-gray-500 mt-1.5 flex items-center justify-between">
                          <span>{c.completed_lessons_count || 0} / {c.total_lessons_count || 1} lessons</span>
                          <span className="text-indigo-600 font-semibold">
                            {remaining === 1 ? '1 lesson remaining' : `${remaining} lessons remaining`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <Button
                        type="primary"
                        icon={<ArrowRight className="w-4 h-4" />}
                        onClick={() => navigate(`/student/learn/${c.course_id}`)}
                        className="w-full !bg-black hover:!bg-gray-800 font-bold rounded-xl h-10"
                      >
                        Continue Course
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Certificate Viewer Modal */}
      <CertificateViewerModal
        open={viewerModalOpen}
        onClose={() => {
          setViewerModalOpen(false);
          setSelectedCert(null);
        }}
        cert={selectedCert}
      />
    </div>
  );
};
