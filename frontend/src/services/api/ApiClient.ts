import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { SecureStorageService } from '../storage/SecureStorageService';
import { getSyncClientIp } from '../../utils/clientIpUtils';

// Configure NProgress
NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.1 });

const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return 'http://localhost:5000/api/v1';
};

const baseURL = getApiBaseUrl();

export const ApiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Injects Bearer Token, Organization Context, and Real Client IP
let activeRequests = 0;

ApiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (activeRequests === 0) {
      NProgress.start();
    }
    activeRequests++;

    const session = SecureStorageService.GetDecryptedValue<any>('session');
    if (session?.tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${session.tokens.accessToken}`;
    }
    if (session?.user?.activeOrganizationId) {
      config.headers['x-organization-id'] = session.user.activeOrganizationId;
    }

    // Injects real public client IP resolved from ipify on all API calls
    const resolvedIp = getSyncClientIp();
    if (resolvedIp) {
      config.headers['x-client-ip'] = resolvedIp;
    }

    return config;
  },
  (error) => {
    activeRequests--;
    if (activeRequests === 0) {
      NProgress.done();
    }
    return Promise.reject(error);
  }
);

// Response Interceptor: Handles 401 Refresh Flow and Centralized Errors
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

ApiClient.interceptors.response.use(
  (response) => {
    activeRequests--;
    if (activeRequests <= 0) {
      activeRequests = 0;
      NProgress.done();
    }
    return response;
  },
  async (error: AxiosError) => {
    activeRequests--;
    if (activeRequests <= 0) {
      activeRequests = 0;
      NProgress.done();
    }
    
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const resData = error.response?.data as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (resData?.errorCode === 'SESSION_TERMINATED') {
        SecureStorageService.ClearEncryptedStorage();
        window.dispatchEvent(new CustomEvent('novacodex:auth-changed'));
        return Promise.reject(error);
      }

      if (resData?.errorCode === 'PASSWORD_RESET_REQUIRED') {
        const session = SecureStorageService.GetDecryptedValue<any>('session');
        if (session?.user) {
          session.user.mustResetPassword = true;
          SecureStorageService.SetEncryptedValue('session', session);
          window.dispatchEvent(new CustomEvent('novacodex:auth-changed'));
        }
        return Promise.reject(error);
      }

      if (originalRequest.url?.includes('/auth/PostRefreshAccessToken')) {
        SecureStorageService.ClearEncryptedStorage();
        window.dispatchEvent(new CustomEvent('novacodex:auth-changed'));
        return Promise.reject(error);
      }

      if (originalRequest.url?.includes('/auth/PostLoginUser')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return ApiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const session = SecureStorageService.GetDecryptedValue<any>('session');
      const refreshToken = session?.tokens?.refreshToken;

      if (!refreshToken) {
        SecureStorageService.ClearEncryptedStorage();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(`${baseURL}/auth/PostRefreshAccessToken`, {
          refreshToken,
        });

        const newAccessToken = refreshResponse.data.data.accessToken;
        session.tokens.accessToken = newAccessToken;
        SecureStorageService.SetEncryptedValue('session', session);

        ApiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return ApiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        SecureStorageService.ClearEncryptedStorage();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Centralized 403 Forbidden handler for inactive accounts, organizations, and expired licenses
    if (error.response?.status === 403) {
      const errCode = resData?.errorCode;
      // Do not redirect away from login or suspended pages so forms and status checks can handle the response gracefully
      if (
        window.location.pathname === '/login' ||
        window.location.pathname === '/suspended' ||
        originalRequest.url?.includes('/auth/PostLoginUser')
      ) {
        return Promise.reject(error);
      }

      if (errCode === 'ORGANIZATION_INACTIVE') {
        const msg = resData?.message || 'Your organization has been suspended or is inactive.';
        window.location.href = `/suspended?reason=org_inactive&message=${encodeURIComponent(msg)}`;
        return Promise.reject(error);
      }
      if (errCode === 'ORGANIZATION_LICENSE_EXPIRED') {
        const msg = resData?.message || 'Organization license has expired or is disabled.';
        window.location.href = `/suspended?reason=license_expired&message=${encodeURIComponent(msg)}`;
        return Promise.reject(error);
      }
      if (errCode === 'MEMBERSHIP_INACTIVE' || errCode === 'ACCOUNT_INACTIVE') {
        const msg = resData?.message || 'Your account has been suspended.';
        window.location.href = `/suspended?reason=membership_inactive&message=${encodeURIComponent(msg)}`;
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
