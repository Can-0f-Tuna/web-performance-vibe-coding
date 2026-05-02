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

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      // Clean old cache versions
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => key !== APP_SHELL_CACHE && key !== ASSETS_CACHE)
            .map(key => caches.delete(key))
        )
      )
    ])
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
  
  // Static assets - CacheFirst with network fallback and cache population
  if (event.request.destination === 'image' ||
      event.request.destination === 'style' ||
      event.request.destination === 'script') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(ASSETS_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }
  
  // Fallback
  event.respondWith(
    caches.match(event.request).then(response => 
      response || fetch(event.request)
    )
  );
});
```

### 3. Long-Term Font Caching

Font caching uses CacheFirst, meaning once a font is cached it is served from cache indefinitely — true "30 day" behaviour depends on your server's `Cache-Control: max-age=2592000` header. Without that header, the SW never evicts fonts. For SW-level TTL enforcement, use IndexedDB to track insertion timestamps and purge expired entries on activate.

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

To enforce a hard 30-day TTL at the SW level, store the cache timestamp in IndexedDB and check it on every match:

```javascript
// DB helper for font cache timestamps
function openFontDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('font-cache-meta', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('timestamps');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function isFontExpired(url, maxAge = 30 * 24 * 60 * 60 * 1000) {
  const db = await openFontDB();
  return new Promise((resolve) => {
    const tx = db.transaction('timestamps', 'readonly');
    const store = tx.objectStore('timestamps');
    const req = store.get(url);
    req.onsuccess = () => {
      if (!req.result) return resolve(true);
      resolve(Date.now() - req.result.timestamp > maxAge);
    };
    req.onerror = () => resolve(true);
  });
}

async function setFontTimestamp(url) {
  const db = await openFontDB();
  const tx = db.transaction('timestamps', 'readwrite');
  tx.objectStore('timestamps').put({ timestamp: Date.now() }, url);
}
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

### 5. Facade Pattern for Third-Party Embeds

Third-party embeds (YouTube, Google Maps, chat widgets) ship 500KB–1MB+ of JavaScript. Replace them with a lightweight static placeholder until the user explicitly interacts.

**HTML — Static placeholder:**

```html
<!-- YouTube facade -->
<div class="youtube-facade"
     data-video-id="abc123"
     onclick="loadYouTube(this)">
  <img src="/thumbnails/abc123.jpg" alt="Video title" loading="lazy">
  <button aria-label="Play video">▶</button>
</div>

<!-- Google Maps facade -->
<div class="map-facade"
     data-lat="40.7128" data-lng="-74.0060"
     onclick="loadGoogleMap(this)">
  <img src="/thumbnails/map-static.jpg" alt="Map location" loading="lazy">
  <span>Click to load map</span>
</div>

<!-- Chat widget facade -->
<div class="chat-facade"
     data-provider="intercom"
     onclick="loadChatWidget(this)">
  <button>💬 Need help? Chat with us</button>
</div>
```

**JavaScript — Load on click:**

```javascript
function loadYouTube(el) {
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube.com/embed/${el.dataset.videoId}?autoplay=1`;
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('loading', 'lazy');
  el.replaceWith(iframe);
}

function loadGoogleMap(el) {
  const iframe = document.createElement('iframe');
  iframe.src = `https://maps.google.com/maps?q=${el.dataset.lat},${el.dataset.lng}&output=embed`;
  iframe.setAttribute('loading', 'lazy');
  el.replaceWith(iframe);
}

function loadChatWidget(el) {
  const script = document.createElement('script');
  script.src = 'https://widget.intercom.io/widget/YOUR_APP_ID';
  script.async = true;
  document.body.appendChild(script);
  el.remove();
}
```

**Impact:**

| Embed Type       | Before (KB) | After (KB) | Savings |
|------------------|-------------|------------|---------|
| YouTube player   | ~800        | ~12        | 98.5%   |
| Google Maps      | ~1,200      | ~15        | 98.8%   |
| Intercom chat    | ~500        | ~2         | 99.6%   |
| Disqus comments  | ~700        | ~2         | 99.7%   |
| Twitter timeline | ~600        | ~2         | 99.7%   |

The facade consists of a static image (screenshot or placeholder) plus a button. No third-party scripts load until the user clicks. This alone can cut page weight by 2–4 MB on content-heavy pages.

### 6. IntersectionObserver-Based Lazy Loading for Widgets

Load social/analytics widgets dynamically only when their container scrolls into the viewport. Prevents below-the-fold third-party scripts from blocking the critical rendering path.

```javascript
function lazyLoadWidget(selector, loadFn) {
  const container = document.querySelector(selector);
  if (!container) return;

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      loadFn();
      observer.disconnect();
    }
  }, {
    rootMargin: '200px' // Start loading 200px before visible
  });

  observer.observe(container);
}

// Usage examples
lazyLoadWidget('#twitter-feed', () => {
  const script = document.createElement('script');
  script.src = 'https://platform.twitter.com/widgets.js';
  script.async = true;
  document.body.appendChild(script);
});

lazyLoadWidget('#disqus-thread', () => {
  const script = document.createElement('script');
  script.src = 'https://example.disqus.com/embed.js';
  script.async = true;
  document.body.appendChild(script);
});

lazyLoadWidget('#google-analytics-supplemental', () => {
  const script = document.createElement('script');
  script.src = 'https://www.googletagmanager.com/gtag/js?id=UA-XXXXX-Y';
  script.async = true;
  document.body.appendChild(script);
});
```

**Key benefits:**
- Zero third-party JS cost on initial page load
- Widgets load only when the user is about to see them
- `rootMargin: '200px'` starts loading slightly before the widget enters the viewport, ensuring it's ready when scrolled into view
- Works perfectly with the facade pattern — the IntersectionObserver triggers the facade-to-real-embed swap

### 7. Offline Indicator via postMessage

The service worker can detect offline state and notify the app via `postMessage`, letting the UI show a banner without polling `navigator.onLine`.

**Service worker — detect offline fetches and notify clients:**

```javascript
// service-worker.js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request);
        return response;
      } catch (err) {
        // Network failed — notify all clients
        const clientsList = await self.clients.matchAll();
        clientsList.forEach((client) => {
          client.postMessage({ type: 'OFFLINE', url: event.request.url });
        });

        // Fall back to cache
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // Ultimate fallback: offline page for navigations
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }

        return new Response('Offline', { status: 503 });
      }
    })()
  );
});
```

**App — listen for offline messages and show indicator:**

```javascript
// app.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'OFFLINE') {
      showOfflineBanner();
    }
  });
}

function showOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  if (banner) {
    banner.style.display = 'block';
    setTimeout(() => { banner.style.display = 'none'; }, 5000);
  }
}
```

```html
<!-- offline-banner in your HTML -->
<div id="offline-banner" style="display:none; background:#f44336; color:#fff; padding:12px; text-align:center; position:fixed; top:0; left:0; right:0; z-index:9999;">
  You are offline. Some features may be unavailable.
</div>
```

## Checklist

- [ ] Precache app shell files
- [ ] Implement NetworkFirst navigation with 3s timeout
- [ ] Add offline fallback page
- [ ] Configure long-term font caching (30 days)
- [ ] Implement idle service worker registration
- [ ] Add API response caching
- [ ] Implement cache-first strategy for static assets (images, styles, scripts)
- [ ] Implement facade pattern for third-party embeds (YouTube, Maps, chat widgets)
- [ ] Use IntersectionObserver for widget lazy loading
- [ ] Test on slow 3G connection
- [ ] Test offline functionality
- [ ] Verify app shell loads instantly

## Key Metrics

- **Shell load time:** Instant from cache
- **Offline functionality:** Core features work
- **Font cache duration:** 30 days
- **Update propagation:** Under 24 hours

→ See caching strategies in [multi-layered-caching.md](./multi-layered-caching.md)
