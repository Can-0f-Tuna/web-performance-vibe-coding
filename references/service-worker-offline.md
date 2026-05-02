# Service Worker and Offline-First PWA

Create a rock-solid foundation that feels native-like even on slower networks.

## Core Strategies

### 1. App Shell Precaching

Cache the core app shell for instant loads.

```javascript
// service-worker.js
const APP_SHELL_CACHE = 'app-shell-v1';
const ASSETS_CACHE = 'assets-v1';

const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/assets/main.js',
  '/assets/main.css',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(cache => cache.addAll(APP_SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});
```

### 2. NetworkFirst Navigation Strategy

```javascript
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Navigation requests - NetworkFirst with timeout
  if (request.mode === 'navigate') {
    event.respondWith(
      Promise.race([
        fetch(request),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
      ]).catch(() => caches.match('/offline.html'))
    );
    return;
  }
  
  // API calls - NetworkFirst with cache fallback
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(ASSETS_CACHE).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
  
  // Static assets - CacheFirst
  event.respondWith(
    caches.match(request).then(response => 
      response || fetch(request)
    )
  );
});
```

### 3. Long-Term Font Caching

```javascript
const FONT_CACHE = 'fonts-v1';

self.addEventListener('fetch', (event) => {
  if (event.request.destination === 'font') {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(event.request).then(response => {
          if (response) return response;
          
          return fetch(event.request).then(fetchResponse => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        })
      )
    );
  }
});
```

### 4. Idle Registration

```javascript
// Register service worker on idle
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Use requestIdleCallback if available
    const register = () => {
      navigator.serviceWorker.register('/service-worker.js');
    };
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(register);
    } else {
      setTimeout(register, 1000);
    }
  });
}
```

## Checklist

- [ ] Precache app shell files
- [ ] Implement NetworkFirst navigation with 3s timeout
- [ ] Add offline fallback page
- [ ] Configure long-term font caching (30 days)
- [ ] Implement idle service worker registration
- [ ] Add API response caching
- [ ] Test offline functionality
- [ ] Verify app shell loads instantly

## Key Metrics

- **Shell load time:** Instant from cache
- **Offline functionality:** Core features work
- **Font cache duration:** 30 days
- **Update propagation:** Under 24 hours

→ See caching strategies in [multi-layered-caching.md](./multi-layered-caching.md)
