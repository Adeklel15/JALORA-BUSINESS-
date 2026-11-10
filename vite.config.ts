import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
      // HMR configuration compatible with Google AI Studio / Cloud Run reverse proxy (HTTPS on port 443)
      hmr: process.env.DISABLE_HMR === 'true'
        ? false
        : process.env.K_SERVICE
          ? { clientPort: 443 }
          : true,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
