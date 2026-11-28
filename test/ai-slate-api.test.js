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

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

test('streams Vexo text and validates image data before forwarding', async () => {
  const previousKey = process.env.VEXO_API_KEY
  const previousModel = process.env.VEXO_MODEL
  const previousFetch = globalThis.fetch
  process.env.VEXO_API_KEY = 'server-only-test-key'
  process.env.VEXO_MODEL = 'test/model'
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
      controller.close()
    }}), { status: 200 })
  }

  try {
    const response = mockResponse()
    await handler(mockRequest({
      mode: 'general',
      messages: [{ role: 'user', content: 'Jelaskan gambar ini', attachments: [{ mimeType: 'image/jpeg', data: 'YQ==' }] }],
    }), response)
    const stream = response.chunks.join('')
    assert.equal(response.statusCode, 200)
    assert.equal(response.headers['Content-Type'], 'text/event-stream; charset=utf-8')
    assert.equal(requestUrl, 'https://vexoapi.azzamcodex.site/api/v1/chat/completions')
    assert.equal(requestHeaders.Authorization, 'Bearer server-only-test-key')
    assert.equal(requestBody.model, 'test/model')
    assert.equal(requestBody.stream, true)
    assert.ok(requestBody.messages[1].content.some(part => part.image_url?.url === 'data:image/jpeg;base64,YQ=='))
    assert.match(stream, /event: token\ndata: \{"text":"Bagian "\}\n\n/)
    assert.match(stream, /event: done\ndata:/)
    assert.doesNotMatch(stream, /server-only-test-key/)
  } finally {
    globalThis.fetch = previousFetch
    restoreEnv('VEXO_API_KEY', previousKey)
    restoreEnv('VEXO_MODEL', previousModel)
  }
})

test('rejects malformed attachments without calling Vexo', async () => {
  const previousKey = process.env.VEXO_API_KEY
  const previousFetch = globalThis.fetch
  process.env.VEXO_API_KEY = 'server-only-test-key'
  let called = false
  globalThis.fetch = async () => { called = true; throw new Error('unexpected provider call') }
  try {
    const response = mockResponse()
    await handler(mockRequest({
      mode: 'general',
      messages: [{ role: 'user', content: 'Lihat ini', attachments: [{ mimeType: 'text/html', data: 'aGVsbG8=' }] }],
    }), response)
    assert.equal(response.statusCode, 400)
    assert.match(response.jsonBody.error, /Gambar harus berupa JPG/)
    assert.equal(called, false)
  } finally {
    globalThis.fetch = previousFetch
    restoreEnv('VEXO_API_KEY', previousKey)
  }
})

test('returns a clear activation error when the Vexo key is not configured', async () => {
  const previousKey = process.env.VEXO_API_KEY
  const previousFetch = globalThis.fetch
  delete process.env.VEXO_API_KEY
  let called = false
  globalThis.fetch = async () => { called = true; throw new Error('unexpected provider call') }
  try {
    const response = mockResponse()
    await handler(mockRequest({ mode: 'general', messages: [{ role: 'user', content: 'Halo' }] }), response)
    assert.equal(response.statusCode, 503)
    assert.match(response.jsonBody.error, /Tambahkan VEXO_API_KEY/)
    assert.equal(called, false)
  } finally {
    globalThis.fetch = previousFetch
    restoreEnv('VEXO_API_KEY', previousKey)
  }
})

test('converts exhausted provider quota into a safe user-facing error', async () => {
  const previousKey = process.env.VEXO_API_KEY
  const previousFetch = globalThis.fetch
  process.env.VEXO_API_KEY = 'server-only-test-key'
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'provider internal detail' } }), { status: 429 })
  try {
    const response = mockResponse()
    await handler(mockRequest({ mode: 'general', messages: [{ role: 'user', content: 'Halo' }] }), response)
    assert.equal(response.statusCode, 429)
    assert.match(response.jsonBody.error, /Permintaan Vexo sedang dibatasi/)
    assert.doesNotMatch(JSON.stringify(response.jsonBody), /provider internal detail|server-only-test-key/)
  } finally {
    globalThis.fetch = previousFetch
    restoreEnv('VEXO_API_KEY', previousKey)
  }
})
