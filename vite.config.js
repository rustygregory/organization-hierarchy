import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Served from a GitHub Pages project subpath, so assets must resolve
  // relative to /organization-hierarchy/ rather than the domain root.
  base: '/organization-hierarchy/',
  plugins: [react()],
})
