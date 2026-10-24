import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Бэкенд (FastAPI) по умолчанию работает на http://127.0.0.1:8000.
// Vite перенаправляет на него запросы /api и /uploads, поэтому фронтенд
// обращается к API по относительным адресам и CORS не нужен.
const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': BACKEND,
      '/uploads': BACKEND,
    },
  },
})
