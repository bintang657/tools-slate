import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import handler from '../api/ai-slate.js'

function mockRequest(body, ip = `test-${Math.random()}`) {
  return Object.assign(new EventEmitter(), {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    socket: {},
    body: JSON.stringify(body),
  })
}

function mockResponse() {
  return Object.assign(new EventEmitter(), {
    headers: {}, chunks: [], writableEnded: false,
    setHeader(name, value) { this.headers[name] = value; return this },
    status(code) { this.statusCode = code; return this },
    json(data) { this.jsonBody = data; this.writableEnded = true; return this },
    flushHeaders() {},
    write(chunk) { this.chunks.push(String(chunk)); return true },
    end() { this.writableEnded = true },
  })
}

async function withEnvironment(callback) {
  const previousKey = process.env.GROQ_API_KEY
  const previousModel = process.env.GROQ_MODEL
  const previousVisionModel = process.env.GROQ_VISION_MODEL
  const previousFetch = globalThis.fetch
  process.env.GROQ_API_KEY = 'server-only-test-key'
  delete process.env.GROQ_MODEL
  delete process.env.GROQ_VISION_MODEL
  try { await callback() }
  finally {
    globalThis.fetch = previousFetch
    if (previousKey === undefined) delete process.env.GROQ_API_KEY
    else process.env.GROQ_API_KEY = previousKey
    if (previousModel === undefined) delete process.env.GROQ_MODEL
    else process.env.GROQ_MODEL = previousModel
    if (previousVisionModel === undefined) delete process.env.GROQ_VISION_MODEL
    else process.env.GROQ_VISION_MODEL = previousVisionModel
  }
}

test('streams Groq responses, selects a vision model for images, and keeps the key server-side', async () => {
  await withEnvironment(async () => {
    let requestUrl = ''
    let requestHeaders
    let requestBody
    globalThis.fetch = async (url, options) => {
      requestUrl = String(url)
      requestHeaders = options.headers
      requestBody = JSON.parse(options.body)
      const encoder = new TextEncoder()
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Bagian "}}]}\n\n'))
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"satu."}}]}\n\n'))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }}), { status: 200 })
    }

    const response = mockResponse()
    await handler(mockRequest({
      mode: 'general',
      messages: [{ role: 'user', content: 'Jelaskan gambar ini', attachments: [{ mimeType: 'image/jpeg', data: 'YQ==' }] }],
    }), response)
    const stream = response.chunks.join('')
    const userMessage = requestBody.messages.find(message => message.role === 'user')
    assert.equal(response.statusCode, 200)
    assert.equal(response.headers['Content-Type'], 'text/event-stream; charset=utf-8')
    assert.equal(requestUrl, 'https://api.groq.com/openai/v1/chat/completions')
    assert.equal(requestHeaders.Authorization, 'Bearer server-only-test-key')
    assert.equal(requestBody.model, 'meta-llama/llama-4-scout-17b-16e-instruct')
    assert.equal(requestBody.stream, true)
    assert.ok(userMessage.content.some(part => part.type === 'image_url' && part.image_url.url === 'data:image/jpeg;base64,YQ=='))
    assert.match(stream, /event: token\ndata: \{"text":"Bagian "\}\n\n/)
    assert.match(stream, /event: done\ndata:/)
    assert.doesNotMatch(stream, /server-only-test-key/)
  })
})

test('uses text model, compacts old conversation context, and limits generated tokens', async () => {
  await withEnvironment(async () => {
    let requestBody
    globalThis.fetch = async (_url, options) => {
      requestBody = JSON.parse(options.body)
      const encoder = new TextEncoder()
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"OK"}}]}\n\ndata: [DONE]\n\n'))
        controller.close()
      }}), { status: 200 })
    }
    const messages = Array.from({ length: 18 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `${index === 17 ? 'PERTANYAAN TERBARU' : `pesan-${index}`} ${'x'.repeat(3000)}`,
    }))
    const response = mockResponse()
    await handler(mockRequest({ mode: 'general', messages }), response)
    assert.equal(requestBody.model, 'llama-3.3-70b-versatile')
    assert.equal(requestBody.max_tokens, 1400)
    assert.ok(requestBody.messages.length <= 13)
    const sentText = requestBody.messages.slice(1).map(message => typeof message.content === 'string' ? message.content : '').join('\n')
    assert.match(sentText, /PERTANYAAN TERBARU/)
    assert.match(sentText, /Konteks lama dipotong/)
  })
})

test('rejects malformed attachments without calling Groq', async () => {
  await withEnvironment(async () => {
    let called = false
    globalThis.fetch = async () => { called = true; throw new Error('unexpected provider call') }
    const response = mockResponse()
    await handler(mockRequest({
      mode: 'general',
      messages: [{ role: 'user', content: 'Lihat ini', attachments: [{ mimeType: 'text/html', data: 'aGVsbG8=' }] }],
    }), response)
    assert.equal(response.statusCode, 400)
    assert.match(response.jsonBody.error, /Gambar harus berupa JPG/)
    assert.equal(called, false)
  })
})

test('returns a safe quota message and retry delay for Groq rate limits', async () => {
  await withEnvironment(async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'provider internal detail' } }), { status: 429, headers: { 'retry-after': '30' } })
    const response = mockResponse()
    await handler(mockRequest({ mode: 'general', messages: [{ role: 'user', content: 'Halo' }] }), response)
    assert.equal(response.statusCode, 429)
    assert.equal(response.jsonBody.retryAfterSeconds, 30)
    assert.match(response.jsonBody.error, /Kuota Groq sedang padat.*30 detik/)
    assert.doesNotMatch(JSON.stringify(response.jsonBody), /provider internal detail|server-only-test-key/)
  })
})
