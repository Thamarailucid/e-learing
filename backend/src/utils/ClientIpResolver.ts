import { Request } from 'express';

let cachedPublicIp: string | null = null;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const FALLBACK_PUBLIC_IP = '106.51.128.74';

/**
 * Checks whether an IP address is a loopback or local address
 */
export function isLoopbackIp(ip?: string | null): boolean {
  if (!ip) return true;
  const clean = ip.replace(/^::ffff:/, '').trim().toLowerCase();
  return (
    clean === '::1' ||
    clean === '127.0.0.1' ||
    clean === 'localhost' ||
    clean === '0.0.0.0' ||
    clean.startsWith('fe80:') ||
    clean === ''
  );
}

/**
 * Fetches the real external public IP using ipify with multi-provider fallback
 */
export async function FetchPublicIp(): Promise<string> {
  const now = Date.now();
  if (cachedPublicIp && now - lastFetchedAt < CACHE_TTL_MS) {
    return cachedPublicIp;
  }

  const providers = [
    'https://api.ipify.org?format=json',
    'https://api64.ipify.org?format=json',
    'https://ipinfo.io/json',
    'https://ifconfig.me/ip',
  ];

  for (const url of providers) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) {
        const text = await res.text();
        let ip = '';
        try {
          const json = JSON.parse(text);
          ip = json.ip || json.query;
        } catch {
          ip = text.trim();
        }

        if (ip && !isLoopbackIp(ip)) {
          cachedPublicIp = ip.trim();
          lastFetchedAt = now;
          return cachedPublicIp;
        }
      }
    } catch {
      // try next provider
    }
  }

  return cachedPublicIp || FALLBACK_PUBLIC_IP;
}

/**
 * Resolves the client IP for an incoming Express request.
 * If incoming IP is loopback (::1, 127.0.0.1), automatically resolves and uses the machine's
 * real external public IP from ipify so that ::1 is NEVER recorded in audit logs or database tables.
 */
export async function ResolveRequestClientIp(req: Request, explicitIp?: string): Promise<string> {
  // 1. Explicit IP from payload (e.g. from frontend getClientIp)
  if (explicitIp && !isLoopbackIp(explicitIp)) {
    return explicitIp.replace(/^::ffff:/, '').trim();
  }

  // 2. Custom header injected by frontend ApiClient
  const clientIpHeader = req.headers['x-client-ip'];
  if (typeof clientIpHeader === 'string' && !isLoopbackIp(clientIpHeader)) {
    return clientIpHeader.replace(/^::ffff:/, '').trim();
  }

  // 3. Standard reverse proxy / CDN headers
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && !isLoopbackIp(cfIp)) {
    return cfIp.replace(/^::ffff:/, '').trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && !isLoopbackIp(realIp)) {
    return realIp.replace(/^::ffff:/, '').trim();
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const firstIp = forwarded.split(',')[0].trim();
    if (!isLoopbackIp(firstIp)) {
      return firstIp.replace(/^::ffff:/, '').trim();
    }
  }

  // 4. Socket or Express req.ip
  const rawIp = req.ip || req.socket.remoteAddress;
  if (rawIp && !isLoopbackIp(rawIp)) {
    return rawIp.replace(/^::ffff:/, '').trim();
  }

  // 5. If loopback (::1, 127.0.0.1), resolve machine's real public IP from ipify!
  return await FetchPublicIp();
}

/**
 * Synchronous client IP resolver with cached public IP fallback
 */
export function ResolveRequestClientIpSync(req: Request, explicitIp?: string): string {
  if (explicitIp && !isLoopbackIp(explicitIp)) {
    return explicitIp.replace(/^::ffff:/, '').trim();
  }

  const clientIpHeader = req.headers['x-client-ip'];
  if (typeof clientIpHeader === 'string' && !isLoopbackIp(clientIpHeader)) {
    return clientIpHeader.replace(/^::ffff:/, '').trim();
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const firstIp = forwarded.split(',')[0].trim();
    if (!isLoopbackIp(firstIp)) {
      return firstIp.replace(/^::ffff:/, '').trim();
    }
  }

  const rawIp = req.ip || req.socket.remoteAddress;
  if (rawIp && !isLoopbackIp(rawIp)) {
    return rawIp.replace(/^::ffff:/, '').trim();
  }

  return cachedPublicIp || FALLBACK_PUBLIC_IP;
}

// Warm up the public IP cache in the background on startup
FetchPublicIp().catch(() => {});
