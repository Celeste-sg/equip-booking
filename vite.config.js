import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.VITE_BACKEND || 'firebase'
  return {
    plugins: [react(), tailwindcss()],
    base: '/equip-booking/',
    resolve: {
      alias: {
        '$backend': path.resolve(__dirname, `src/backends/${backend}/index.js`),
      },
    },
  }
})
