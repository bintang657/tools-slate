import { Readable } from 'node:stream';

const API_BASE = 'https://api.ssave.cc';
const PROVIDER = process.env.SOCIAL_DOWNLOADER_PROVIDER || 'ssave';
const PLATFORM_HOSTS = {
  tiktok: ['tiktok.com'],
  instagram: ['instagram.com']
};
const DOWNLOAD_TYPES = new Set(['hd', 'watermark', 'mp3']);

function getPlatformFromUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  for (const [platform, domains] of Object.entries(PLATFORM_HOSTS)) {
    if (domains.some(domain => host === domain || host.endsWith(`.${domain}`))) return platform;
  }
  return null;
}

async function readJson(response) {
  const raw = await response.text();
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

function sendProviderError(res, status, payload) {
  const message = payload?.error?.message || payload?.error || payload?.message || `Ssave API merespons HTTP ${status}.`;
  const resetAt = payload?.error?.reset_at || payload?.reset_at;
  return res.status(status === 429 ? 429 : (status >= 400 && status < 500 ? status : 502)).json({
    error: String(message).slice(0, 240),
    ...(resetAt ? { resetAt } : {})
  });
}

async function extractWithSsave(url) {
  const response = await fetch(`${API_BASE}/open/v1/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ url, format: 'video' }),
    signal: AbortSignal.timeout(120000)
  });
  const payload = await readJson(response);
  if (!response.ok) {
    const error = new Error(payload?.error?.message || payload?.message || payload?.error || `Ssave API HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function handleExtract(req, res) {
  const { url } = req.body || {};
  const platform = typeof url === 'string' ? getPlatformFromUrl(url) : null;
  if (!platform) return res.status(400).json({ error: 'Masukkan tautan HTTPS TikTok atau Instagram yang valid.' });

  try {
    // Provider adapter: Ssave aktif. Knightvision dapat ditambahkan setelah akses dan kontrak API resminya diverifikasi.
    if (PROVIDER !== 'ssave') return res.status(503).json({ error: 'Provider downloader belum dikonfigurasi.' });
    const payload = await extractWithSsave(url);
    if (typeof payload?.id !== 'string' || !payload.id.trim() || !Array.isArray(payload.formats) || !payload.download || typeof payload.download !== 'object') {
      return res.status(502).json({ error: 'Respons Ssave tidak sesuai format yang diharapkan.' });
    }

    const media = payload.formats
      .filter(type => DOWNLOAD_TYPES.has(type) && payload.download[type])
      .map(type => ({
        url: `/api/social-download?id=${encodeURIComponent(payload.id.trim())}&type=${encodeURIComponent(type)}`,
        type: type === 'mp3' ? 'audio' : 'video',
        quality: type === 'hd' ? 'HD' : type === 'watermark' ? 'Dengan watermark' : 'MP3',
        label: type === 'hd' ? 'Video HD' : type === 'watermark' ? 'Video dengan watermark' : 'Audio MP3'
      }));

    if (!media.length) return res.status(422).json({ error: 'Ssave tidak mengembalikan format media yang dapat diunduh.' });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      title: payload.title || 'Media ditemukan',
      author: payload.author || null,
      source: platform,
      thumbnail: payload.thumbnail || null,
      expiresAt: payload.expires_at || null,
      media,
      quota: { extract: '10 per hari', download: '50 per hari', reset: '00.00 UTC', scope: 'IP server deployment' }
    });
  } catch (error) {
    if (error.status) return sendProviderError(res, error.status, error.payload);
    return res.status(502).json({ error: error.message || 'Ssave sedang tidak dapat dihubungi.' });
  }
}

async function handleDownload(req, res) {
  const id = typeof req.query?.id === 'string' ? req.query.id.trim() : '';
  const type = typeof req.query?.type === 'string' ? req.query.type : 'hd';
  // Ssave issues opaque ssv_ IDs. Keep the prefix check, but do not assume token length.
  if (!/^ssv_[A-Za-z0-9_-]+$/.test(id) || id.length > 512 || !DOWNLOAD_TYPES.has(type)) {
    return res.status(400).json({ error: 'Token unduhan tidak valid atau sudah hilang. Cari media lagi.' });
  }

  try {
    // Official Ssave flow: GET /open/v1/download?id=<extract.id>&type=hd|watermark|mp3
    const upstream = await fetch(`${API_BASE}/open/v1/download?id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`, {
      headers: { Accept: 'application/octet-stream, application/json' },
      signal: AbortSignal.timeout(120000)
    });

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    // Some upstream failures may be returned as HTTP 200 JSON; never save that as .mp4/.mp3.
    if (!upstream.ok || contentType.includes('json') || contentType.startsWith('text/')) {
      const raw = await upstream.text();
      let payload = {};
      try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { message: raw.slice(0, 240) }; }
      const status = upstream.ok ? 502 : upstream.status;
      return sendProviderError(res, status, payload);
    }

    if (!upstream.body) return res.status(502).json({ error: 'Penyedia tidak mengirim data media.' });

    const stream = Readable.fromWeb(upstream.body);
    const iterator = stream[Symbol.asyncIterator]();
    const first = await iterator.next();
    if (first.done) return res.status(502).json({ error: 'File media kosong dari penyedia. Silakan cari media lagi.' });

    const head = Buffer.from(first.value);
    const isMp4 = head.length >= 8 && head.toString('ascii', 4, 8) === 'ftyp';
    const isMp3 = head.length >= 3 && (head.toString('ascii', 0, 3) === 'ID3' || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0));
    if (type === 'mp3' ? !isMp3 : !isMp4) {
      await iterator.return?.();
      return res.status(502).json({ error: `Respons Ssave bukan file ${type === 'mp3' ? 'MP3' : 'MP4'} yang valid (Content-Type: ${contentType || 'tidak diketahui'}). Coba cari media lagi.` });
    }

    res.statusCode = 200;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', type === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="ssave-${type}.${type === 'mp3' ? 'mp3' : 'mp4'}"`);
    const length = upstream.headers.get('content-length');
    if (length) res.setHeader('Content-Length', length);
    res.write(first.value);
    for await (const chunk of { [Symbol.asyncIterator]: () => iterator }) res.write(chunk);
    res.end();
  } catch (error) {
    if (!res.headersSent) return res.status(502).json({ error: error.message || 'Gagal mengunduh media dari Ssave.' });
    res.destroy(error);
  }
}

export default async function handler(req, res) {
  if (req.method === 'POST') return handleExtract(req, res);
  if (req.method === 'GET') return handleDownload(req, res);
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed.' });
}
