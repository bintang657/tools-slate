export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL kosong' });

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Set ini di Vercel nanti
  const GITHUB_REPO = 'bintang657/tools-slate';

  if (!GITHUB_TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN belum di-set di Vercel' });

  try {
    // 1. Picu GitHub Actions
    const trigger = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/bypass.yml/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-App'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { url }
      })
    });

    if (!trigger.ok) throw new Error('Gagal memicu GitHub Actions');

    // 2. Tunggu beberapa detik, lalu cari run terbaru
    await new Promise(r => setTimeout(r, 5000));
    
    const runsRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/runs?event=workflow_dispatch&per_page=1`, {
      headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    const runs = await runsRes.json();
    const runId = runs.workflow_runs[0].id;

    // 3. Polling status GitHub Actions
    let destination = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 5000)); // cek tiap 5 detik (max 2.5 menit)
      
      const statusRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
      });
      const status = await statusRes.json();

      if (status.status === 'completed') {
        if (status.conclusion === 'success') {
          // Ambil artifact result.json
          const artRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/runs/${runId}/artifacts`, {
            headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
          });
          const artifacts = await artRes.json();
          // (Di sini lu butuh library tambahan buat download zip artifact di Vercel,
          // jadi kita pakai trik baca log aja buat simplenya)
          
          // TRIK: Cari log yang ada tulisan "BERHASIL: "
          const logsRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/runs/${runId}/logs`, {
             headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
          });
          const logsText = await logsRes.text();
          const match = logsText.match(/BERHASIL: (https?:\/\/[^\s]+)/);
          if (match) destination = match[1];
        }
        break;
      }
    }

    if (destination) {
      return res.status(200).json({ success: true, destination });
    } else {
      return res.status(502).json({ error: 'GitHub Actions gagal atau timeout membuka link.' });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}