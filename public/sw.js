/* WheelMatch AI 서비스 워커.
 *
 * 캐싱 전략
 *   - /api/*            : Network Only. OCR 결과를 절대 캐시하지 않는다.
 *                         지난 사진의 분석 결과가 다음 점검에 재사용되면 안 된다.
 *   - 정적 자산          : Cache First. /_next/static 과 /icons 는 내용이 바뀌면
 *                         파일명도 바뀌므로 캐시해도 안전하다.
 *   - 화면(navigation)   : Network First → 실패 시 캐시.
 *                         배포 후에도 항상 최신 화면을 먼저 시도한다.
 */

const CACHE = 'wheelmatch-v1';
const APP_SHELL = [
  '/',
  '/scan/grinder',
  '/scan/wheel',
  '/result',
  '/history',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // 일부 경로가 실패해도 설치를 막지 않는다.
      .then((cache) => Promise.allSettled(APP_SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json'
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // OCR API는 절대 캐시하지 않는다.
  if (url.pathname.startsWith('/api/')) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        // 오프라인이면 캐시된 화면을, 그것도 없으면 메인 화면을 돌려준다.
        .catch(async () => {
          const cached = (await caches.match(request)) ?? (await caches.match('/'));
          return (
            cached ??
            new Response('오프라인 상태입니다. 네트워크를 확인하세요.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        }),
    );
  }
});
