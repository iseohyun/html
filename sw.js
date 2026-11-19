/**
 * iseohyun.com 서비스 워커
 * - 홈 화면 설치를 위한 최소 구성. 파일을 캐시에 담지 않는다(새 판은 SiteVersion 캐시 버스팅이 맡음).
 * - 페이지 이동 요청만 받아서, 네트워크가 끊겼을 때 간단한 안내 화면을 돌려준다.
 * - 나중에 문의 알림(푸시)을 받을 때도 이 파일에 push 처리를 더한다.
 */
const OFFLINE_HTML = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>iseohyun.com</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
font-family:sans-serif;background:#f5f6f5;color:#222;text-align:center}
button{margin-top:16px;padding:8px 20px;border:0;border-radius:999px;background:#222;color:#fff;font-size:1rem}</style>
</head><body><div><p>인터넷에 연결되어 있지 않습니다.</p>
<button onclick="location.reload()">다시 시도</button></div></body></html>`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return; // 그 밖의 요청은 브라우저가 그대로 처리
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE_HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }))
  );
});
