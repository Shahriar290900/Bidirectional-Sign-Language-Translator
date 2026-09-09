// v6: the app shell gained the conversation view, so v5 entries are stale.
const CACHE_NAME = 'sign-translator-v6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './dictionary.html',
  './css/style.css',
  './js/app.js',
  './js/config.js',
  './js/i18n.js',
  './js/settings.js',
  './js/sign-data.js',
  './js/speech-to-sign.js',
  './js/sign-to-speech.js',
  './js/utils.js',
  './data/signs.json',
  './icon-192.png',
  './icon-512.png'
];

// Install Event - Cache Core Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Cleanup Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// Fetch Event - Network First, Fallback to Cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Only cache successful same-origin GETs. Caching 404s or opaque cross-origin
        // responses (MediaPipe CDN, fonts) poisons the cache and breaks offline use.
        if (event.request.method === 'GET' && networkResponse.ok && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If network fails (offline), fallback to cache
        return caches.match(event.request);
      })
  );
});
