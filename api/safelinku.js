// language: JavaScript, file: api/safelinku.js, target: Vercel Node 20+
// Resolver Safelinku via Cloudflare Worker proxy.

const WORKER_URL = process.env.SAFELINKU_PROXY_URL;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const SHORTENER_HOSTS = [
  'sfl.gl', 'safelinku.com', 'safelinku.net', 'khaddavi.net', 'app.khaddavi.net',
  'tutwuri.id', 'adlinksumo.com', 'clk.ink', 'linkduit.net', 'link2unlock.com',
  'sub2unlock.com', 'sub4unlock.com',
];

function isShortenerHost(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/^www\./, '');
  return SHORTENER_HOSTS.some((d) => h === d || h.endsWith(`.${d}`));
}

function isCloudflareChallenge(html, status) {
  if (status === 403 || status === 503) return true;
  const h = String(html || '').toLowerCase();
  return (
    h.includes('just a moment') || h.includes('cf-mitigated') ||
    h.includes('challenge-platform') || h.includes('cdn-cgi/challenge') ||
    h.includes('cf-browser-verification') || h.includes('_cf_chl_opt')
  );
}

class CookieJar {
  constructor() { this.cookies = new Map(); }
  setFromHeaders(headers) {
    if (!headers) return;
    let list = [];
    if (typeof headers.getSetCookie === 'function') list = headers.getSetCookie();
    else if (headers.get('set-cookie')) list = [headers.get('set-cookie')];
    for (const str of list) {
      if (!str) continue;
      const nv = str.split(';')[0].trim();
      const eq = nv.indexOf('=');
      if (eq === -1) continue;
      const name = nv.slice(0, eq).trim();
      const value = nv.slice(eq + 1).trim();
      if (name) this.cookies.set(name, value);
    }
  }
  getCookieHeader() { return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; '); }
  get(name) { return this.cookies.get(name); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch via Worker proxy — Worker follow redirect, balikin body + final URL
async function fetchViaWorker(targetUrl, options = {}, jar) {
  if (!WORKER_URL) {
    // Fallback direct (akan gagal untuk sfl.gl dari IP Vercel)
    const res = await fetch(targetUrl, {
      method: options.method || 'GET',
      headers: { 'User-Agent': UA, ...(options.headers || {}) },
      body: options.body,
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });
    return res;
  }

  const proxyUrl = `${WORKER_URL.replace(/\/$/, '')}/?url=${encodeURIComponent(targetUrl)}`;
  const headers = { ...(options.headers || {}) };
  if (jar) {
    const cookie = jar.getCookieHeader();
    if (cookie) headers.Cookie = cookie;
  }

  const res = await fetch(proxyUrl, {
    method: options.method || 'GET',
    headers,
    body: options.body,
    signal: AbortSignal.timeout(25000),
  });

  const finalUrl = res.headers.get('x-proxy-final-url') || targetUrl;

  const setCookie = res.headers.get('x-upstream-set-cookie');
  if (jar && setCookie) {
    jar.setFromHeaders({ getSetCookie: () => [setCookie], get: () => setCookie });
  }

  Object.defineProperty(res, 'url', { value: finalUrl, writable: false });
  return res;
}

async function fetchWithJar(url, options = {}, jar) {
  let currentUrl = url;
  let method = options.method || 'GET';
  let body = options.body;

  for (let hop = 0; hop <= 10; hop++) {
    const res = await fetchViaWorker(currentUrl, { method, body, headers: options.headers }, jar);

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return res;
      currentUrl = new URL(loc, currentUrl).href;
      method = 'GET';
      body = undefined;
      continue;
    }

    return res;
  }

  const err = new Error('Terlalu banyak redirect.');
  err.code = 'TOO_MANY_REDIRECTS';
  throw err;
}

function extractDirectRedirect(html, baseUrl) {
  const meta = html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"';>]+)/i);
  if (meta) return new URL(meta[1].trim().replace(/['"]/g, ''), baseUrl).href;

  const loc = html.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i);
  if (loc) return new URL(loc[1].replace(/\\\//g, '/'), baseUrl).href;

  const href = html.match(/href=["'](https?:\/\/[^"']+)["'][^>]*(?:get\s*link|lanjut|continue|open\s*link)/i);
  if (href) return href[1];

  return null;
}

async function resolveChain(initialUrl) {
  let currentUrl = initialUrl.trim();
  if (!/^https?:\/\//i.test(currentUrl)) currentUrl = 'https://' + currentUrl;

  const visited = new Set();
  const hops = [];
  const maxHops = 8;

  for (let hop = 1; hop <= maxHops; hop++) {
    if (visited.has(currentUrl)) break;
    visited.add(currentUrl);
    hops.push(currentUrl);

    let hostname;
    try { hostname = new URL(currentUrl).hostname; } catch { break; }

    if (!isShortenerHost(hostname) && hop > 1) {
      return { destination: currentUrl, hops };
    }

    let res;
    try {
      res = await fetchWithJar(currentUrl, {}, new CookieJar());
    } catch (err) {
      if (hop === 1) throw err;
      break;
    }

    const html = await res.text();
    const finalUrl = res.url || currentUrl;

    if (isCloudflareChallenge(html, res.status)) {
      const err = new Error('Cloudflare masih memblokir meski via Worker. Cek apakah Worker lo di-deploy di region yang tepat (Indonesia/Singapore).');
      err.code = 'CLOUDFLARE_CHALLENGE';
      err.hops = hops;
      throw err;
    }

    const direct = extractDirectRedirect(html, finalUrl);
    if (direct && direct !== finalUrl) {
      currentUrl = direct;
      continue;
    }

    if (isShortenerHost(new URL(finalUrl).hostname)) {
      const err = new Error('Halaman shortener butuh interaksi JS (klik tombol countdown). Worker nggak bisa ngeksekusi JS.');
      err.code = 'SHORTENER_NEEDS_JS';
      err.hops = hops;
      throw err;
    }

    return { destination: finalUrl, hops };
  }

  const err = new Error('Tidak berhasil mengekstrak link tujuan.');
  err.code = 'NO_DESTINATION';
  err.hops = hops;
  throw err;
}

function readBody(req, maxBytes = 8192, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let raw = '';
    let settled = false;
    const finish = (fn, arg) => {
      if (!settled) { settled = true; clearTimeout(timer); fn(arg); }
    };
    const timer = setTimeout(() => {
      finish(reject, new Error('Body timeout.'));
      try { req.destroy(); } catch {}
    }, timeoutMs);
    req.on('data', (c) => {
      raw += c;
      if (raw.length > maxBytes) {
        finish(reject, new Error('Body terlalu besar.'));
        try { req.destroy(); } catch {}
      }
    });
    req.on('end', () => {
      try { finish(resolve, raw ? JSON.parse(raw) : {}); }
      catch { finish(reject, new Error('JSON tidak valid.')); }
    });
    req.on('error', (e) => finish(reject, e));
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.', code: 'METHOD' });

  let body;
  try { body = await readBody(req); }
  catch (e) { return res.status(400).json({ error: e.message || 'Body tidak valid.', code: 'BODY' }); }

  const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
  if (!rawUrl) return res.status(400).json({ error: 'Masukkan URL Safelinku / shortlink.', code: 'INVALID_URL' });

  let parsed;
  try { parsed = new URL(rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`); }
  catch { return res.status(400).json({ error: 'Format URL tidak valid.', code: 'INVALID_URL' }); }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'Hanya URL http/https yang didukung.', code: 'INVALID_URL' });
  }

  try {
    const result = await resolveChain(parsed.href);
    return res.status(200).json({
      source: parsed.href,
      destination: result.destination,
      hops: result.hops,
      chain: result.hops,
    });
  } catch (err) {
    return res.status(502).json({
      error: String(err?.message || 'Bypass gagal.').slice(0, 320),
      code: err?.code || 'BYPASS_ERROR',
      hops: err?.hops || [],
    });
  }
}