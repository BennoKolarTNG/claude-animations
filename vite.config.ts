import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves project sites from /<repo-name>/ — the deploy
  // workflow sets BASE_PATH accordingly; local dev stays at '/'.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
