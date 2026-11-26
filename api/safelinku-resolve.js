import { isIP } from 'node:net';

const SHORTENER_HOSTS = ['sfl.gl', 'safelinku.com'];
const MAX_REDIRECTS = 3;

function isShortenerHost(hostname) {
  const host = hostname.toLowerCase();
  return SHORTENER_HOSTS.some(root => host === root || host.endsWith(`.${root}`));
}

function isPrivateOrLocalHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
  const version = isIP(host);
  if (version === 4) {
    const [a, b] = host.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  if (version === 6) {
    return host === '::' || host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:');
  }
  return false;
}

function validWebUrl(url) {
  return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !isPrivateOrLocalHost(url.hostname);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const raw = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!raw || raw.length > 2048) return res.status(400).json({ error: 'Tautan kosong atau terlalu panjang.' });

  let current;
  try { current = new URL(raw); } catch { return res.status(400).json({ error: 'Format URL tidak valid.' }); }
  if (current.protocol !== 'https:' || !isShortenerHost(current.hostname) || current.username || current.password || current.port) {
    return res.status(400).json({ error: 'Hanya URL HTTPS sfl.gl atau safelinku.com yang didukung.' });
  }

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const upstream = await fetch(current.href, {
        method: 'GET',
        redirect: 'manual',
        headers: { Accept: 'text/html,application/xhtml+xml,*/*' },
        signal: AbortSignal.timeout(2000)
      });
      const location = upstream.headers.get('location');

      if (upstream.status >= 300 && upstream.status < 400 && location) {
        let next;
        try { next = new URL(location, current); } catch {
          await upstream.body?.cancel();
          return res.status(502).json({ error: 'SafeLinkU mengirim lokasi redirect yang tidak valid.' });
        }
        await upstream.body?.cancel();
        if (!validWebUrl(next)) return res.status(422).json({ error: 'Redirect mengarah ke URL yang tidak aman atau tidak didukung.' });
        if (!isShortenerHost(next.hostname)) {
          res.setHeader('Cache-Control', 'no-store');
          return res.status(200).json({ destination: next.href, hops: hop + 1 });
        }
        if (hop === MAX_REDIRECTS) return res.status(508).json({ error: 'Terlalu banyak redirect dari SafeLinkU.' });
        current = next;
        continue;
      }

      await upstream.body?.cancel();
      if (upstream.status === 401 || upstream.status === 403 || upstream.status === 429) {
        return res.status(422).json({ error: 'SafeLinkU meminta verifikasi atau membatasi permintaan. Lanjutkan lewat halaman resminya; tool tidak melewati CAPTCHA, iklan, atau batas akses.' });
      }
      if (!upstream.ok) return res.status(502).json({ error: `SafeLinkU merespons HTTP ${upstream.status}.` });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        finalUrl: current.href,
        message: 'Tidak ada redirect HTTP langsung. Tujuan mungkin hanya muncul setelah proses resmi SafeLinkU.'
      });
    }
    return res.status(508).json({ error: 'Tautan terlalu banyak redirect.' });
  } catch {
    return res.status(502).json({ error: 'Tidak dapat membaca redirect sfl.gl/SafeLinkU saat ini. Coba lagi atau gunakan proses resmi SafeLinkU.' });
  }
}
