import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, Button, Progress, Tag, Alert, message, Spin } from 'antd';
import {
  Building2,
  GraduationCap,
  Sparkles,
  BookOpen,
  Clock,
  Video,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';
import { SecureStorageService } from '../../services/storage/SecureStorageService';

export const CourseCampaignJoinPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const session = SecureStorageService.GetDecryptedValue<any>('session');
  const isLoggedIn = Boolean(session?.tokens?.accessToken);
  const currentUser = session?.user;

  // 1. Fetch Campaign Details
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-campaign-details', token],
    queryFn: async () => {
      if (!token) throw new Error('No campaign invite code provided.');
      const res = await ApiClient.get(`/campaigns/GetCampaignDetails/${token}`);
      return res.data?.data;
    },
    enabled: !!token,
  });

  // 2. Redeem Mutation
  const redeemMutation = useMutation({
    mutationFn: async () => {
      const res = await ApiClient.post('/campaigns/RedeemCampaignLink', {
        inviteCode: token,
      });
      return res.data?.data;
    },
    onSuccess: (res) => {
      message.success(res.message || 'Course access claimed successfully!');
      navigate(`/student/learn/${res.courseId}`);
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to claim course access.');
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center rounded-2xl shadow-lg">
          <Lock className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">Missing Invitation Code</h2>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            Please use the complete shared invitation link or scan the QR code provided by your academy or institution.
          </p>
          <Button type="primary" onClick={() => navigate('/explore')}>
            Browse Public Courses
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Spin size="large" tip="Loading exclusive invitation..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center rounded-2xl shadow-lg">
          <Lock className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">Invitation Link Not Found</h2>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            This invitation code may be invalid, deactivated, or expired.
          </p>
          <Button type="primary" onClick={() => navigate('/explore')}>
            Go to Academy Catalog
          </Button>
        </Card>
      </div>
    );
  }

  const { campaign, course, organization } = data;
  const pct = Math.min(100, Math.round((campaign.currentRedemptions / campaign.maxRedemptions) * 100));

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 via-white to-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Organization Brand Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {organization.logoUrl ? (
              <img src={organization.logoUrl} alt={organization.name} className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base">
                {organization.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="text-sm font-bold text-gray-900">{organization.name}</div>
              <div className="text-xs text-gray-500">Official Educational Outreach Portal</div>
            </div>
          </div>
          <Tag color="purple" className="font-mono text-xs px-2.5 py-0.5 rounded-full">
            {campaign.inviteCode}
          </Tag>
        </div>

        {/* Hero Card */}
        <Card className="!rounded-3xl shadow-xl border border-indigo-100 overflow-hidden !p-0">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-6 sm:p-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold tracking-wide text-indigo-200 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Special Academic Partnership</span>
            </div>

            <div className="flex items-center gap-2 text-indigo-200 text-xs sm:text-sm font-medium">
              <Building2 className="w-4 h-4 text-indigo-300" />
              <span>Exclusive Access Invitation for:</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-white mt-1 mb-2 tracking-tight">
              {campaign.targetInstitution}
            </h1>
            <p className="text-indigo-200 text-xs sm:text-sm max-w-xl">
              {campaign.name} — Complimentary access granted by {organization.name}.
            </p>
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Quota Progress */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-gray-700 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>Free Seat Allocation</span>
                </span>
                <span className="text-indigo-700">
                  {campaign.remainingSeats} of {campaign.maxRedemptions} seats remaining
                </span>
              </div>
              <Progress
                percent={pct}
                strokeColor={pct >= 100 ? '#ef4444' : '#6366f1'}
                status={pct >= 100 ? 'exception' : 'active'}
                className="!my-0"
              />
              <div className="flex justify-between items-center text-[11px] text-gray-400">
                <span>{campaign.currentRedemptions} students enrolled</span>
                {campaign.expiresAtIst && <span>Expires: {campaign.expiresAtIst}</span>}
              </div>
            </div>

            {/* Course Summary Card */}
            <div className="flex flex-col sm:flex-row gap-5 items-start p-4 rounded-2xl border border-gray-200 bg-white shadow-xs">
              {course.thumbnailUrl ? (
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  className="w-full sm:w-44 h-28 object-cover rounded-xl shrink-0"
                />
              ) : (
                <div className="w-full sm:w-44 h-28 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shrink-0">
                  <BookOpen className="w-10 h-10 opacity-70" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Tag color="blue" className="text-[10px] m-0 font-medium">
                    {course.category}
                  </Tag>
                  <Tag color="cyan" className="text-[10px] m-0 font-medium">
                    {course.level}
                  </Tag>
                  {course.isPrivate && (
                    <Tag color="purple" className="text-[10px] m-0 font-medium flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Private Proprietary</span>
                    </Tag>
                  )}
                </div>
                <h3 className="text-base font-bold text-gray-900">{course.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {course.shortDescription || course.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-400 font-medium pt-1">
                  <span className="flex items-center gap-1">
                    <Video className="w-3.5 h-3.5 text-indigo-500" />
                    {course.lessonCount} Lessons
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    {course.durationMinutes} Minutes
                  </span>
                </div>
              </div>
            </div>

            {/* Anti-Piracy Notice */}
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center gap-3 text-xs text-purple-900">
              <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
              <span>
                <strong>Copyright Protected Content:</strong> This lecture features forensic dynamic watermarking and screen recording defenses. Redistribution or unauthorized capturing is strictly monitored.
              </span>
            </div>

            {/* Action Buttons */}
            {campaign.isFull ? (
              <Alert
                message="Quota Reached"
                description={`All ${campaign.maxRedemptions} free student seats for ${campaign.targetInstitution} have already been claimed.`}
                type="error"
                showIcon
              />
            ) : campaign.isExpired ? (
              <Alert
                message="Invitation Expired"
                description="This outreach invitation has expired. Please contact your institution coordinator for updated course access."
                type="warning"
                showIcon
              />
            ) : !campaign.isActive ? (
              <Alert
                message="Invitation Inactive"
                description="This campaign link has been paused by the organization administrator."
                type="warning"
                showIcon
              />
            ) : isLoggedIn ? (
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>
                      Logged in as <strong>{currentUser?.firstName} {currentUser?.lastName}</strong> ({currentUser?.email})
                    </span>
                  </div>
                </div>

                <Button
                  type="primary"
                  size="large"
                  onClick={() => redeemMutation.mutate()}
                  loading={redeemMutation.isPending}
                  className="w-full h-12 !rounded-xl !bg-indigo-600 hover:!bg-indigo-700 text-sm font-bold shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  <span>Claim Free Course Access & Start Learning</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-3">
                    To claim your free course seat, please sign in with your student credentials or create a new student account:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      size="large"
                      onClick={() => navigate(`/login?mode=register&orgSlug=${organization.slug}&campaignToken=${token}`)}
                      className="h-11 rounded-xl text-xs font-semibold border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                    >
                      Create Student Account
                    </Button>
                    <Button
                      type="primary"
                      size="large"
                      onClick={() => navigate(`/login?campaignToken=${token}`)}
                      className="h-11 rounded-xl text-xs font-semibold !bg-indigo-600 hover:!bg-indigo-700"
                    >
                      Sign In to Claim
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
