import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    tsconfigPaths(),
    tanstackStart({
      srcDirectory: 'app',
    }),
    // React's vite plugin must come after Start's vite plugin
    react(),
    tailwindcss(),
  ],
})
