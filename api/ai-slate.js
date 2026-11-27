// language: JavaScript, file: api/ai-slate.js, target: Vercel Node 20+
const LIMIT_WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 12
const requestBuckets = new Map()

const MODE_PROMPTS = {
  general: 'Kamu adalah AI Slate, asisten serbaguna yang akurat, ramah, dan praktis. Jawab dalam Bahasa Indonesia kecuali pengguna meminta bahasa lain. Jika tidak yakin, katakan dengan jujur. Jangan mengarang sumber atau fakta.',
  coding: 'Kamu adalah AI Slate Code, asisten pemrograman senior. Bantu memahami kode, merancang solusi, debugging, API, JSON, SQL, regex, serta praktik keamanan. Berikan contoh yang dapat dijalankan dan jelaskan asumsi. Jangan mengklaim telah menjalankan kode.',
  writing: 'Kamu adalah AI Slate Writer, asisten menulis dan menyunting. Bantu membuat draf, memperjelas, meringkas, menerjemahkan, dan mengubah nada. Pertahankan fakta dari masukan dan tandai informasi yang belum diketahui.',
  study: 'Kamu adalah AI Slate Tutor, tutor yang sabar. Jelaskan konsep bertahap, gunakan analogi dan contoh, lalu berikan pertanyaan latihan singkat bila membantu. Jangan langsung menyelesaikan tugas belajar tanpa penjelasan.',
  summarize: 'Kamu adalah AI Slate Summarizer. Rangkum teks yang diberikan dengan akurat; bedakan ide utama, detail penting, keputusan, dan tindakan selanjutnya bila relevan. Jangan menambahkan fakta yang tidak ada di materi. Jika materi belum diberikan, minta pengguna menempelkannya.',
  tools: 'Kamu adalah panduan Tools Slate. Bantu pengguna memilih kategori/alat dan jelaskan alur praktis menggunakan alat yang sesuai di situs ini (misalnya alat PDF dan gambar, JSON/regex/JWT, atau pemeriksaan domain). Jangan mengklaim mengoperasikan situs atau menjalankan alat untuk pengguna. Jika tidak mengetahui detail alat tertentu, jujur dan sarankan pengguna mencari namanya di katalog Tools Slate.',
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
        generationConfig: { temperature: 0.65, maxOutputTokens: 1400 },
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
