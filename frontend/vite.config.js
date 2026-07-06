import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({ fastRefresh: false }),
  ],
  css: {
    postcss: false,
  },
  optimizeDeps: {
    exclude: ['lucide-react']
  }
})
