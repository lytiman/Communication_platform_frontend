import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The backend's CORS config only allows http://localhost:5173, so the dev
// server must not silently move to another port (strictPort).
export default defineConfig({
  plugins: [react()],
  // sockjs-client expects Node's `global`; map it to the browser's globalThis.
  define: { global: 'globalThis' },
  optimizeDeps: { esbuildOptions: { define: { global: 'globalThis' } } },
  server: { port: 5173, strictPort: true },
});
