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
│  Layer 4: KV Store (Edge)               │
│  • Gemini context cache                 │
│  • 30-minute cache                      │
│  • AI-generated summaries               │
├─────────────────────────────────────────┤
│  Layer 5: Shared Application Cache      │
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

## Layer 4: Gemini Context Cache (Edge KV)

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

## Layer 5: Shared Application Cache

### Cross-Component Data Sharing

```javascript
// sharedCache.js
import { createContext, useContext, useCallback } from 'react';

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
  
  useEffect(() => {
    // Subscribe to cache updates
    const unsubscribe = subscribe(key, setData);
    
    // Fetch if not in cache
    if (!data) {
      fetcher().then(fetched => {
        set(key, fetched, ttl);
        setData(fetched);
        setIsLoading(false);
      });
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

## Checklist

- [ ] Configure SWR/React Query with appropriate stale times
- [ ] Implement localStorage hydration for instant data
- [ ] Set proper HTTP cache headers (30s to 1 day TTL)
- [ ] Add ETag/Last-Modified support for conditional requests
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
- **Average data freshness:** 5 minutes for price data
- **Cache invalidation propagation:** Under 1 second

## Key Takeaways

1. **Tier your cache:** Different data needs different freshness
2. **Hydrate immediately:** localStorage gives instant data on load
3. **Share across components:** Prevent duplicate requests
4. **Invalidate intelligently:** Update caches when data changes
5. **Monitor hit rates:** Optimize TTLs based on usage patterns
