import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative assets work at a GitHub Pages project URL.
  base: './',
  // The workspace can have parent and app-level node_modules; force one React runtime.
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
})
