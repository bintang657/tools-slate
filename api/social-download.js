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
    if (!Array.isArray(payload.formats) || !payload.download || typeof payload.download !== 'object') {
      return res.status(502).json({ error: 'Respons Ssave tidak sesuai format yang diharapkan.' });
    }

    const media = payload.formats
      .filter(type => DOWNLOAD_TYPES.has(type) && typeof payload.download[type] === 'string')
      .map(type => ({
        url: `/api/social-download?source=${encodeURIComponent(Buffer.from(payload.download[type], 'utf8').toString('base64url'))}&type=${encodeURIComponent(type)}`,
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
  const encoded = typeof req.query?.source === 'string' ? req.query.source : '';
  const type = typeof req.query?.type === 'string' ? req.query.type : 'hd';
  if (!encoded || encoded.length > 12000 || !DOWNLOAD_TYPES.has(type)) {
    return res.status(400).json({ error: 'Tautan unduhan tidak valid. Silakan cari media lagi.' });
  }

  let sourceUrl;
  try {
    sourceUrl = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed = new URL(sourceUrl);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || /^127\.|^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)) throw new Error('invalid source');
  } catch {
    return res.status(400).json({ error: 'URL media dari penyedia tidak valid. Silakan cari media lagi.' });
  }

  try {
    const upstream = await fetch(sourceUrl, {
      headers: { Accept: type === 'mp3' ? 'audio/mpeg,application/octet-stream,*/*' : 'video/mp4,application/octet-stream,*/*' },
      signal: AbortSignal.timeout(120000)
    });
    if (!upstream.ok || !upstream.body) {
      const payload = await readJson(upstream);
      return sendProviderError(res, upstream.status || 502, payload);
    }

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('json') || contentType.startsWith('text/')) {
      const payload = await readJson(upstream);
      return res.status(502).json({ error: payload?.error?.message || payload?.message || 'Penyedia mengembalikan pesan error, bukan file media. Cari media lagi.' });
    }

    const stream = Readable.fromWeb(upstream.body);
    const iterator = stream[Symbol.asyncIterator]();
    const first = await iterator.next();
    if (first.done) return res.status(502).json({ error: 'File media kosong dari penyedia.' });
    const head = Buffer.from(first.value).subarray(0, 16);
    const isMp4 = head.length >= 8 && head.toString('ascii', 4, 8) === 'ftyp';
    const isMp3 = head.length >= 3 && (head.toString('ascii', 0, 3) === 'ID3' || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0));
    if (type === 'mp3' ? !isMp3 : !isMp4) {
      await iterator.return?.();
      return res.status(502).json({ error: 'Respons penyedia bukan file MP4 yang valid. Silakan cari media lagi.' });
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
