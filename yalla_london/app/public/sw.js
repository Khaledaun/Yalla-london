// Service Worker for PWA functionality
const CACHE_NAME = 'yalla-london-v1'
const OFFLINE_URL = '/offline'

// Resources to cache immediately
const PRECACHE_RESOURCES = [
  '/',
  '/offline',
  '/blog',
  '/events',
  '/recommendations',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// Install event - cache core resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_RESOURCES))
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch event - implement caching strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return

  // Skip non-HTTP requests
  if (!event.request.url.startsWith('http')) return

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse
        }

        // Fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }

            // Clone response for caching
            const responseToCache = response.clone()

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Only cache GET requests for same origin
                if (event.request.url.startsWith(self.location.origin)) {
                  cache.put(event.request, responseToCache)
                }
              })

            return response
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL)
            }
            
            // Return a basic offline response for other requests
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            })
          })
      })
  )
})

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Perform background sync tasks
      console.log('Background sync triggered')
    )
  }
})

// Push notification handler
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'Explore',
          icon: '/icons/explore-action.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icons/close-action.png'
        }
      ]
    }

    event.waitUntil(
      self.registration.showNotification('Yalla London', options)
    )
  }
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    )
  } else if (event.action === 'close') {
    // Notification already closed above
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})