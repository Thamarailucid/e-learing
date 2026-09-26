import React, { useState } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, Button, Form, Input, Alert, message, Spin, Tag, Divider } from 'antd';
import {
  Building2,
  Shield,
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  User,
  Phone,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';
import { SecureStorageService } from '../../services/storage/SecureStorageService';

const PERMISSION_LABELS: Record<string, string> = {
  can_manage_courses: 'Manage & Publish Courses',
  can_manage_campaigns: 'Create Outreach & Campaign Links',
  can_edit_students: 'Edit Students & Enrollments',
  can_reset_student_passwords: 'Reset Student Passwords',
  can_manage_staff: 'Manage Team & Staff Access',
  can_manage_bulk_staff: 'Bulk Staff & User Invite Links (QR)',
  can_view_reports: 'View Analytics & Performance Reports',
};

export const StaffInviteJoinPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const routeParams = useParams<{ token?: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // Support both /staff/join?token=XYZ and /join/staff/XYZ
  const token = (routeParams.token || searchParams.get('token') || '').trim().toUpperCase();

  const session = SecureStorageService.GetDecryptedValue<any>('session');
  const isLoggedIn = Boolean(session?.tokens?.accessToken);
  const currentUser = session?.user;

  // 1. Fetch Staff Invite Details
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-staff-invite-details', token],
    queryFn: async () => {
      if (!token) throw new Error('No invitation code provided.');
      const res = await ApiClient.get(`/public/GetStaffInviteDetails/${token}`);
      return res.data?.data;
    },
    enabled: !!token,
  });

  // 2. Staff Registration Mutation
  const registerMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await ApiClient.post('/public/RegisterStaffViaInvite', {
        inviteCode: token,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone || undefined,
        password: values.password || undefined,
      });
      return res.data?.data;
    },
    onSuccess: (res) => {
      message.success('Staff onboarding successful! Welcome to the team.');
      // Persist session
      SecureStorageService.SetEncryptedValue('session', res);

      const targetRole = res.user?.role;
      if (targetRole === 'ORGANIZATION_ADMIN' || targetRole === 'ORGANIZATION_OWNER') {
        navigate('/organization/dashboard', { replace: true });
      } else {
        navigate('/instructor/dashboard', { replace: true });
      }
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Registration failed. Please check your details.');
    },
  });

  const handleFinish = (values: any) => {
    registerMutation.mutate(values);
  };

  const handleClaimWithCurrentSession = () => {
    if (!currentUser) return;
    registerMutation.mutate({
      firstName: currentUser.firstName || 'Staff',
      lastName: currentUser.lastName || 'Member',
      email: currentUser.email,
      phone: currentUser.phone,
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center rounded-2xl shadow-lg border border-slate-200">
          <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Missing Invitation Token</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Please use the complete staff invitation link or scan the QR code provided by your organization administrator.
          </p>
          <Button type="primary" onClick={() => navigate('/login')}>
            Go to Staff Login
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Spin size="large" tip="Verifying staff invitation..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center rounded-2xl shadow-lg border border-slate-200">
          <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Invalid or Expired Link</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            This staff invitation link does not exist, has expired, or has been revoked by the organization.
          </p>
          <Button type="primary" onClick={() => navigate('/login')}>
            Return to Login
          </Button>
        </Card>
      </div>
    );
  }

  const { title, roleName, roleId, permissions, isActive, isExpired, isQuotaFull, remainingSeats, organization } = data;
  const isAvailable = isActive && !isExpired && !isQuotaFull;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 py-12 px-4 flex items-center justify-center">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Organization & Role Invitation Summary */}
        <div className="lg:col-span-5 flex flex-col justify-between p-8 bg-slate-800/80 backdrop-blur-md rounded-3xl border border-indigo-500/20 text-white shadow-2xl">
          <div>
            <div className="flex items-center gap-3 mb-6">
              {organization.logoUrl ? (
                <img
                  src={organization.logoUrl}
                  alt={organization.name}
                  className="w-12 h-12 rounded-xl object-cover bg-white p-1 border border-indigo-400/30 shadow"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg text-white leading-tight">{organization.name}</h3>
                <span className="text-xs text-indigo-300 font-medium">Official Staff Onboarding Portal</span>
              </div>
            </div>

            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Direct Bulk Invitation</span>
            </div>

            <h1 className="text-2xl font-black mt-3 text-white tracking-tight">{title}</h1>

            <div className="mt-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60">
              <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Assigned Role</div>
              <div className="mt-1 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <span className="text-lg font-bold text-indigo-200">{roleName || roleId}</span>
              </div>
            </div>

            {/* Permissions summary */}
            <div className="mt-6">
              <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-3">
                Pre-Configured Page Control Rights
              </div>
              <div className="space-y-2">
                {Object.entries(permissions || {}).map(([permKey, isGranted]) => {
                  const label = PERMISSION_LABELS[permKey] || permKey.replace(/_/g, ' ');
                  return (
                    <div
                      key={permKey}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                        isGranted
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                          : 'bg-slate-900/40 border-slate-800 text-slate-500 line-through'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-4 h-4 flex-shrink-0 ${
                          isGranted ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      />
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <span>Invite Code: <strong className="text-slate-200 font-mono">{token}</strong></span>
            {remainingSeats !== undefined && (
              <span>{remainingSeats} seats remaining</span>
            )}
          </div>
        </div>

        {/* Right Column: Registration / Onboarding Form */}
        <div className="lg:col-span-7 flex">
          <Card className="w-full rounded-3xl shadow-2xl border-0 p-2 sm:p-4 bg-white flex flex-col justify-center">
            {!isAvailable ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Invitation Link Unavailable</h3>
                <p className="text-sm text-slate-500 mt-2">
                  {!isActive
                    ? 'This invitation link has been paused by the organization administrator.'
                    : isExpired
                    ? 'This invitation link has expired.'
                    : 'This invitation link has reached its onboarding limit.'}
                </p>
                <Button className="mt-6" type="primary" onClick={() => navigate('/login')}>
                  Go to Login
                </Button>
              </div>
            ) : isLoggedIn ? (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Already Logged In</h3>
                    <p className="text-xs text-slate-500">
                      Logged in as <strong>{currentUser?.email}</strong>
                    </p>
                  </div>
                </div>

                <Alert
                  type="info"
                  showIcon
                  className="rounded-xl mb-6 text-xs"
                  message="Accept Invitation with Current Account"
                  description={`Clicking below will grant your account ${roleName || roleId} rights in ${organization.name}.`}
                />

                <Button
                  type="primary"
                  size="large"
                  block
                  loading={registerMutation.isPending}
                  onClick={handleClaimWithCurrentSession}
                  className="h-12 text-base font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
                >
                  Confirm & Access Staff Portal
                  <ArrowRight className="w-4 h-4 ml-2 inline" />
                </Button>

                <div className="mt-4 text-center">
                  <span className="text-xs text-slate-400">Want to join with a different email? </span>
                  <Link
                    to="/login"
                    onClick={() => SecureStorageService.RemoveEncryptedValue('session')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Log out first
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Create Your Staff Account
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Enter your details to join <strong>{organization.name}</strong> as <strong>{roleName || roleId}</strong>.
                  </p>
                </div>

                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleFinish}
                  requiredMark={false}
                  autoComplete="off"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Form.Item
                      label={<span className="text-xs font-bold text-slate-700">First Name</span>}
                      name="firstName"
                      rules={[{ required: true, message: 'Please enter first name' }]}
                    >
                      <Input
                        prefix={<User className="w-4 h-4 text-slate-400 mr-1" />}
                        placeholder="John"
                        size="large"
                        className="rounded-xl"
                      />
                    </Form.Item>

                    <Form.Item
                      label={<span className="text-xs font-bold text-slate-700">Last Name</span>}
                      name="lastName"
                      rules={[{ required: true, message: 'Please enter last name' }]}
                    >
                      <Input
                        prefix={<User className="w-4 h-4 text-slate-400 mr-1" />}
                        placeholder="Doe"
                        size="large"
                        className="rounded-xl"
                      />
                    </Form.Item>
                  </div>

                  <Form.Item
                    label={<span className="text-xs font-bold text-slate-700">Work Email Address</span>}
                    name="email"
                    rules={[
                      { required: true, message: 'Please enter work email' },
                      { type: 'email', message: 'Please enter a valid email address' },
                    ]}
                  >
                    <Input
                      prefix={<Mail className="w-4 h-4 text-slate-400 mr-1" />}
                      placeholder="name@organization.com"
                      size="large"
                      className="rounded-xl"
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span className="text-xs font-bold text-slate-700">Contact Phone (Optional)</span>}
                    name="phone"
                  >
                    <Input
                      prefix={<Phone className="w-4 h-4 text-slate-400 mr-1" />}
                      placeholder="+91 98765 43210"
                      size="large"
                      className="rounded-xl"
                    />
                  </Form.Item>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Form.Item
                      label={<span className="text-xs font-bold text-slate-700">Create Password</span>}
                      name="password"
                      rules={[
                        { required: true, message: 'Please enter password' },
                        { min: 6, message: 'Must be at least 6 characters' },
                      ]}
                    >
                      <Input.Password
                        prefix={<KeyRound className="w-4 h-4 text-slate-400 mr-1" />}
                        placeholder="••••••••"
                        size="large"
                        className="rounded-xl"
                      />
                    </Form.Item>

                    <Form.Item
                      label={<span className="text-xs font-bold text-slate-700">Confirm Password</span>}
                      name="confirmPassword"
                      dependencies={['password']}
                      rules={[
                        { required: true, message: 'Please confirm password' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('password') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('Passwords do not match'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password
                        prefix={<KeyRound className="w-4 h-4 text-slate-400 mr-1" />}
                        placeholder="••••••••"
                        size="large"
                        className="rounded-xl"
                      />
                    </Form.Item>
                  </div>

                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    loading={registerMutation.isPending}
                    className="h-12 mt-2 text-base font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
                  >
                    Complete Staff Onboarding
                    <ArrowRight className="w-4 h-4 ml-2 inline" />
                  </Button>
                </Form>

                <div className="mt-6 text-center text-xs text-slate-500">
                  Already have an account?{' '}
                  <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-bold">
                    Log in here
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
