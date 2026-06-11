import { defineConfig } from 'vite';

export default defineConfig({
  base: '/small-project/KanaLoop/',

  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    host: '0.0.0.0',
    port: 5173
  }
});