// language: JavaScript, file: api/cert-transparency.js, target: Vercel Node 20+
const BUCKET = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

function rateLimit(ip) {
  const now = Date.now();
  const entry = BUCKET.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + WINDOW_MS;
  }
  entry.count += 1;
  BUCKET.set(ip, entry);
  if (BUCKET.size > 5000) {
    for (const [k, v] of BUCKET) if (now > v.resetAt) BUCKET.delete(k);
  }
  return entry.count <= MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi sebentar.' });
  }

  const domain = typeof req.query.domain === 'string' ? req.query.domain.trim().toLowerCase() : '';

  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
    return res.status(400).json({ error: 'Invalid domain.' });
  }

  try {
    const upstream = await fetch(
      `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`,
      {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      }
    );

    if (!upstream.ok) {
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: 'Certificate transparency provider returned an error.' });
    }

    const contentLength = Number(upstream.headers.get('content-length') || '0');
    if (contentLength > MAX_RESPONSE_BYTES) {
      return res.status(502).json({ error: 'Certificate transparency response is too large.' });
    }
    const raw = await upstream.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_RESPONSE_BYTES) {
      return res.status(502).json({ error: 'Certificate transparency response is too large.' });
    }
    let data;
    try { data = raw ? JSON.parse(raw) : []; }
    catch { return res.status(502).json({ error: 'Certificate transparency provider returned invalid JSON.' }); }
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(Array.isArray(data) ? data.slice(0, 100) : []);
  } catch {
    return res
      .status(502)
      .json({ error: 'Certificate transparency service is temporarily unavailable.' });
  }
}