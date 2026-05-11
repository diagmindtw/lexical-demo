import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://diagmindtw.github.io/lexical-demo/ — base path must
// match the repo name so asset URLs resolve correctly.
export default defineConfig({
  plugins: [react()],
  base: '/lexical-demo/',
})
