import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss()],

    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      host: '0.0.0.0', // 🔥 allow external access
      port: 4002,
      allowedHosts: ['naxcart.shop', 'www.naxcart.shop'],
      hmr: process.env.DISABLE_HMR !== 'true',
    },

    preview: {
      host: '0.0.0.0', // 🔥 important for production preview
      port: 4002,
      allowedHosts: ['naxcart.shop', 'www.naxcart.shop'],
    },
  };
});