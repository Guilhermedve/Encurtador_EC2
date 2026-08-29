import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const buildEnv = loadEnv(mode, process.cwd(), '')
  const apiUrl = buildEnv.VITE_API_URL

  if (mode === 'production') {
    if (!apiUrl) {
      throw new Error('VITE_API_URL is required for production')
    }

    const parsed = new URL(apiUrl)
    const isLoopback =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1' ||
      parsed.hostname === '0.0.0.0'

    if (parsed.protocol !== 'https:' || isLoopback) {
      throw new Error('VITE_API_URL must be a public HTTPS URL in production')
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          },
        },
      },
    },
  }
})
