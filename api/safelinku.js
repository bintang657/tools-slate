import { createHash } from 'node:crypto';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const ALLOWED_HOSTS = new Set([
  'safelinku.com',
  'sfl.gl',
  'tutwuri.id',
  'app.khaddavi.net',
  'khaddavi.net',
  'adlinksumo.com',
  'link2unlock.com',
  'sub2unlock.com',
  'sub4unlock.com',
  'clk.ink',
  'linkduit.net',
  'safelinku.net',
]);

function isAllowedHost(hostname) {
  const h = hostname.toLowerCase().replace(/^www\./, '');
  if (ALLOWED_HOSTS.has(h)) return true;
  for (const d of ALLOWED_HOSTS) {
    if (h === d || h.endsWith(`.${d}`)) return true;
  }
  // gateway blogs used by the sfl engine often change; accept any host that
  // later presents the ray_id / alias form so multi-hop still works.
  return true;
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
  let currentUrl = url;
  let method = options.method || 'GET';
  let body = options.body;
  const headers = {
    'User-Agent': UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
    ...(options.headers || {}),
  };

  let redirects = 0;
  while (true) {
    const cookie = jar ? jar.getCookieHeader() : '';
    if (cookie) headers.Cookie = cookie;

    const response = await fetch(currentUrl, {
      method,
      headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
    });

    if (jar) jar.setFromHeaders(response.headers);

    if (response.status >= 300 && response.status < 400) {
      const loc = response.headers.get('location');
      if (!loc || redirects >= 12) {
        Object.defineProperty(response, 'url', { value: currentUrl, writable: false });
        return response;
      }
      redirects += 1;
      headers.Referer = currentUrl;
      currentUrl = new URL(loc, currentUrl).href;
      method = 'GET';
      body = undefined;
      delete headers['Content-Type'];
      delete headers['Content-Length'];
      continue;
    }

    Object.defineProperty(response, 'url', { value: currentUrl, writable: false });
    return response;
  }
}

function generateSessionToken(rawXsrfCookie) {
  const unquoted = decodeURIComponent(rawXsrfCookie || '');
  const fp = createHash('sha256')
    .update(
      'webgl:ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)||audio:12.345678901234||canvas:abcdef123||fonts:20/25||system:8CPU,8GB,Win32,0,1,0||env:Asia/Jakarta,1920,1080,24,en-US||network:4g,10,50'
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
  let step = sessionData1.step || 1;
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

  const rReady = await fetchWithJar(readyUrl, { headers: { Referer: step2PageUrl } }, jar);
  const htmlReady = await rReady.text();
  const destMatch = htmlReady.match(/window\.location\.href\s*=\s*["']([^"']+)["']/i);
  if (destMatch) {
    return destMatch[1].replace(/\\\//g, '/').replace(/\\u0026/g, '&');
  }
  return readyUrl;
}

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

    // Outside shortener network after at least one hop → real destination
    if (!isShortenerHost(hostname) && hop > 1) {
      return { destination: currentUrl, hops };
    }

    const jar = new CookieJar();
    let res;
    try {
      res = await fetchWithJar(currentUrl, {}, jar);
    } catch (err) {
      if (hop === 1) throw err;
      break;
    }

    const html = await res.text();
    const finalUrl = res.url;

    if (isCloudflareChallenge(html, res.status)) {
      throw new Error(
        'Cloudflare memblokir request server (challenge). Buka link di browser sampai lewat halaman “Just a moment”, salin URL di address bar, lalu tempel lagi di tool — atau pakai userscript Bypass SFL di browser untuk auto-klik sampai link tujuan (MediaFire, dll).'
      );
    }

    // sfl engine: ray_id + alias form
    try {
      const unlocked = await bypassSafelinkEngine(finalUrl, html, jar);
      if (unlocked && unlocked !== finalUrl) {
        currentUrl = unlocked;
        continue;
      }
    } catch {
      // fall through
    }

    const direct = extractDirectRedirect(html, finalUrl);
    if (direct && direct !== finalUrl) {
      currentUrl = direct;
      continue;
    }

    // stuck on shortener without unlock path
    if (isShortenerHost(new URL(finalUrl).hostname)) {
      throw new Error(
        'Masih di halaman shortener — link tujuan belum terbuka. sfl.gl dilindungi Cloudflare; request dari server tidak bisa menyelesaikan challenge. Buka di browser, lewati iklan/captcha, lalu salin URL tujuan (MediaFire/Drive/dll) dari address bar.'
      );
    }

    return { destination: finalUrl, hops };
  }

  // final guard: never report source or shortener as success
  try {
    const destHost = new URL(currentUrl).hostname;
    if (currentUrl === sourceUrl || isShortenerHost(destHost)) {
      throw new Error(
        'Tidak berhasil mengekstrak link tujuan. sfl.gl memakai Cloudflare; bypass penuh butuh sesi browser. Buka link di browser sampai muncul file host (MediaFire, dll), lalu salin URL itu.'
      );
    }
  } catch (e) {
    if (e.message && e.message.includes('Cloudflare') || e.message.includes('Tidak berhasil') || e.message.includes('Masih di')) throw e;
    throw new Error('Tidak berhasil mengekstrak link tujuan.');
  }

  return { destination: currentUrl, hops };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 8192) {
        reject(new Error('Body terlalu besar.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('JSON tidak valid.'));
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Body tidak valid.' });
  }

  const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
  if (!rawUrl) return res.status(400).json({ error: 'Masukkan URL Safelinku / shortlink.' });

  let parsed;
  try {
    parsed = new URL(rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`);
  } catch {
    return res.status(400).json({ error: 'Format URL tidak valid.' });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'Hanya URL http/https yang didukung.' });
  }

  try {
    const result = await resolveChain(parsed.href);
    if (!result.destination) {
      return res.status(502).json({ error: 'Tidak berhasil mengekstrak link tujuan.' });
    }
    return res.status(200).json({
      source: parsed.href,
      destination: result.destination,
      hops: result.hops,
    });
  } catch (err) {
    const message = err?.message || 'Bypass gagal.';
    return res.status(502).json({ error: String(message).slice(0, 240) });
  }
}
