/**
 * iseohyun.com 서비스 워커
 * - 홈 화면 설치를 위한 최소 구성. 파일을 캐시에 담지 않는다(새 판은 SiteVersion 캐시 버스팅이 맡음).
 * - 페이지 이동 요청만 받아서, 네트워크가 끊겼을 때 간단한 안내 화면을 돌려준다.
 * - 새 문의 알림(푸시)을 받아 띄우고, 알림을 누르면 사이트를 연다(아래 push, notificationclick).
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

// 새 문의 푸시(Cloud Functions notifyContact 가 data 만 담아 보냄). FCM 은 {data:{title, body, url, tag}} 꼴로 온다.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = { data: { body: event.data ? event.data.text() : '' } };
  }
  const data = payload.data || payload.notification || {};
  event.waitUntil(self.registration.showNotification(data.title || 'iseohyun.com', {
    body: data.body || '',
    icon: '/source/app-icon-192.png',
    tag: data.tag || 'contact',
    data: { url: data.url || '/' },
  }));
});

// 알림을 누르면 열린 사이트 창을 앞으로 가져오고, 없으면 새로 연다. 이 사이트 밖의 주소는 열지 않는다.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let url = new URL('/', self.location.origin).href;
  try {
    const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin);
    if (target.origin === self.location.origin) url = target.href;
  } catch (err) {
    /* 기본 주소를 쓴다 */
  }
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((client) => new URL(client.url).origin === self.location.origin && 'focus' in client);
    return open ? open.focus() : self.clients.openWindow(url);
  }));
});
