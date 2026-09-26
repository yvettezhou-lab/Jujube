const CACHE = 'jujube-v3';

const CORE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/jujube-icon-1024-no-white-border.png',
  '/jujube-icon.png',
  '/jujube-jar.png'
];

async function cacheResponse(cache, url) {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (response.ok) await cache.put(url, response.clone());
  } catch {}
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    // Cache the shell first.
    await Promise.all(CORE.map(url => cacheResponse(cache, url)));

    // Also discover Vite's hashed JS/CSS/manifest assets from the current HTML.
    try {
      const response = await fetch('/', { cache: 'no-cache' });
      if (response.ok) {
        const html = await response.text();
        const urls = [...html.matchAll(/(?:src|href)=["'](\/[^"']+)["']/g)]
          .map(match => match[1])
          .filter(url => !url.startsWith('/sw.js'));

        await Promise.all([...new Set(urls)].map(url => cacheResponse(cache, url)));
        await cache.put('/', new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }));
      }
    } catch {}

    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(key => key !== CACHE).map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const request = event.request;
  const url = new URL(request.url);

  // Only use this cache for this app's own origin.
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);

      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      }

      return response;
    } catch {
      // Offline navigation: always fall back to the cached app shell.
      if (request.mode === 'navigate') {
        const shell = await caches.match('/');
        if (shell) return shell;
      }

      // Offline asset that has not been cached yet.
      return new Response('', {
        status: 503,
        statusText: 'Offline'
      });
    }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
