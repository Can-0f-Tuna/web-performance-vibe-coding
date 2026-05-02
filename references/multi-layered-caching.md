# Multi-Layered Caching Strategy

Achieve fresh data without latency through intelligent, tiered caching.

## Caching Layers Overview

```
┌─────────────────────────────────────────┐
│  Layer 1: In-Memory (React Query/SWR)  │
│  • Component state cache                │
│  • Sub-second freshness                 │
│  • Instant access                       │
├─────────────────────────────────────────┤
│  Layer 2: localStorage                  │
│  • Persistent browser storage           │
│  • 5-minute data freshness              │
│  • Survives page reloads                │
├─────────────────────────────────────────┤
│  Layer 3: HTTP Cache                    │
│  • Browser cache headers                │
│  • 30 seconds to 1 day TTL              │
│  • Configurable per endpoint            │
├─────────────────────────────────────────┤
│  Layer 4: Redis Cache-Aside             │
│  • Server-side in-memory cache          │
│  • 1-hour TTL with pattern invalidation│
│  • Stale-while-revalidate refreshes     │
├─────────────────────────────────────────┤
│  Layer 5: KV Store (Edge)               │
│  • Gemini context cache                 │
│  • 30-minute cache                      │
│  • AI-generated summaries               │
├─────────────────────────────────────────┤
│  Layer 6: Shared Application Cache      │
│  • Cross-component data sharing         │
│  • Chart data, AI summaries             │
│  • Prevents duplicate requests          │
└─────────────────────────────────────────┘
```

## Layer 1: React Query / SWR Configuration

### SWR with Configurable TTL

```javascript
// swrConfig.js
import { SWRConfig } from 'swr';

const CACHE_TIMES = {
  PRICE: 30 * 1000,        // 30 seconds - price data
  QUOTE: 60 * 1000,        // 1 minute - stock quotes
  CHART: 5 * 60 * 1000,    // 5 minutes - charts
  FINANCIALS: 60 * 60 * 1000,      // 1 hour - financial data
  PROFILE: 24 * 60 * 60 * 1000   // 1 day - company profile
};

const fetcher = (url) => fetch(url).then(r => r.json());

export const swrConfig = {
  fetcher,
  suspense: true,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  refreshInterval: (key) => {
    if (key.includes('price')) return CACHE_TIMES.PRICE;
    if (key.includes('quote')) return CACHE_TIMES.QUOTE;
    if (key.includes('chart')) return CACHE_TIMES.CHART;
    return 0;
  },
  dedupingInterval: 2000, // Dedupe requests within 2 seconds
  focusThrottleInterval: 5000 // Minimum 5s between revalidations
};

// App.jsx
function App() {
  return (
    <SWRConfig value={swrConfig}>
      <Router />
    </SWRConfig>
  );
}
```

### React Query with Stale Time

```javascript
// queryClient.js
import { QueryClient } from '@tanstack/react-query';

const CACHE_TIMES = {
  PRICE: 30 * 1000,
  QUOTE: 60 * 1000,
  CHART: 5 * 60 * 1000,
  FINANCIALS: 60 * 60 * 1000,
  PROFILE: 24 * 60 * 60 * 1000
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_TIMES.QUOTE,
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      suspense: false
    }
  }
});

// Usage with specific stale times
function useStockPrice(ticker) {
  return useQuery({
    queryKey: ['stock', ticker, 'price'],
    queryFn: () => fetchStockPrice(ticker),
    staleTime: CACHE_TIMES.PRICE, // 30 seconds
    cacheTime: 5 * 60 * 1000      // 5 minutes
  });
}

function useCompanyProfile(ticker) {
  return useQuery({
    queryKey: ['stock', ticker, 'profile'],
    queryFn: () => fetchCompanyProfile(ticker),
    staleTime: CACHE_TIMES.PROFILE, // 1 day
    cacheTime: 24 * 60 * 60 * 1000  // 1 day
  });
}
```

## Layer 2: localStorage + Hydration

### Persistent Price Data Cache

```javascript
// usePersistentPrice.js
import { useQuery } from '@tanstack/react-query';

const PRICE_CACHE_KEY = 'price_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function usePersistentPrice(ticker) {
  // Get initial data from localStorage
  const getInitialData = () => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cache = JSON.parse(localStorage.getItem(PRICE_CACHE_KEY) || '{}');
      const cached = cache[ticker];
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    } catch (e) {
      console.warn('Failed to parse price cache', e);
    }
    return null;
  };
  
  // Save to localStorage on success
  const onSuccess = (data) => {
    if (typeof window === 'undefined') return;
    
    try {
      const cache = JSON.parse(localStorage.getItem(PRICE_CACHE_KEY) || '{}');
      cache[ticker] = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn('Failed to save price cache', e);
    }
  };
  
  return useQuery({
    queryKey: ['price', ticker],
    queryFn: () => fetchPrice(ticker),
    initialData: getInitialData(),
    onSuccess,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000 // 5 minutes
  });
}

// Optimistic updates
function useOptimisticPrice(ticker) {
  const queryClient = useQueryClient();
  const { data } = usePersistentPrice(ticker);
  
  const updatePrice = (newPrice) => {
    // Optimistically update UI
    queryClient.setQueryData(['price', ticker], (old) => ({
      ...old,
      price: newPrice,
      timestamp: Date.now()
    }));
    
    // Update localStorage
    const cache = JSON.parse(localStorage.getItem(PRICE_CACHE_KEY) || '{}');
    cache[ticker] = {
      data: { ...cache[ticker]?.data, price: newPrice },
      timestamp: Date.now()
    };
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cache));
  };
  
  return { data, updatePrice };
}
```

### React Query Hydration

```javascript
// hydrateCache.js
export function hydrateReactQueryCache() {
  if (typeof window === 'undefined') return {};
  
  const dehydratedState = {};
  
  // Hydrate price cache
  try {
    const priceCache = JSON.parse(localStorage.getItem('price_cache') || '{}');
    Object.entries(priceCache).forEach(([ticker, cached]) => {
      if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
        dehydratedState[`["price","${ticker}"]`] = cached.data;
      }
    });
  } catch (e) {
    console.warn('Failed to hydrate price cache', e);
  }
  
  // Hydrate other caches...
  
  return dehydratedState;
}

// App.jsx
import { Hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [dehydratedState, setDehydratedState] = useState({});
  
  useEffect(() => {
    setDehydratedState(hydrateReactQueryCache());
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <Hydrate state={dehydratedState}>
        <Router />
      </Hydrate>
    </QueryClientProvider>
  );
}
```

## Layer 3: HTTP Cache Headers

### Proper HTTP Header Configuration

```javascript
// API routes with cache headers
// Next.js API route example
export async function GET(request, { params }) {
  const { ticker } = params;
  
  // Fetch fresh data
  const data = await fetchStockQuote(ticker);
  
  // Set cache headers
  const headers = new Headers();
  
  // Price data: 30 seconds
  headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=300');
  headers.set('CDN-Cache-Control', 'public, max-age=30');
  headers.set('Vercel-CDN-Cache-Control', 'public, max-age=30');
  
  return new Response(JSON.stringify(data), { headers });
}

// Financial data: 1 hour
export async function GET_FINANCIALS(request, { params }) {
  const { ticker } = params;
  const data = await fetchFinancials(ticker);
  
  const headers = new Headers();
  headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  headers.set('CDN-Cache-Control', 'public, max-age=3600');
  
  return new Response(JSON.stringify(data), { headers });
}

// Profile data: 1 day
export async function GET_PROFILE(request, { params }) {
  const { ticker } = params;
  const data = await fetchCompanyProfile(ticker);
  
  const headers = new Headers();
  headers.set('Cache-Control', 'public, max-age=86400, immutable');
  headers.set('CDN-Cache-Control', 'public, max-age=86400');
  
  return new Response(JSON.stringify(data), { headers });
}
```

### ETag and Last-Modified

```javascript
// Advanced caching with ETags
export async function GET_WITH_ETAG(request, { params }) {
  const { ticker } = params;
  
  const clientETag = request.headers.get('If-None-Match');
  const clientLastModified = request.headers.get('If-Modified-Since');
  
  // Get cached data with metadata
  const { data, etag, lastModified } = await getCachedDataWithMetadata(ticker);
  
  // Check if client has fresh data
  if (clientETag === etag || clientLastModified === lastModified) {
    return new Response(null, { status: 304 }); // Not Modified
  }
  
  const headers = new Headers();
  headers.set('ETag', etag);
  headers.set('Last-Modified', lastModified);
  headers.set('Cache-Control', 'public, max-age=30');
  
  return new Response(JSON.stringify(data), { headers });
}
```

### Cache-Control Headers by Asset Type

Use different caching strategies based on asset type. Assets with content hashes in their filenames can be cached aggressively; unhashed assets need shorter TTLs with validation.

| Asset Type | Cache-Control Header |
|---|---|
| Static assets with content hash (e.g., `app.abc123.js`) | `public, max-age=31536000, immutable` |
| Static assets without hash (e.g., `logo.png`) | `public, max-age=86400, stale-while-revalidate=604800` |
| API responses | `public, max-age=300` (5 minutes) |
| HTML documents | `no-cache, must-revalidate` |

**What each directive does:**

- **`immutable`** — During the `max-age` window, the browser will not even send a conditional request (no `If-None-Match` / `If-Modified-Since`). This massively reduces network requests for versioned assets that will never change.
- **`stale-while-revalidate=604800`** — The browser serves stale cached content for up to 7 days while async-fetching the fresh version in the background. On the next visit, the fresh version is already cached.
- **`max-age`** — Number of seconds the response is considered fresh. After expiration, the browser sends a conditional request (`304 Not Modified` if unchanged).
- **`no-cache`** — The browser must revalidate with the server before using the cached version. Every request still uses the cache (via `304`) but never shows a stale page without checking.
- **`must-revalidate`** — Forces stale responses to be revalidated before use. Critical for HTML to ensure visitors never see outdated pages from stale caches.
- **`public`** — The response can be cached by shared caches (CDNs, proxies) in addition to the browser's private cache.

**Brotli Compression Note:** Enable Brotli (`br`) compression on your server/CDN for all text-based responses (HTML, CSS, JS, JSON, SVG). Brotli produces files 15–20% smaller than gzip for text content, reducing transfer size and improving Time to First Byte. Most CDNs (Cloudflare, Vercel, Netlify) and modern servers (Nginx, Caddy) support Brotli out of the box.

```nginx
# nginx: enable brotli compression
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/javascript application/json image/svg+xml;
```

## Layer 4: Redis Cache-Aside Pattern

Redis sits between your application server and database, providing sub-millisecond in-memory access. The cache-aside pattern (lazy-loading) checks Redis first, falls back to the database on a miss, and populates the cache for subsequent requests.

### Core Cache-Aside Implementation

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

const DEFAULT_TTL = 3600; // 1 hour
const STALE_TTL = 300;    // 5-minute stale buffer

export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  // 1. Check Redis cache first
  const cached = await redis.get(key);
  if (cached) return cached as T;

  // 2. Cache miss — fetch from source
  const data = await fetcher();

  // 3. Store in Redis with TTL
  await redis.setex(key, ttl, data);

  return data;
}
```

### User Profile Example

```typescript
// app/api/user/[userId]/route.ts
import { getCachedOrFetch } from '@/lib/cache';

async function getUserProfile(userId: string) {
  // 1. Check Redis cache first
  const cached = await redis.get(`user:${userId}`);
  if (cached) return JSON.parse(cached);

  // 2. Query database
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { profile: true, settings: true },
  });

  // 3. Store in Redis with TTL (1 hour)
  await redis.setex(
    `user:${userId}`,
    3600,
    JSON.stringify(user)
  );

  return user;
}

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const user = await getUserProfile(params.userId);

  if (!user) {
    return new Response(null, { status: 404 });
  }

  return Response.json(user, {
    headers: {
      'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600',
    },
  });
}
```

### Stale-While-Revalidate with Redis

Replicate CDN-style SWR semantics at the cache layer. Serve stale data instantly, then refresh asynchronously — the user never waits for a cache miss.

```typescript
// lib/cache-swr.ts
export async function getCachedOrFetchSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const staleKey = `${key}:stale`;

  // 1. Check fresh cache
  const fresh = await redis.get(key);
  if (fresh) {
    // Trigger async refresh if near expiry (within STALE_TTL)
    const pttl = await redis.pttl(key); // TTL in milliseconds
    if (pttl !== -1 && pttl < STALE_TTL * 1000) {
      // Fire-and-forget: refresh in background
      (async () => {
        try {
          const newData = await fetcher();
          await redis.setex(key, ttl, JSON.stringify(newData));
        } catch (e) {
          console.error('Background refresh failed:', e);
        }
      })();
    }
    return fresh as T;
  }

  // 2. Check stale cache
  const stale = await redis.get(staleKey);
  if (stale) {
    // Background refresh
    (async () => {
      try {
        const newData = await fetcher();
        await redis.setex(key, ttl, JSON.stringify(newData));
        await redis.del(staleKey);
      } catch (e) {
        console.error('Background refresh failed:', e);
      }
    })();
    return stale as T;
  }

  // 3. Full miss — fetch and cache
  try {
    const data = await fetcher();
    await redis.setex(key, ttl, JSON.stringify(data));
    return data;
  } catch (e) {
    // Serve stale if fetch fails and stale exists
    if (stale) return stale as T;
    throw e;
  }
}
```

### Next.js API Route with Redis + SWR

```typescript
// app/api/stocks/[ticker]/route.ts
import { getCachedOrFetchSWR } from '@/lib/cache-swr';

export async function GET(
  request: Request,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params;
  const cacheKey = `stock:${ticker.toUpperCase()}`;

  const data = await getCachedOrFetchSWR(
    cacheKey,
    () => fetchStockData(ticker),
    60 // 1 minute TTL for real-time stock data
  );

  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=300',
    },
  });
}
```

## Layer 5: Gemini Context Cache (Edge KV)

### KV Store for AI Features

```javascript
// geminiCache.js
// Cloudflare KV or similar edge store
const GEMINI_CACHE_TTL = 30 * 60; // 30 minutes in seconds

export async function getCachedAISummary(ticker, forceRefresh = false) {
  const cacheKey = `ai_summary:${ticker}`;
  
  // Check KV cache first
  if (!forceRefresh) {
    const cached = await KV.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }
  
  // Generate new summary
  const summary = await generateAISummary(ticker);
  
  // Store in KV with TTL
  await KV.put(cacheKey, JSON.stringify(summary), {
    expirationTtl: GEMINI_CACHE_TTL
  });
  
  return summary;
}

// With context cache for Gemini
export async function getCachedGeminiResponse(prompt, context) {
  const cacheKey = `gemini:${hashPrompt(prompt)}:${hashContext(context)}`;
  
  const cached = await KV.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Call Gemini with context caching
  const response = await gemini.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    cachedContent: context // Use context cache
  });
  
  const result = response.text;
  
  // Cache result
  await KV.put(cacheKey, JSON.stringify(result), {
    expirationTtl: GEMINI_CACHE_TTL
  });
  
  return result;
}
```

## Layer 6: Shared Application Cache

### Cross-Component Data Sharing

```javascript
// sharedCache.js
import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';

const SharedCacheContext = createContext(null);

export function SharedCacheProvider({ children }) {
  const cache = useRef(new Map());
  const subscribers = useRef(new Map());
  
  const get = useCallback((key) => {
    const cached = cache.current.get(key);
    if (!cached) return null;
    
    // Check TTL
    if (Date.now() - cached.timestamp > cached.ttl) {
      cache.current.delete(key);
      return null;
    }
    
    return cached.data;
  }, []);
  
  const set = useCallback((key, data, ttl = 5 * 60 * 1000) => {
    cache.current.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    // Notify subscribers
    const subs = subscribers.current.get(key) || [];
    subs.forEach(cb => cb(data));
  }, []);
  
  const subscribe = useCallback((key, callback) => {
    if (!subscribers.current.has(key)) {
      subscribers.current.set(key, []);
    }
    subscribers.current.get(key).push(callback);
    
    return () => {
      const subs = subscribers.current.get(key);
      const index = subs.indexOf(callback);
      if (index > -1) subs.splice(index, 1);
    };
  }, []);
  
  return (
    <SharedCacheContext.Provider value={{ get, set, subscribe }}>
      {children}
    </SharedCacheContext.Provider>
  );
}

// Hook for shared cache
export function useSharedCache(key, fetcher, ttl) {
  const { get, set, subscribe } = useContext(SharedCacheContext);
  const [data, setData] = useState(() => get(key));
  const [isLoading, setIsLoading] = useState(!data);
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    const currentKey = key;
    const unsubscribe = subscribe(currentKey, setData);

    // Fetch if not in cache
    if (!get(currentKey)) {
      fetcher().then(fetched => {
        // Guard against stale fetch responses when key changed mid-request
        if (currentKey !== keyRef.current) return;
        set(currentKey, fetched, ttl);
        setData(fetched);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }

    return unsubscribe;
  }, [key]);

  return { data, isLoading };
}

// Usage: Share chart data across components
function ChartComponent({ ticker }) {
  const { data: chartData } = useSharedCache(
    `chart:${ticker}`,
    () => fetchChartData(ticker),
    5 * 60 * 1000 // 5 minutes
  );
  
  return <Chart data={chartData} />;
}

function MiniChart({ ticker }) {
  // Same data, no duplicate request
  const { data: chartData } = useSharedCache(
    `chart:${ticker}`,
    () => fetchChartData(ticker),
    5 * 60 * 1000
  );
  
  return <Sparkline data={chartData} />;
}
```

### Shared AI Summaries

```javascript
// useSharedAISummary.js
export function useSharedAISummary(ticker) {
  return useSharedCache(
    `ai_summary:${ticker}`,
    () => fetchAISummary(ticker),
    30 * 60 * 1000 // 30 minutes
  );
}

// Multiple components use same cached data
function StockSummary({ ticker }) {
  const { data: summary } = useSharedAISummary(ticker);
  return <div className="summary">{summary?.text}</div>;
}

function StockTooltip({ ticker }) {
  const { data: summary } = useSharedAISummary(ticker);
  return <Tooltip content={summary?.brief} />;
}
```

## Cache Invalidation Strategy

### Smart Invalidation

```javascript
// cacheInvalidation.js
const INVALIDATION_RULES = {
  // When price updates, invalidate dependent caches
  'price:update': [
    'chart:*',
    'quote:*',
    'portfolio:*'
  ],
  
  // When profile updates, invalidate company data
  'profile:update': [
    'financials:*',
    'ai_summary:*'
  ]
};

export function invalidateCache(pattern) {
  const queryClient = useQueryClient();
  
  // Invalidate React Query cache
  if (pattern.includes('*')) {
    const prefix = pattern.replace(':*', '');
    queryClient.invalidateQueries({ queryKey: [prefix] });
  } else {
    queryClient.invalidateQueries({ queryKey: pattern.split(':') });
  }
  
  // Invalidate localStorage
  if (pattern.startsWith('price:')) {
    const ticker = pattern.split(':')[1];
    if (ticker && ticker !== '*') {
      const cache = JSON.parse(localStorage.getItem('price_cache') || '{}');
      delete cache[ticker];
      localStorage.setItem('price_cache', JSON.stringify(cache));
    }
  }
  
  // Invalidate KV (async)
  if (pattern.startsWith('ai_summary:')) {
    const ticker = pattern.split(':')[1];
    if (ticker) {
      KV.delete(`ai_summary:${ticker}`);
    }
  }
}

// WebSocket invalidation
socket.on('price_update', ({ ticker }) => {
  invalidateCache(`price:${ticker}`);
});
```

### Redis Cache Invalidation

Invalidate Redis keys on write (create, update, delete) to prevent stale reads. Use `SCAN` instead of `KEYS` in production to avoid blocking the Redis server.

```typescript
// Pattern-based key scanning for safe production invalidation
async function invalidateRedisKeys(pattern: string) {
  let cursor = 0;
  const keys: string[] = [];
  do {
    const [nextCursor, found] = await redis.scan(cursor, {
      match: pattern,
      count: 100,
    });
    cursor = nextCursor;
    keys.push(...found);
  } while (cursor !== 0);

  if (keys.length > 0) {
    await redis.del(...keys);
  }
  console.log(`Invalidated ${keys.length} keys matching "${pattern}"`);
}

// Write-through: invalidate and warm on mutation
async function updateUserProfile(userId: string, data: any) {
  await db.user.update({ where: { id: userId }, data });

  // Invalidate then warm (cache the fresh data immediately)
  await redis.del(`user:${userId}`);
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(user));

  return user;
}

// Cascade invalidation for related entities
async function deletePortfolio(portfolioId: string) {
  await db.portfolio.delete({ where: { id: portfolioId } });

  await redis.del(`portfolio:${portfolioId}`);
  await invalidateRedisKeys(`chart:${portfolioId}:*`);
  await invalidateRedisKeys(`quote:${portfolioId}:*`);
  await invalidateRedisKeys(`ai_summary:${portfolioId}:*`);
}
```

## Checklist

- [ ] Configure SWR/React Query with appropriate stale times
- [ ] Implement localStorage hydration for instant data
- [ ] Set proper HTTP cache headers (30s to 1 day TTL)
- [ ] Enable Brotli compression for text-based assets
- [ ] Add ETag/Last-Modified support for conditional requests
- [ ] Set up Redis cache-aside with appropriate TTLs per entity
- [ ] Implement Redis stale-while-revalidate for background refreshes
- [ ] Configure Redis pattern-based invalidation on writes
- [ ] Implement Gemini context cache for AI features
- [ ] Create shared application cache for cross-component data
- [ ] Set up cache invalidation rules and WebSocket updates
- [ ] Monitor cache hit rates across all layers
- [ ] Configure stale-while-revalidate for seamless updates
- [ ] Test cache behavior on slow connections

## Key Metrics

- **SWR/React Query cache hit rate:** 90%+
- **localStorage hydration speed:** Under 50ms
- **HTTP cache hit rate:** 80%+
- **Redis cache hit rate:** 95%+ (sub-millisecond responses)
- **Average data freshness:** 5 minutes for price data
- **Cache invalidation propagation:** Under 1 second

## Key Takeaways

1. **Tier your cache:** Different data needs different freshness
2. **Hydrate immediately:** localStorage gives instant data on load
3. **Redis for hot data:** Offload frequent reads from your database for sub-ms responses
4. **Share across components:** Prevent duplicate requests
5. **Invalidate intelligently:** Update caches when data changes (use SCAN not KEYS)
6. **Use immutable for hashed assets:** Eliminates conditional requests entirely
7. **Monitor hit rates:** Optimize TTLs based on usage patterns
