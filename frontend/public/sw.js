const CACHE_NAME = 'lifeos-v4'
const STATIC_ASSETS = ['/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never intercept:
  //  - page navigations
  //  - /api/ routes (backend calls)
  //  - Next.js internal chunks
  //  - cross-origin requests (e.g. Railway backend at a different hostname)
  if (
    request.mode === 'navigate' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.hostname !== self.location.hostname
  ) {
    return
  }

  // Cache-first for static assets (manifest, icons, etc.)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((res) => {
        // Only cache valid same-origin non-opaque responses
        if (res.ok && res.type === 'basic') {
          // Clone defensively to avoid occasional race/body-lock errors.
          let resForCache
          try {
            resForCache = res.clone()
          } catch {
            return res
          }

          caches.open(CACHE_NAME).then((cache) => cache.put(request, resForCache)).catch(() => {})
        }
        return res
      })
    })
  )
})
