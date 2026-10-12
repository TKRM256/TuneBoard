import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// API の中継先。Playwright のシナリオテストでは、テスト用に立ち上げたバックエンドへ向ける
const apiTarget = process.env.TUNEBOARD_API_TARGET ?? 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('recharts')) {
            return 'charts';
          }

          if (id.includes('framer-motion') || id.includes('/motion/')) {
            return 'motion';
          }

          if (id.includes('radix-ui') || id.includes('@base-ui')) {
            return 'ui-vendor';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/oauth2': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/login/oauth2': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // e2e/ は Playwright で流す
    exclude: ['**/node_modules/**', 'e2e/**'],
  },
})
