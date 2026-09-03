import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* The day this build was made, as a local YYYY-MM-DD string. Day granularity is
   deliberate — the bar shows "Updated Sept 3, 2026", never a time. Stamped into
   the bundle rather than computed in the browser so the live site only moves
   when a build actually ships: no changes pushed, no new date. Local date parts,
   not toISOString, so a late-evening build doesn't roll into tomorrow in UTC. */
const now = new Date()
const buildDate = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
].join('-')

// https://vite.dev/config/
export default defineConfig({
  // Served from a GitHub Pages project subpath, so assets must resolve
  // relative to /organization-hierarchy/ rather than the domain root.
  base: '/organization-hierarchy/',
  plugins: [react()],
  define: {
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
})
