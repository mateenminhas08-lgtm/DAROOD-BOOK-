const CACHE_NAME = 'guldasta-e-darood-v2';
const OFFLINE_URL = './index.html';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Poppins:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Install event - cache essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(PRECACHE_ASSETS).catch(err => {
          console.log('Some assets failed to cache:', err);
          return cache.addAll(['./index.html', './manifest.json']);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('Deleting old cache:', key);
          return caches.delete(key);
        })
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // For other requests, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'opaque') {
              return response;
            }

            // Clone the response before caching
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Return offline fallback for images
            if (event.request.destination === 'image') {
              return new Response(
                `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120">
                  <rect fill="#fefce8" width="200" height="120" rx="8"/>
                  <text x="100" y="55" text-anchor="middle" font-size="32">🕌</text>
                  <text x="100" y="85" text-anchor="middle" font-size="10" fill="#718096">آف لائن</text>
                </svg>`,
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
          });
      })
  );
});

// Handle messages from the main app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for future features
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('Background sync triggered');
  }
});