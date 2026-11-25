export default async function handler(req, res) {
  const domain = typeof req.query.domain === 'string' ? req.query.domain.trim().toLowerCase() : '';
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
    return res.status(400).json({ error: 'Invalid domain.' });
  }
  try {
    const upstream = await fetch(`https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(12000)
    });
    if (!upstream.ok) return res.status(upstream.status).json({ error: `crt.sh returned ${upstream.status}` });
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(Array.isArray(data) ? data.slice(0, 100) : []);
  } catch {
    return res.status(502).json({ error: 'Certificate transparency service is temporarily unavailable.' });
  }
}
