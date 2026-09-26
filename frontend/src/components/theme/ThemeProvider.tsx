import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConfigProvider } from 'antd';
import { ApiClient } from '../../services/api/ApiClient';
import { SecureStorageService } from '../../services/storage/SecureStorageService';

export interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  sidebarColor: string;
  sidebarTextColor: string;
  borderColor: string;
  buttonColor: string;
  buttonTextColor: string;
}

export interface OrgProfile {
  id?: string;
  name?: string;
  slug?: string;
  domain?: string;
  logoUrl?: string;
  faviconUrl?: string;
  status?: string;
  planType?: string;
  licenseType?: string;
  licenseStartDate?: string;
  licenseEndDate?: string;
  licenseStartDateIst?: string;
  licenseEndDateIst?: string;
  licenseIsActive?: boolean;
  showPlanTierToOrg?: boolean;
  licenseWarningDays?: number;
  licenseStatus?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'DISABLED';
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  daysRemaining?: number | null;
}

const defaultTheme: ThemeSettings = {
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
  sidebarColor: '#0a0a0a',
  sidebarTextColor: '#ffffff',
  borderColor: '#e5e5e5',
  buttonColor: '#111111',
  buttonTextColor: '#ffffff',
};

const THEME_CACHE_KEY = 'novacodex_org_theme_cache';

const getInitialCachedTheme = (): ThemeSettings => {
  try {
    const raw = localStorage.getItem(THEME_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.primaryColor || parsed.buttonColor || parsed.sidebarColor)) {
        return { ...defaultTheme, ...parsed };
      }
    }
  } catch {}
  return defaultTheme;
};

const ThemeContext = createContext<{
  theme: ThemeSettings;
  orgProfile: OrgProfile | null;
  refreshTheme: () => void;
  applyCustomTheme: (newTheme: Partial<ThemeSettings>) => void;
}>({
  theme: defaultTheme,
  orgProfile: null,
  refreshTheme: () => {},
  applyCustomTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeSettings>(() => {
    const cached = getInitialCachedTheme();
    // Apply immediate CSS styling on first render to prevent any flash of unstyled content
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--novacodex-primary', cached.primaryColor);
      root.style.setProperty('--novacodex-secondary', cached.secondaryColor);
      root.style.setProperty('--novacodex-border', cached.borderColor);
      root.style.setProperty('--novacodex-sidebar-bg', cached.sidebarColor);
      root.style.setProperty('--novacodex-sidebar-text', cached.sidebarTextColor);
      root.style.setProperty('--novacodex-button-bg', cached.buttonColor);
      root.style.setProperty('--novacodex-button-text', cached.buttonTextColor);
    }
    return cached;
  });

  const [orgProfile, setOrgProfile] = useState<OrgProfile | null>(() => {
    const session = SecureStorageService.GetDecryptedValue<any>('session');
    if (session?.user?.activeOrganizationName) {
      return {
        id: session.user.activeOrganizationId,
        name: session.user.activeOrganizationName,
        slug: session.user.activeOrganizationSlug,
        logoUrl: session.user.activeOrganizationLogo,
      };
    }
    return null;
  });

  const applyThemeToDOM = (settings: ThemeSettings) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--novacodex-primary', settings.primaryColor || '#000000');
    root.style.setProperty('--novacodex-secondary', settings.secondaryColor || '#ffffff');
    root.style.setProperty('--novacodex-border', settings.borderColor || '#e5e5e5');
    root.style.setProperty('--novacodex-sidebar-bg', settings.sidebarColor || '#0a0a0a');
    root.style.setProperty('--novacodex-sidebar-text', settings.sidebarTextColor || '#ffffff');
    root.style.setProperty('--novacodex-button-bg', settings.buttonColor || '#111111');
    root.style.setProperty('--novacodex-button-text', settings.buttonTextColor || '#ffffff');
  };

  const applyCustomTheme = (partialTheme: Partial<ThemeSettings>) => {
    setTheme((prev) => {
      const merged: ThemeSettings = { ...prev, ...partialTheme };
      applyThemeToDOM(merged);
      try {
        localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(merged));
      } catch {}
      return merged;
    });
  };

  const fetchOrganizationTheme = async () => {
    const session = SecureStorageService.GetDecryptedValue<any>('session');
    const activeOrgId = session?.user?.activeOrganizationId;
    const token = session?.tokens?.accessToken;
    // Guard against calling protected routes if unauthenticated or during mandatory password reset quarantine
    if (!activeOrgId || !token || session?.user?.mustResetPassword) return;

    try {
      // Fetch both theme and organization details
      const [themeRes, detailsRes] = await Promise.allSettled([
        ApiClient.get('/organizations/GetOrganizationThemeSettings'),
        ApiClient.get('/organizations/GetOrganizationDetails'),
      ]);

      if (themeRes.status === 'fulfilled' && themeRes.value.data?.data) {
        const customTheme = themeRes.value.data.data;
        const merged: ThemeSettings = {
          primaryColor: customTheme.primaryColor || customTheme.primary_color || defaultTheme.primaryColor,
          secondaryColor: customTheme.secondaryColor || customTheme.secondary_color || defaultTheme.secondaryColor,
          sidebarColor: customTheme.sidebarColor || customTheme.sidebar_color || defaultTheme.sidebarColor,
          sidebarTextColor: customTheme.sidebarTextColor || customTheme.sidebar_text_color || defaultTheme.sidebarTextColor,
          borderColor: customTheme.borderColor || customTheme.border_color || defaultTheme.borderColor,
          buttonColor: customTheme.buttonColor || customTheme.button_color || defaultTheme.buttonColor,
          buttonTextColor: customTheme.buttonTextColor || customTheme.button_text_color || defaultTheme.buttonTextColor,
        };
        setTheme(merged);
        applyThemeToDOM(merged);
        try {
          localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(merged));
        } catch {}
      }

      if (detailsRes.status === 'fulfilled' && detailsRes.value.data?.data) {
        const details = detailsRes.value.data.data;
        const profile: OrgProfile = {
          id: details.id,
          name: details.name,
          slug: details.slug,
          domain: details.domain,
          logoUrl: details.logo_url,
          faviconUrl: details.favicon_url,
          status: details.status,
          planType: details.plan_type,
          licenseType: details.license_type,
          licenseStartDate: details.license_start_date,
          licenseEndDate: details.license_end_date,
          licenseIsActive: details.license_is_active !== false,
          showPlanTierToOrg: details.show_plan_tier_to_org !== false,
          licenseWarningDays: details.license_warning_days ?? 2,
          licenseStatus: details.license_status,
          isExpired: details.is_expired,
          isExpiringSoon: details.is_expiring_soon,
          daysRemaining: details.days_remaining,
        };
        setOrgProfile(profile);

        // Update stored session metadata
        if (session) {
          session.user.activeOrganizationName = details.name;
          session.user.activeOrganizationLogo = details.logo_url;
          session.user.activeOrganizationSlug = details.slug;
          SecureStorageService.SetEncryptedValue('session', session);
        }
      }
    } catch {
      // Keep existing cached theme on temporary failure
    }
  };

  useEffect(() => {
    fetchOrganizationTheme();

    const handleAuthChange = () => {
      fetchOrganizationTheme();
    };

    const handleThemeUpdate = (e: any) => {
      if (e?.detail) {
        applyCustomTheme(e.detail);
      }
      fetchOrganizationTheme();
    };

    window.addEventListener('novacodex:auth-changed', handleAuthChange);
    window.addEventListener('novacodex:theme-updated', handleThemeUpdate);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('novacodex:auth-changed', handleAuthChange);
      window.removeEventListener('novacodex:theme-updated', handleThemeUpdate);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, orgProfile, refreshTheme: fetchOrganizationTheme, applyCustomTheme }}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: theme.primaryColor || defaultTheme.primaryColor,
            borderRadius: 8,
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
