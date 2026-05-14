import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// No proxy needed — all API base URLs come from environment variables.
// See .env, .env.development, .env.production and src/config/api.js.
export default defineConfig({
  plugins: [react()],
})
