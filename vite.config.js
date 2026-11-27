// language: JavaScript, file: vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import aiSlateHandler from './api/ai-slate.js'

function localAiSlateApi() {
  return {
    name: 'local-ai-slate-api',
    configureServer(server) {
      server.middlewares.use('/api/ai-slate', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        try {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          req.body = Buffer.concat(chunks).toString('utf8')
          res.status = status => { res.statusCode = status; return res }
          res.json = data => { res.end(JSON.stringify(data)); return res }
          await aiSlateHandler(req, res)
        } catch {
          if (!res.headersSent) { res.statusCode = 500; res.end(JSON.stringify({ error: 'AI Slate local API gagal diproses.' })) }
        }
      })
    },
  }
}

export default defineConfig(({ command }) => ({
  plugins: [react(), ...(command === 'serve' ? [localAiSlateApi()] : [])],
  server: command === 'serve'
    ? {
        host: '0.0.0.0',
        allowedHosts: [
          'localhost',
          '127.0.0.1',
          '.vercel.app',
          '.e2b.app',
          'tools-slate.vercel.app',
        ],
      }
    : undefined,
}))