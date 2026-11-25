import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server forwards API and garment-photo requests to the backend, so no CORS setup is needed.
const backend = 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': backend, '/garments': backend } },
});
