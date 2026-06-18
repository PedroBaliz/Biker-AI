// Service Worker minimal for Biker AI PWA installability
const CACHE_NAME = 'biker-ai-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/biker_ai_icon.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Safe fallback in development if some files are missed
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let the browser handle standard API or direct requests
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  // Network-First Strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If successful, open cache and save a clone for offline use
        if (response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails (offline), fall back to cache
        return caches.match(event.request);
      })
  );
});
