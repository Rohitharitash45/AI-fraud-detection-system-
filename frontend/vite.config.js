import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth':         'http://localhost:5000',
      '/detect':       'http://localhost:5000',
      '/multi-scan':   'http://localhost:5000',
      '/analyze-sms':  'http://localhost:5000',
      '/check-number': 'http://localhost:5000',
      '/detect_voice': 'http://localhost:5000',
      '/ocr-scan':     'http://localhost:5000',
      '/report-scam':  'http://localhost:5000',
      '/history':      'http://localhost:5000',
      '/api':          'http://localhost:5000',
    }
  }
})