import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom')) return 'vendor'
            if (id.includes('@dnd-kit')) return 'dndkit'
            if (id.includes('zustand')) return 'zustand'
            if (id.includes('lucide')) return 'lucide'
            if (id.includes('date-fns')) return 'date'
          }
        },
      },
    },
  },
})
