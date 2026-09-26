/**
 * Resilient Client IP Resolver with multi-provider fallback.
 * Resolves public IP via api.ipify.org -> api64.ipify.org -> ipapi.co.
 * Caches in memory and sessionStorage to provide instant zero-delay access.
 */

const STORAGE_KEY = 'novacodex_cached_client_ip';
let memoryCachedIp: string | null = null;
const FALLBACK_PUBLIC_IP = '106.51.128.74';

const fetchWithTimeout = async (url: string, timeoutMs = 4500): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

/**
 * Synchronous client IP getter for instant header injection without awaiting
 */
export const getSyncClientIp = (): string => {
  if (memoryCachedIp) return memoryCachedIp;
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored && stored.trim() && stored !== '::1' && stored !== '127.0.0.1') {
        memoryCachedIp = stored.trim();
        return memoryCachedIp;
      }
    } catch {
      // sessionStorage unavailable
    }
  }
  return FALLBACK_PUBLIC_IP;
};

/**
 * Asynchronously resolves the client's public IP from ipify with caching
 */
export const getClientIp = async (): Promise<string> => {
  // Check cache first
  const existing = getSyncClientIp();
  if (existing && existing !== FALLBACK_PUBLIC_IP) {
    return existing;
  }

  // Provider 1: api.ipify.org (Fastest)
  try {
    const res = await fetchWithTimeout('https://api.ipify.org?format=json', 4000);
    if (res.ok) {
      const data = await res.json();
      if (data?.ip && typeof data.ip === 'string') {
        const ip = data.ip.trim();
        memoryCachedIp = ip;
        try {
          sessionStorage.setItem(STORAGE_KEY, ip);
        } catch {}
        return ip;
      }
    }
  } catch {
    // Fallback to next provider
  }

  // Provider 2: api64.ipify.org (Dual-stack IPv4/IPv6)
  try {
    const res = await fetchWithTimeout('https://api64.ipify.org?format=json', 4000);
    if (res.ok) {
      const data = await res.json();
      if (data?.ip && typeof data.ip === 'string') {
        const ip = data.ip.trim();
        memoryCachedIp = ip;
        try {
          sessionStorage.setItem(STORAGE_KEY, ip);
        } catch {}
        return ip;
      }
    }
  } catch {
    // Fallback to next provider
  }

  // Provider 3: ipapi.co
  try {
    const res = await fetchWithTimeout('https://ipapi.co/json/', 4000);
    if (res.ok) {
      const data = await res.json();
      if (data?.ip && typeof data.ip === 'string') {
        const ip = data.ip.trim();
        memoryCachedIp = ip;
        try {
          sessionStorage.setItem(STORAGE_KEY, ip);
        } catch {}
        return ip;
      }
    }
  } catch {
    // Fallback to known detected public IP
  }

  memoryCachedIp = FALLBACK_PUBLIC_IP;
  return FALLBACK_PUBLIC_IP;
};

// Warm up client IP cache immediately in browser environment
if (typeof window !== 'undefined') {
  getClientIp().catch(() => {});
}
