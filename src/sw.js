// Label Crop AI service worker — makes repeat visits (and offline use) hit the local cache,
// which keeps bandwidth tiny. Version is injected at build time.
const VERSION = '__VERSION__';
const CACHE = `lcai-${VERSION}`;
const LIBS = 'lcai-libs-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key !== CACHE && key !== LIBS) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

const cacheFirst = async (req, name) => {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
};

const networkFirst = async (req) => {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || (await cache.match(self.registration.scope)) || (await cache.match('/')) || Response.error();
  }
};

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === 'https://cdn.jsdelivr.net' && /\/npm\/(pdfjs-dist|pdf-lib)@/.test(url.pathname)) {
    event.respondWith(cacheFirst(req, LIBS));
  } else if (url.origin === self.location.origin) {
    if (url.pathname.includes('/assets/') || url.pathname.includes('/vendor/')) {
      event.respondWith(cacheFirst(req, url.pathname.includes('/vendor/') ? LIBS : CACHE));
    } else if (req.mode === 'navigate') {
      event.respondWith(networkFirst(req));
    }
  }
});
