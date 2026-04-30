import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use relative asset paths so `dist/index.html` works when served from a subpath
  // (and is more forgiving for simple static hosting setups).
  base: './',
});
