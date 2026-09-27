// CHARGING EV SCM - Service Worker v14.0
const CACHE_NAME = 'charging-ev-v15';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/logo_ppa.png',
  './assets/logo_ppa_circle.png',
  './assets/logo_ppa_hd.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First strategy for dynamic and API calls, Cache-Fallback for static assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Bypass POST/PUT or non-HTTP
  if (req.method !== 'GET' || !req.url.startsWith('http')) {
    return;
  }

  // Never cache external Google Apps Script or live APIs
  if (url.hostname.includes('google.com') || url.hostname.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(req).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
