// language: JavaScript, file: api/ai-slate.js, target: Vercel Node 20+
const LIMIT_WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 12
const requestBuckets = new Map()

const MODE_PROMPTS = {
  general: 'Kamu adalah Slate, asisten serbaguna yang cermat, hangat, dan solutif. Ikuti bahasa pengguna (gunakan Bahasa Indonesia jika tidak jelas). Jawab inti pertanyaan lebih dulu, lalu susun detail dengan poin atau langkah jika membantu. Sesuaikan panjang jawaban dengan kebutuhan; jangan mengulang pertanyaan. Jika maksudnya ambigu dan jawabannya bisa berbeda jauh, tanyakan satu klarifikasi singkat. Bedakan fakta, perkiraan, dan opini; akui ketidakpastian dan jangan mengarang sumber, data, atau kemampuan.',
  coding: 'Kamu adalah Slate Code, pendamping pemrograman yang teliti. Bantu analisis kode, desain, debugging, API, JSON, SQL, regex, dan keamanan. Mulai dengan diagnosis/solusi paling mungkin; berikan potongan kode atau diff yang minimal dan dapat diterapkan, sebutkan asumsi versi/runtime, serta jelaskan cara verifikasi. Untuk bug, minta detail error atau konteks yang benar-benar diperlukan. Prioritaskan solusi aman dan jangan mengklaim sudah menjalankan kode atau mengakses proyek pengguna.',
  writing: 'Kamu adalah Slate Writer, editor dan rekan menulis. Buat atau revisi teks sesuai tujuan, audiens, bahasa, dan nada yang diminta. Pertahankan maksud dan fakta dari pengguna; jangan menambahkan klaim yang tidak diberikan. Jika permintaan cukup jelas, berikan draf siap pakai terlebih dahulu, kemudian catatan revisi hanya bila berguna.',
  study: 'Kamu adalah Slate Tutor yang sabar dan adaptif. Jelaskan dari konsep inti ke detail, gunakan contoh atau analogi yang akurat, dan pecah materi sulit menjadi langkah kecil. Sesuaikan kedalaman dengan pertanyaan, cek pemahaman dengan satu latihan singkat bila relevan, dan berikan petunjuk sebelum jawaban penuh saat pengguna sedang mengerjakan soal. Koreksi miskonsepsi dengan ramah.',
  summarize: 'Kamu adalah Slate, peringkas yang setia pada materi. Ambil hanya informasi dari teks yang diberikan; jangan menambah fakta eksternal. Sajikan inti secara ringkas dan gunakan bagian seperti poin utama, keputusan, dan tindak lanjut hanya jika sesuai. Pertahankan nama, angka, tanggal, serta batasan penting. Jika teks belum diberikan, minta pengguna menempelkannya.',
  tools: 'Kamu adalah panduan penggunaan Tools Slate. Bantu memilih tool berdasarkan tujuan dan berikan langkah praktis yang bisa diikuti pengguna. Contoh cakupan situs meliputi alat PDF/gambar, JSON/regex/JWT, dan pemeriksaan domain. Jangan mengklaim telah membuka situs, menjalankan tool, atau memproses berkas pengguna. Jika detail suatu tool tidak diketahui, katakan terus terang dan minta nama atau screenshot tool tersebut.',
}

function rateLimit(ip) {
  const now = Date.now()
  const entry = requestBuckets.get(ip) || { count: 0, resetAt: now + LIMIT_WINDOW_MS }
  if (now >= entry.resetAt) { entry.count = 0; entry.resetAt = now + LIMIT_WINDOW_MS }
  entry.count += 1
  requestBuckets.set(ip, entry)
  if (requestBuckets.size > 5000) {
    for (const [key, value] of requestBuckets) if (now >= value.resetAt) requestBuckets.delete(key)
  }
  return entry.count <= MAX_REQUESTS_PER_WINDOW
}

function respond(res, status, data) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  return res.status(status).json(data)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return respond(res, 405, { error: 'Metode request tidak didukung.' })
  }

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim()
  if (!rateLimit(ip)) return respond(res, 429, { error: 'Batas penggunaan sementara tercapai. Tunggu satu menit lalu coba lagi.' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return respond(res, 503, { error: 'Slate belum diaktifkan. Tambahkan GEMINI_API_KEY di Environment Variables proyek Vercel.' })

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return respond(res, 400, { error: 'Format request tidak valid.' }) }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return respond(res, 400, { error: 'Request harus berupa objek JSON.' })
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > 24_000) return respond(res, 413, { error: 'Percakapan terlalu besar. Mulai chat baru atau pendekkan pesannya.' })

  const mode = MODE_PROMPTS[body.mode] ? body.mode : 'general'
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 18) {
    return respond(res, 400, { error: 'Percakapan harus berisi 1–18 pesan terakhir.' })
  }

  const contents = []
  for (const message of body.messages) {
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string') {
      return respond(res, 400, { error: 'Format pesan tidak valid.' })
    }
    const text = message.content.trim()
    if (!text || text.length > 8_000) return respond(res, 400, { error: 'Setiap pesan harus berisi maksimal 8.000 karakter.' })
    contents.push({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text }] })
  }
  while (contents.length && contents[0].role !== 'user') contents.shift()
  if (!contents.length) return respond(res, 400, { error: 'Tambahkan pesan pengguna sebelum mengirim.' })

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: MODE_PROMPTS[mode] }] },
        contents,
        generationConfig: { temperature: 0.55, maxOutputTokens: 1800 },
      }),
      signal: controller.signal,
    })
    const payload = await upstream.json().catch(() => ({}))
    if (!upstream.ok) {
      const error = upstream.status === 429
        ? 'Kuota gratis Gemini sedang habis. Tunggu sampai kuota pulih atau coba lagi nanti.'
        : upstream.status === 400 || upstream.status === 403
          ? 'Gemini menolak permintaan. Periksa API key, akses model, dan status Free Tier di Google AI Studio.'
          : 'Layanan Gemini sedang bermasalah. Coba lagi sebentar.'
      return respond(res, upstream.status === 429 ? 429 : 502, { error })
    }
    const answer = payload.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim()
    if (!answer) return respond(res, 502, { error: 'Gemini tidak mengembalikan jawaban. Ubah pertanyaan lalu coba lagi.' })
    return respond(res, 200, { answer, model })
  } catch (error) {
    return respond(res, error.name === 'AbortError' ? 504 : 502, {
      error: error.name === 'AbortError' ? 'Gemini merespons terlalu lama. Coba kirim ulang.' : 'Tidak dapat menghubungi Gemini saat ini.',
    })
  } finally { clearTimeout(timeout) }
}
