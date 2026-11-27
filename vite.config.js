// language: JavaScript, file: vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
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