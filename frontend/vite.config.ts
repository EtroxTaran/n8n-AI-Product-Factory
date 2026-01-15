import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitroV2Plugin } from '@tanstack/nitro-v2-vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    tsconfigPaths(),
    tanstackStart({
      srcDirectory: 'app',
    }),
    // Nitro plugin for Node.js HTTP server output
    nitroV2Plugin({ preset: 'node-server' }),
    // React's vite plugin must come after Start's vite plugin
    react(),
    tailwindcss(),
  ],
})
