import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Form, Input, Button, message, Alert, Tabs, Modal, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Mail, Lock, User, Compass, GraduationCap, AlertTriangle, Smartphone, ShieldAlert, KeyRound, Building2 } from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';
import { SecureStorageService } from '../../services/storage/SecureStorageService';
import { formatLocal } from '../../utils/dateTimeUtils';
import { getClientIp } from '../../utils/clientIpUtils';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const orgSlugParam = searchParams.get('orgSlug') || searchParams.get('orgCode') || '';
  const campaignToken = searchParams.get('campaignToken') || searchParams.get('token') || '';

  const [activeTab, setActiveTab] = useState<string>(initialMode);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic Academy Public Branding
  const { data: orgData } = useQuery({
    queryKey: ['public-org-profile', orgSlugParam],
    queryFn: async () => {
      if (!orgSlugParam) return null;
      const res = await ApiClient.get(`/public/GetPublicOrganizationByCodeOrSlug/${encodeURIComponent(orgSlugParam)}`);
      return res.data?.data;
    },
    enabled: !!orgSlugParam,
  });

  // Single Primary Active Session State
  const reasonParam = searchParams.get('reason');
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);
  const [pendingCredentials, setPendingCredentials] = useState<any>(null);
  const [clearingSession, setClearingSession] = useState(false);

  // First-Time Login Password Reset State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetPendingSession, setResetPendingSession] = useState<any>(null);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetForm] = Form.useForm();

  useEffect(() => {
    const existingSession = SecureStorageService.GetDecryptedValue<any>('session');
    const role = (existingSession?.user?.role || '').toUpperCase();
    const isStudentOrStaff = ['STUDENT', 'INSTRUCTOR', 'STAFF', 'CONTENT_MANAGER', 'MANAGER', 'REVIEWER'].includes(role);
    if (isStudentOrStaff && existingSession?.user?.mustResetPassword) {
      setResetPendingSession(existingSession);
      setResetModalOpen(true);
    }
  }, [reasonParam]);

  const navigateToRoleDashboard = (user: any) => {
    const role = user.role;
    if (user.isSuperAdmin || role === 'SUPER_ADMIN') {
      navigate('/super-admin/dashboard', { replace: true });
    } else if (role === 'ORGANIZATION_ADMIN' || role === 'ORGANIZATION_OWNER') {
      navigate('/organization/dashboard', { replace: true });
    } else if (['INSTRUCTOR', 'CONTENT_MANAGER', 'MANAGER', 'REVIEWER', 'STAFF'].includes(role)) {
      navigate('/instructor/dashboard', { replace: true });
    } else {
      navigate('/student/dashboard', { replace: true });
    }
  };

  const handleLoginSuccess = async (session: any) => {
    SecureStorageService.SetEncryptedValue('session', session);
    window.dispatchEvent(new CustomEvent('novacodex:auth-changed'));

    // If student/staff user was created with temporary password, trigger mandatory first-time reset
    const role = (session.user?.role || '').toUpperCase();
    const isStudentOrStaff = ['STUDENT', 'INSTRUCTOR', 'STAFF', 'CONTENT_MANAGER', 'MANAGER', 'REVIEWER'].includes(role);
    if (isStudentOrStaff && session.user?.mustResetPassword) {
      setResetPendingSession(session);
      setResetModalOpen(true);
      return;
    }

    // If campaign token was provided, automatically claim course and navigate directly to video player
    if (campaignToken) {
      try {
        const clientIp = await getClientIp();
        const redeemRes = await ApiClient.post(
          '/campaigns/RedeemCampaignLink',
          { inviteCode: campaignToken },
          { headers: { Authorization: `Bearer ${session.tokens.accessToken}` } }
        );
        message.success(redeemRes.data?.message || 'Course access claimed!');
        navigate(`/student/learn/${redeemRes.data?.data?.courseId}`, { replace: true });
        return;
      } catch (err: any) {
        console.warn('Auto campaign redemption note:', err.response?.data?.message);
      }
    }

    message.success(`Welcome, ${session.user.firstName}!`);
    navigateToRoleDashboard(session.user);
  };

  const onResetFirstTimePassword = async (values: any) => {
    if (!resetPendingSession) return;
    setResetPasswordLoading(true);
    try {
      const token = resetPendingSession.tokens?.accessToken;
      const res = await ApiClient.post(
        '/auth/PostResetFirstTimePassword',
        { newPassword: values.newPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedUser = res.data?.data?.user;
      const updatedTokens = res.data?.data?.tokens || resetPendingSession.tokens;
      const newSession = {
        ...resetPendingSession,
        user: {
          ...resetPendingSession.user,
          ...updatedUser,
          mustResetPassword: false,
        },
        tokens: updatedTokens,
      };

      SecureStorageService.SetEncryptedValue('session', newSession);
      window.dispatchEvent(new CustomEvent('novacodex:auth-changed'));
      setResetModalOpen(false);
      message.success('Your permanent password has been set successfully! Welcome to your dashboard.');
      navigateToRoleDashboard(newSession.user);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const onLoginFinish = async (values: any) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const clientIp = await getClientIp();
      const response = await ApiClient.post('/auth/PostLoginUser', {
        email: values.email,
        password: values.password,
        clientIp,
      });
      handleLoginSuccess(response.data.data);
    } catch (err: any) {
      if (err.response?.data?.errorCode === 'SESSION_CONFLICT') {
        setConflictData(err.response.data.data);
        setPendingCredentials({ email: values.email, password: values.password });
        setConflictModalOpen(true);
      } else {
        const msg = err.response?.data?.message || 'Login failed. Please verify credentials.';
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClearOtherSession = async () => {
    if (!pendingCredentials) return;
    setClearingSession(true);
    try {
      const clientIp = await getClientIp();
      const response = await ApiClient.post('/auth/PostLoginUser', {
        email: pendingCredentials.email,
        password: pendingCredentials.password,
        clearPreviousSession: true,
        clientIp,
      });
      setConflictModalOpen(false);
      handleLoginSuccess(response.data.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to clear previous session and log in.');
    } finally {
      setClearingSession(false);
    }
  };

  const onRegisterFinish = async (values: any) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await ApiClient.post('/auth/PostRegisterUser', {
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        organizationSlug: orgSlugParam || undefined,
        organizationId: orgData?.id || undefined,
      });
      handleLoginSuccess(response.data.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Academy Custom Branding Banner for QR and shared registration links */}
      {orgData && (
        <div className="mb-5 p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex items-center gap-3 shadow-xs">
          {orgData.logo_url ? (
            <img src={orgData.logo_url} alt={orgData.name} className="w-10 h-10 rounded-xl object-cover border border-indigo-200" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {orgData.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-900 truncate">{orgData.name}</span>
              <Tag color="indigo" className="text-[10px] m-0">Verified Academy</Tag>
            </div>
            <p className="text-[11px] text-gray-500 truncate m-0 mt-0.5">
              {activeTab === 'register' ? 'Registering student account directly under this academy' : 'Sign in to access your academy courses'}
            </p>
          </div>
        </div>
      )}

      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-[#111111]">
          {activeTab === 'login' ? 'Sign in to your account' : 'Create Student Account'}
        </h3>
        <p className="text-xs text-[#666666] mt-0.5">
          {activeTab === 'login'
            ? 'Enter your credentials to access your portal'
            : 'Register to access courses, videos, and certificates'}
        </p>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => {
          setActiveTab(k);
          setErrorMessage(null);
        }}
        centered
        items={[
          { key: 'login', label: 'Sign In' },
          { key: 'register', label: 'Sign Up' },
        ]}
        className="mb-4"
      />

      {reasonParam === 'must_reset_password' && (
        <Alert
          message="Password Reset Required"
          description="Your password was reset by an administrator. Please sign in with your temporary password to create your permanent password."
          type="warning"
          showIcon
          className="mb-4 text-xs"
        />
      )}

      {reasonParam === 'session_terminated' && (
        <Alert
          message="Session Terminated"
          description="Your session has ended because your password was reset or your account was logged into from another device. Please sign in again."
          type="warning"
          showIcon
          className="mb-4 text-xs"
        />
      )}

      {reasonParam === 'org_inactive' && (
        <Alert
          message="Organization Access Restricted"
          description={searchParams.get('message') || 'Your organization has been suspended or is inactive. Please contact your organization administrator.'}
          type="error"
          showIcon
          className="mb-4 text-xs"
        />
      )}

      {reasonParam === 'license_expired' && (
        <Alert
          message="Organization License Expired"
          description={searchParams.get('message') || 'The organization license has expired. Please contact support to renew access.'}
          type="error"
          showIcon
          className="mb-4 text-xs"
        />
      )}

      {reasonParam === 'membership_inactive' && (
        <Alert
          message="Account Suspended"
          description={searchParams.get('message') || 'Your account in this organization is currently suspended. Please contact your administrator.'}
          type="error"
          showIcon
          className="mb-4 text-xs"
        />
      )}

      {errorMessage && (
        <Alert
          message={errorMessage}
          type="error"
          showIcon
          className="mb-4 text-xs"
        />
      )}

      {activeTab === 'login' ? (
        <Form layout="vertical" onFinish={onLoginFinish} requiredMark={false}>
          <Form.Item
            name="email"
            label={<span className="text-xs font-medium text-gray-700">Email Address</span>}
            rules={[{ required: true, message: 'Email address is required' }]}
          >
            <Input
              prefix={<Mail className="w-4 h-4 text-gray-400 mr-1" />}
              placeholder="e.g. yourname@domain.com"
              size="large"
              className="text-sm"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className="text-xs font-medium text-gray-700">Password</span>}
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password
              prefix={<Lock className="w-4 h-4 text-gray-400 mr-1" />}
              placeholder="Enter password"
              size="large"
              className="text-sm"
            />
          </Form.Item>

          <Form.Item className="mt-6">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              className="font-medium"
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
      ) : (
        <Form layout="vertical" onFinish={onRegisterFinish} requiredMark={false}>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="firstName"
              label={<span className="text-xs font-medium text-gray-700">First Name</span>}
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input placeholder="First Name" size="large" className="text-sm" />
            </Form.Item>

            <Form.Item
              name="lastName"
              label={<span className="text-xs font-medium text-gray-700">Last Name</span>}
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input placeholder="Last Name" size="large" className="text-sm" />
            </Form.Item>
          </div>

          <Form.Item
            name="email"
            label={<span className="text-xs font-medium text-gray-700">Email Address</span>}
            rules={[{ required: true, message: 'Email address is required' }]}
          >
            <Input
              prefix={<Mail className="w-4 h-4 text-gray-400 mr-1" />}
              placeholder="student@domain.com"
              size="large"
              className="text-sm"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className="text-xs font-medium text-gray-700">Password</span>}
            rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters' }]}
          >
            <Input.Password
              prefix={<Lock className="w-4 h-4 text-gray-400 mr-1" />}
              placeholder="Create strong password"
              size="large"
              className="text-sm"
            />
          </Form.Item>

          <Form.Item className="mt-6">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              className="font-medium"
            >
              Create Account & Start Learning
            </Button>
          </Form.Item>
        </Form>
      )}

      {/* Public Catalog Exploration Shortcut */}
      <div className="mt-6 pt-4 border-t border-gray-100 text-center">
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-black transition-colors"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Browse Public Course Catalog</span>
        </Link>
      </div>

      {/* Active Session Conflict Warning Modal */}
      <Modal
        open={conflictModalOpen}
        onCancel={() => setConflictModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        width={460}
      >
        <div className="text-center py-4 px-2 space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900">Active Login Detected</h3>
            <p className="text-xs text-gray-500 mt-1">
              Someone is currently logged into this account on another device or browser tab.
            </p>
          </div>

          {conflictData?.lastLoginAt && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 text-left">
              <div className="font-semibold mb-0.5 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-700" />
                Previous Session Details:
              </div>
              <div>Last active: <span className="font-mono font-medium">{formatLocal(conflictData.lastLoginAt)}</span></div>
            </div>
          )}

          <p className="text-xs text-gray-600 leading-relaxed text-left bg-gray-50 p-3 rounded-lg border border-gray-200">
            To ensure single primary student accountability, course progress validity, and exam security, only <strong>one active session</strong> is permitted at a time.
            Logging in here will disconnect and clear the other session.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <Button
              className="flex-1"
              onClick={() => setConflictModalOpen(false)}
              disabled={clearingSession}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              danger
              loading={clearingSession}
              onClick={handleConfirmClearOtherSession}
              className="flex-1"
            >
              Clear Other Login & Sign In
            </Button>
          </div>
        </div>
      </Modal>

      {/* Mandatory First-Time Password Reset Modal */}
      <Modal
        open={resetModalOpen}
        title={
          <div className="flex items-center gap-2 text-indigo-700">
            <KeyRound className="w-5 h-5" />
            <span>Set Permanent Account Password</span>
          </div>
        }
        closable={false}
        footer={null}
        width={480}
        destroyOnHidden
        centered
      >
        <div className="py-2">
          <Alert
            type="warning"
            showIcon
            message="First-Time Login Security Setup"
            description="Your account was provisioned with a temporary password. For security compliance, please set your permanent password before entering your academy dashboard."
            className="mb-4 text-xs"
          />

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 text-xs">
            <div className="text-gray-500 font-medium">Logged-in Account:</div>
            <div className="font-semibold text-gray-900 text-sm mt-0.5">
              {resetPendingSession?.user?.firstName} {resetPendingSession?.user?.lastName} (
              <span className="font-mono">{resetPendingSession?.user?.email}</span>)
            </div>
          </div>

          <Form form={resetForm} layout="vertical" onFinish={onResetFirstTimePassword}>
            <Form.Item
              name="newPassword"
              label="New Secure Password"
              rules={[
                { required: true, message: 'Please enter your new password' },
                { min: 6, message: 'Password must be at least 6 characters' },
              ]}
              extra={<span className="text-[11px] text-gray-400">Must be at least 6 characters long</span>}
            >
              <Input.Password prefix={<Lock className="w-4 h-4 text-gray-400 mr-1" />} placeholder="Enter new permanent password" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Confirm New Password"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Please confirm your new password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('The two passwords do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<Lock className="w-4 h-4 text-gray-400 mr-1" />} placeholder="Confirm your new password" />
            </Form.Item>

            <div className="pt-2 flex items-center justify-between gap-3">
              <Button
                type="default"
                onClick={() => {
                  SecureStorageService.RemoveEncryptedValue('session');
                  setResetModalOpen(false);
                  setResetPendingSession(null);
                  navigate('/login', { replace: true });
                }}
              >
                Cancel & Logout
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={resetPasswordLoading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Save Password & Enter Dashboard
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
};
