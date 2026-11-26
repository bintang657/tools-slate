// language: JavaScript, file: api/_lib/guard.js, target: Vercel Node 20+
// Shared SSRF guard: hostname validation, IP block, redirect-safe fetch.
// Dipakai oleh safelinku.js, social-download.js, cert-transparency.js.

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'metadata.google.com',
  'metadata',
  'instance-data',
  'kubernetes.default',
  'kubernetes.default.svc',
  'kubernetes.default.svc.cluster.local',
  '169.254.169.254',
  '100.100.100.200',
  'fd00:ec2::254',
]);

function normalizeHost(host) {
  return String(host || '')
    .toLowerCase()
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/\.$/, '');
}

function isPrivateIPv4(host) {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b, c, d] = m.slice(1).map(Number);
  if ([a, b, c, d].some((n) => n < 0 || n > 255)) return true;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && c === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIPv6(host) {
  const h = host.replace(/^\[/, '').replace(/\]$/, '');
  if (h === '::1' || h === '::') return true;
  if (/^fe80:/i.test(h)) return true;
  if (/^f[cd][0-9a-f]{2}:/i.test(h)) return true;
  if (/^::ffff:/i.test(h)) {
    const v4 = h.slice(7);
    return isPrivateIPv4(v4);
  }
  return false;
}

export function isBlockedHost(hostname) {
  const h = normalizeHost(hostname);
  if (!h) return true;
  if (BLOCKED_HOSTNAMES.has(h)) return true;
  if (h.endsWith('.internal')) return true;
  if (h.endsWith('.local')) return true;
  if (h.endsWith('.localhost')) return true;
  if (isPrivateIPv4(h)) return true;
  if (isPrivateIPv6(h)) return true;
  return false;
}

export function assertSafeHttpUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.username || u.password) return null;
  if (isBlockedHost(u.hostname)) return null;
  return u;
}

export async function guardedFetch(url, init = {}, opts = {}) {
  const maxRedirects = opts.maxRedirects ?? 8;
  const timeoutMs = opts.timeout ?? 20000;
  let current = url;
  let method = init.method || 'GET';
  let body = init.body;
  const headers = { ...(init.headers || {}) };

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const safe = assertSafeHttpUrl(current);
    if (!safe) {
      const err = new Error('Blocked host or scheme.');
      err.code = 'BLOCKED_HOST';
      throw err;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res;
    try {
      res = await fetch(current, { ...init, method, body, headers, redirect: 'manual', signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) {
        Object.defineProperty(res, 'url', { value: current, writable: false });
        return res;
      }
      const next = new URL(loc, current);
      if (!assertSafeHttpUrl(next.href)) {
        const err = new Error('Redirect target blocked.');
        err.code = 'BLOCKED_HOST';
        throw err;
      }
      current = next.href;
      if (method !== 'GET') {
        method = 'GET';
        body = undefined;
        delete headers['Content-Type'];
        delete headers['Content-Length'];
      }
      continue;
    }

    Object.defineProperty(res, 'url', { value: current, writable: false });
    return res;
  }

  const err = new Error('Too many redirects.');
  err.code = 'TOO_MANY_REDIRECTS';
  throw err;
}