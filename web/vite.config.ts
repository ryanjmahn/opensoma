/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative base: works at user.github.io/<repo>/ and at a custom domain alike.
  base: './',
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: 1100 }, // three.js + 3Dmol are big but lazy-loaded per page
  server: { fs: { allow: ['..'] } }, // lessons live in ../content
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
