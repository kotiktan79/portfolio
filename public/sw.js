const CACHE_NAME = 'portfolio-tracker-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/manifest.json'
];

const API_CACHE_DURATION = 5 * 60 * 1000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
    );
  } else if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            return cachedResponse || new Response('{"error": "Offline"}', {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });

          if (cachedResponse) {
            const cachedTime = new Date(cachedResponse.headers.get('date')).getTime();
            const now = Date.now();

            if (now - cachedTime < API_CACHE_DURATION) {
              return cachedResponse;
            }
          }

          return fetchPromise;
        });
      })
    );
  } else {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request);
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-portfolio') {
    event.waitUntil(syncPortfolioData());
  }
});

async function syncPortfolioData() {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const requests = await cache.keys();

    await Promise.all(
      requests.map(async (request) => {
        try {
          const response = await fetch(request);
          if (response && response.status === 200) {
            await cache.put(request, response);
          }
        } catch (error) {
          console.error('Sync failed for:', request.url);
        }
      })
    );
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Portföy Bildirimi';
  const options = {
    body: data.body || 'Portföyünüzde değişiklik var',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Aç' },
      { action: 'close', title: 'Kapat' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data || '/')
    );
  }
});
