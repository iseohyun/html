import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // 로컬 개발 서버(dev server) 구동 시 브라우저에 주입할 응답 헤더 설정
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      host: '0.0.0.0', // 내부망 전체 수신 개방
      port: 5173       // 포트 고정
    },
  },
});