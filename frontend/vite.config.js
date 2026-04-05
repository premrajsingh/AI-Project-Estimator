import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_URL && env.VITE_API_URL.startsWith('http')
    ? env.VITE_API_URL.replace('/api/v1', '')
    : 'http://localhost:8000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Proxy /api calls to the backend in dev so CORS is never an issue
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
