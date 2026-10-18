import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // The admin dashboard is a separate page that is not linked from the public site.
      input: { main: 'index.html', admin: 'admin.html' }
    }
  },
  server: { port: 5173 }
});
