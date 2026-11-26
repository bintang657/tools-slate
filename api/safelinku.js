// language: JavaScript, file: api/safelinku.js, target: Vercel Node 20+
import { createHash } from 'node:crypto';
import { guardedFetch, assertSafeHttpUrl, isBlockedHost } from './_lib/guard.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const SHORTENER_HOSTS = [
  'sfl.gl',
  'safelinku.com',
  'safelinku.net',
  'khaddavi.net',
  'app.khaddavi.net',
  'tutwuri.id',
  'adlinksumo.com',
  'clk.ink',
  'linkduit.net',
  'link2unlock.com',
  'sub2unlock.com',
  'sub4unlock.com',
];

function isShortenerHost(hostname) {
  const h = String(hostname || '')
    .toLowerCase()
    .replace(/^www\./, '');
  return SHORTENER_HOSTS.some((d) => h === d || h.endsWith(`.${d}`));
}

function isCloudflareChallenge(html, status) {
  if (status === 403 || status === 503) return true;
  const h = String(html || '').toLowerCase();
  return (
    h.includes('just a moment') ||
    h.includes('cf-mitigated') ||
    h.includes('challenge-platform') ||
    h.includes('cdn-cgi/challenge') ||
    h.includes('cf-browser-verification') ||
    h.includes('_cf_chl_opt')
  );
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }
  setFromHeaders(headers) {
    if (!headers) return;
    let setCookies = [];
    if (typeof headers.getSetCookie === 'function') {
      setCookies = headers.getSetCookie();
    } else if (headers.get('set-cookie')) {
      setCookies = [headers.get('set-cookie')];
    }
    for (const str of setCookies) {
      if (!str) continue;
      const nameValue = str.split(';')[0].trim();
      const eq = nameValue.indexOf('=');
      if (eq === -1) continue;
      const name = nameValue.slice(0, eq).trim();
      const value = nameValue.slice(eq + 1).trim();
      if (name) this.cookies.set(name, value);
    }
  }
  getCookieHeader() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  get(name) {
    return this.cookies.get(name);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithJar(url, options = {}, jar) {
  const headers = {
    'User-Agent': UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
    ...(options.headers || {}),
  };
  let currentUrl = url;
  let method = options.method || 'GET';
  let body = options.body;

  for (let hop = 0; hop <= 12; hop++) {
    const safe = assertSafeHttpUrl(currentUrl);
    if (!safe) {
      const err = new Error('Host diblokir.');
      err.code = 'BLOCKED_HOST';
      throw err;
    }
    const cookie = jar ? jar.getCookieHeader() : '';
    if (cookie) headers.Cookie = cookie;

    const res = await guardedFetch(currentUrl, { method, headers, body }, { maxRedirects: 0, timeout: 20000 });
    if (jar) jar.setFromHeaders(res.headers);

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) {
        Object.defineProperty(res, 'url', { value: currentUrl, writable: false });
        return res;
      }
      currentUrl = new URL(loc, currentUrl).href;
      method = 'GET';
      body = undefined;
      delete headers['Content-Type'];
      delete headers['Content-Length'];
      headers.Referer = currentUrl;
      continue;
    }

    Object.defineProperty(res, 'url', { value: currentUrl, writable: false });
    return res;
  }

  const err = new Error('Terlalu banyak redirect.');
  err.code = 'TOO_MANY_REDIRECTS';
  throw err;
}

async function fetchViaFlareSolverr(url) {
  const endpoint = process.env.FLARESOLVERR_URL;
  if (!endpoint) return null;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cmd: 'request.get',
        url,
        maxTimeout: 60000,
      }),
      signal: AbortSignal.timeout(70000),
    });
    const data = await res.json().catch(() => ({}));
    if (data.status !== 'ok' || !data.solution) return null;

    const html = data.solution.response || '';
    const finalUrl = data.solution.url || url;
    const cookies = data.solution.cookies || [];
    const jar = new CookieJar();
    for (const c of cookies) {
      if (c?.name && c.value != null) jar.cookies.set(c.name, String(c.value));
    }
    return {
      html,
      finalUrl,
      jar,
      status: data.solution.status || 200,
    };
  } catch {
    return null;
  }
}

const WEBGL_VENDORS = [
  'webgl:ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'webgl:ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'webgl:ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'webgl:ANGLE (Apple, Apple M1, OpenGL 4.1)',
  'webgl:ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
];
const TIMEZONES = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Bangkok'];
const LANGUAGES = ['id-ID', 'en-US', 'id', 'en'];
const RESOLUTIONS = ['1920,1080,24', '1366,768,24', '2560,1440,24', '1536,864,24', '1280,720,24'];
const NETWORKS = ['4g,10,50', '4g,15,80', '5g,20,120', '3g,2,8'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSessionToken(rawXsrfCookie) {
  const unquoted = decodeURIComponent(rawXsrfCookie || '');
  const fp = createHash('sha256')
    .update(
      [
        pick(WEBGL_VENDORS),
        `audio:${(Math.random() * 20 + 5).toFixed(12)}`,
        `canvas:${Math.random().toString(36).slice(2, 14)}`,
        `fonts:${18 + Math.floor(Math.random() * 10)}/25`,
        `system:${4 + Math.floor(Math.random() * 12)}CPU,${8 + Math.floor(Math.random() * 24)}GB,Win32,0,1,0`,
        `env:${pick(TIMEZONES)},${pick(RESOLUTIONS)},${pick(LANGUAGES)}`,
        `network:${pick(NETWORKS)}`,
      ].join('||')
    )
    .digest('hex');
  const o = '#' + Buffer.from(fp).toString('base64');
  return unquoted.slice(0, Math.max(0, 128 - o.length)) + o;
}

async function bypassSafelinkEngine(targetUrl, initialHtml, jar) {
  let html = initialHtml;
  let currentShortlinkUrl = targetUrl;

  if (!html) {
    const r1 = await fetchWithJar(targetUrl, {}, jar);
    html = await r1.text();
    currentShortlinkUrl = r1.url;
  }

  const formMatch = html.match(/<form[^>]+action=["']([^"']+)["'][^>]*>([\s\S]*?)<\/form>/i);
  const rayMatch = html.match(/name=["']ray_id["']\s+value=["']([^"']+)["']/i);
  const aliasMatch = html.match(/name=["']alias["']\s+value=["']([^"']+)["']/i);

  if (!formMatch || !rayMatch || !aliasMatch) return null;

  const actionUrl = formMatch[1];
  const rayId = rayMatch[1];
  const alias = aliasMatch[1];
  const parsedAction = new URL(actionUrl, currentShortlinkUrl);
  const blogOrigin = `${parsedAction.protocol}//${parsedAction.host}`;
  const redirectUrl = `${blogOrigin}/redirect.php?ray_id=${encodeURIComponent(rayId)}&alias=${encodeURIComponent(alias)}`;

  const r2 = await fetchWithJar(redirectUrl, { headers: { Referer: currentShortlinkUrl } }, jar);
  const step1PageUrl = r2.url;

  const xsrf1 = jar.get('XSRF-TOKEN');
  if (!xsrf1) throw new Error('Gateway tidak mengirim XSRF-TOKEN.');

  const sessionHeaders = {
    Origin: blogOrigin,
    Referer: step1PageUrl,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest',
  };

  const sessionRes1 = await fetchWithJar(
    `${blogOrigin}/api/session`,
    {
      method: 'POST',
      headers: sessionHeaders,
      body: JSON.stringify({ _token: generateSessionToken(xsrf1) }),
    },
    jar
  );
  const sessionData1 = await sessionRes1.json().catch(() => ({}));
  const step = sessionData1.step || 1;
  let step2PageUrl = step1PageUrl;

  if (step === 1) {
    await sleep(700);
    const verifyRes = await fetchWithJar(
      `${blogOrigin}/api/verify`,
      {
        method: 'POST',
        headers: sessionHeaders,
        body: JSON.stringify({ _a: 0, captcha: null, passcode: null }),
      },
      jar
    );
    const verifyData = await verifyRes.json().catch(() => ({}));
    let target = verifyData.target || '/redirect.php';
    if (target.startsWith('/')) target = `${blogOrigin}${target}`;

    const r3 = await fetchWithJar(target, { headers: { Referer: step1PageUrl } }, jar);
    step2PageUrl = r3.url;

    const xsrf2 = jar.get('XSRF-TOKEN') || xsrf1;
    sessionHeaders.Referer = step2PageUrl;
    await fetchWithJar(
      `${blogOrigin}/api/session`,
      {
        method: 'POST',
        headers: sessionHeaders,
        body: JSON.stringify({ _token: generateSessionToken(xsrf2) }),
      },
      jar
    );
  }

  await sleep(1200);
  const key = 500;
  const size = `${(1920 + key) * 2}.${(1080 + key) * 2}`;
  sessionHeaders.Referer = step2PageUrl;

  const goRes = await fetchWithJar(
    `${blogOrigin}/api/go`,
    {
      method: 'POST',
      headers: sessionHeaders,
      body: JSON.stringify({ key, size }),
    },
    jar
  );

  const goText = await goRes.text();
  let goData = {};
  try {
    goData = JSON.parse(goText);
  } catch {
    throw new Error('Respons /api/go tidak valid.');
  }

  let readyUrl = goData.url;
  if (!readyUrl) throw new Error('Gateway tidak mengembalikan URL siap.');
  if (!/^https?:\/\//i.test(readyUrl)) readyUrl = new URL(readyUrl, blogOrigin).href;

  const safeReady = assertSafeHttpUrl(readyUrl);
  if (!safeReady) throw new Error('URL siap menuju host yang diblokir.');

  const rReady = await fetchWithJar(safeReady.href, { headers: { Referer: step2PageUrl } }, jar);
  const htmlReady = await rReady.text();
  const destMatch = htmlReady.match(/window\.location\.href\s*=\s*["']([^"']+)["']/i);
  if (destMatch) {
    return destMatch[1].replace(/\\\//g, '/').replace(/\\u0026/g, '&');
  }
  return safeReady.href;
}

function extractDirectRedirect(html, baseUrl) {
  const meta = html.match(
    /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"';>]+)/i
  );
  if (meta) return new URL(meta[1].trim().replace(/['"]/g, ''), baseUrl).href;

  const loc = html.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i);
  if (loc) return new URL(loc[1].replace(/\\\//g, '/'), baseUrl).href;

  const href = html.match(
    /href=["'](https?:\/\/[^"']+)["'][^>]*(?:get\s*link|lanjut|continue|open\s*link)/i
  );
  if (href) return href[1];

  return null;
}

async function resolveChain(initialUrl) {
  let currentUrl = initialUrl.trim();
  if (!/^https?:\/\//i.test(currentUrl)) currentUrl = 'https://' + currentUrl;
  const sourceUrl = currentUrl;

  const visited = new Set();
  const hops = [];
  const maxHops = 12;

  for (let hop = 1; hop <= maxHops; hop++) {
    if (visited.has(currentUrl)) break;
    visited.add(currentUrl);
    hops.push(currentUrl);

    let hostname;
    try {
      hostname = new URL(currentUrl).hostname;
    } catch {
      break;
    }

    if (!isShortenerHost(hostname) && hop > 1) {
      return { destination: currentUrl, hops };
    }

    let html;
    let finalUrl;
    let jar;
    let status;

    const viaFlare = await fetchViaFlareSolverr(currentUrl);
    if (viaFlare) {
      ({ html, finalUrl, jar, status } = viaFlare);
    } else {
      jar = new CookieJar();
      let res;
      try {
        res = await fetchWithJar(currentUrl, {}, jar);
      } catch (err) {
        if (err.code === 'BLOCKED_HOST') throw new Error('Host diblokir oleh guard.');
        if (hop === 1) throw err;
        break;
      }
      html = await res.text();
      finalUrl = res.url;
      status = res.status;
    }

    if (isCloudflareChallenge(html, status)) {
      throw new Error(
        process.env.FLARESOLVERR_URL
          ? 'Cloudflare masih memblokir meski FlareSolverr aktif. Cek instance solver (log / health) atau ganti IP.'
          : 'Cloudflare memblokir request server (challenge). Set env FLARESOLVERR_URL ke instance FlareSolverr (http://IP:8191/v1), redeploy, lalu coba lagi. Tanpa solver, buka link di browser + userscript Bypass SFL.'
      );
    }

    try {
      const unlocked = await bypassSafelinkEngine(finalUrl, html, jar);
      if (unlocked && unlocked !== finalUrl) {
        const safe = assertSafeHttpUrl(unlocked);
        if (!safe) throw new Error('Destination diblokir oleh guard.');
        currentUrl = safe.href;
        continue;
      }
    } catch (e) {
      if (e.code === 'BLOCKED_HOST') throw e;
    }

    const direct = extractDirectRedirect(html, finalUrl);
    if (direct && direct !== finalUrl) {
      const safe = assertSafeHttpUrl(direct);
      if (!safe) throw new Error('Redirect target diblokir oleh guard.');
      currentUrl = safe.href;
      continue;
    }

    if (isShortenerHost(new URL(finalUrl).hostname)) {
      throw new Error(
        'Masih di halaman shortener — link tujuan belum terbuka. sfl.gl dilindungi Cloudflare. Pasang FlareSolverr + FLARESOLVERR_URL, atau buka di browser sampai file host muncul lalu salin URL-nya.'
      );
    }

    return { destination: finalUrl, hops };
  }

  try {
    const destHost = new URL(currentUrl).hostname;
    if (currentUrl === sourceUrl || isShortenerHost(destHost)) {
      throw new Error(
        'Tidak berhasil mengekstrak link tujuan. Pasang FlareSolverr (FLARESOLVERR_URL) atau selesaikan di browser.'
      );
    }
  } catch (e) {
    if (
      e.message &&
      (e.message.includes('Cloudflare') ||
        e.message.includes('Tidak berhasil') ||
        e.message.includes('Masih di') ||
        e.message.includes('FlareSolverr'))
    ) {
      throw e;
    }
    throw new Error('Tidak berhasil mengekstrak link tujuan.');
  }

  return { destination: currentUrl, hops };
}

function readBody(req, maxBytes = 8192, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let raw = '';
    let settled = false;
    const finish = (fn, arg) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        fn(arg);
      }
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
      try {
        finish(resolve, raw ? JSON.parse(raw) : {});
      } catch {
        finish(reject, new Error('JSON tidak valid.'));
      }
    });
    req.on('error', (e) => finish(reject, e));
  });
}

function sanitizeDestination(raw) {
  const safe = assertSafeHttpUrl(String(raw || ''));
  return safe ? safe.href : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.', code: 'METHOD' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Body tidak valid.', code: 'BODY' });
  }

  const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
  if (!rawUrl) {
    return res.status(400).json({ error: 'Masukkan URL Safelinku / shortlink.', code: 'INVALID_URL' });
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`);
  } catch {
    return res.status(400).json({ error: 'Format URL tidak valid.', code: 'INVALID_URL' });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'Hanya URL http/https yang didukung.', code: 'INVALID_URL' });
  }

  if (isBlockedHost(parsed.hostname)) {
    return res.status(400).json({ error: 'Host internal diblokir.', code: 'BLOCKED_HOST' });
  }

  try {
    const result = await resolveChain(parsed.href);
    const destination = sanitizeDestination(result.destination);
    if (!destination) {
      return res.status(502).json({
        error: 'Destination diblokir atau tidak valid.',
        code: 'BLOCKED_HOST',
        hops: result.hops,
      });
    }
    return res.status(200).json({
      source: parsed.href,
      destination,
      hops: result.hops,
      chain: result.hops,
    });
  } catch (err) {
    const message = err?.message || 'Bypass gagal.';
    const code = err?.code || 'BYPASS_ERROR';
    return res.status(502).json({ error: String(message).slice(0, 320), code });
  }
}