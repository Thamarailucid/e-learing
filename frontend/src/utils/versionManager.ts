declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: number;
declare const __BUILD_ID__: string;

export interface VersionInfo {
  version: string;
  buildTime: number;
  buildId: string;
}

export const getCurrentVersionInfo = (): VersionInfo => {
  return {
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown',
    buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 0,
    buildId: typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'unknown',
  };
};

export const fetchLatestVersionInfo = async (): Promise<VersionInfo | null> => {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`);
    if (!res.ok) {
        throw new Error('Failed to fetch version.json');
    }
    const data = await res.json();
    return {
      version: data.version,
      buildTime: data.buildTime,
      buildId: data.buildId,
    };
  } catch (error) {
    console.error('Error fetching latest version info:', error);
    return null;
  }
};

export const checkIsUpdateAvailable = async (): Promise<{ isAvailable: boolean; latestVersion?: string }> => {
  const current = getCurrentVersionInfo();
  const latest = await fetchLatestVersionInfo();
  
  if (!latest) return { isAvailable: false };
  
  if (latest.version !== current.version || (latest.buildTime && current.buildTime && latest.buildTime > current.buildTime)) {
    return { isAvailable: true, latestVersion: latest.version };
  }
  
  return { isAvailable: false };
};

export const triggerAppReload = () => {
  if (window.caches) {
    caches.keys().then((names) => {
      for (let name of names) caches.delete(name);
    });
  }
  window.location.reload();
};

export const snoozeUpdatePrompt = (hours: number) => {
  const snoozeUntil = Date.now() + hours * 60 * 60 * 1000;
  localStorage.setItem('novatrax_update_snooze', snoozeUntil.toString());
};

export const isUpdateSnoozed = (): boolean => {
  const snoozedUntilStr = localStorage.getItem('novatrax_update_snooze');
  if (!snoozedUntilStr) return false;
  
  const snoozedUntil = parseInt(snoozedUntilStr, 10);
  if (isNaN(snoozedUntil)) return false;
  
  return Date.now() < snoozedUntil;
};

export const initPreloadErrorAutoRecovery = () => {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('Vite preload error detected, forcing reload...', event);
    triggerAppReload();
  });
};
