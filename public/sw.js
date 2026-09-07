// Service Worker for AeroTrack Bird Migration App (BMA)
const CACHE_NAME = 'aerotrack-pwa-v1';

const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
];

// Install: Cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn('[SW] Pre-caching warning:', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate: Clean up older cache versions and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: Strategy based on request type
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle HTTP and HTTPS requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 1. Bypass Service Worker cache for Vite dev server internals, Supabase, and non-GET requests
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.includes('node_modules') ||
    url.pathname.includes('vite') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // 2. Navigation requests: Network-first, fallback to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // 3. Static assets (JS, CSS, SVGs, Fonts, Images): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback or ignore network failure for background revalidation
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// Background Sync Event (SyncManager API)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bird-sightings') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'BACKGROUND_SYNC_TRIGGER',
            timestamp: Date.now(),
          });
        });
      })
    );
  }
});

// Message listener from client window
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
