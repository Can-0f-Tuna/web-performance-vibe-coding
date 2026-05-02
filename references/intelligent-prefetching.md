# Intelligent Prefetching and Intent-Based Loading

Make navigation feel instantaneous by loading data before the user requests it.

## Core Principle

**Anticipate user behavior.** Turn reactive loading into proactive performance by prefetching based on intent detection.

## Resource Hint Decision Guide

Choose the right `<link>` hint for each use case:

| Hint | When to Use | Example |
|------|-------------|---------|
| `<link rel="preload">` | Resources needed for the **current** page, discovered late by the browser (fonts, LCP image, critical CSS/JS above the fold) | `<link rel="preload" href="/fonts/inter.woff2" as="font" crossorigin>` |
| `<link rel="prefetch">` | Resources needed for a **future** navigation (next route's JS bundle, next page's API data). Low priority, downloaded during idle time | `<link rel="prefetch" href="/pages/dashboard.js">` |
| `<link rel="preconnect">` | **Cross-origin** resources where you'll definitely connect (CDN, API server, font provider). Opens TCP+TLS handshake early | `<link rel="preconnect" href="https://fonts.googleapis.com">` |
| `<link rel="dns-prefetch">` | When you need DNS resolution but **aren't sure** you'll connect. Lighter than preconnect — DNS only, no TCP/TLS | `<link rel="dns-prefetch" href="https://analytics.example.com">` |
| `<link rel="modulepreload">` | ES module scripts needed for the current page, ensuring they're fetched and compiled early | `<link rel="modulepreload" href="/chunks/vendor.js">` |
| `<link rel="prerender">` | Load and render an **entire page** in a hidden tab for instant navigation (high cost — use sparingly) | `<link rel="prerender" href="/checkout">` |

**Decision flow:**
- On current page? → `preload`
- For next navigation? → `prefetch` (route code) or `prefetch` + cache (API data)
- Cross-origin & definitely needed? → `preconnect`
- Cross-origin & unsure? → `dns-prefetch`
- ES module on current page? → `modulepreload`

## Intent Detection Strategies

### 1. Login Intent Detection

Prefetch critical routes and APIs before session resolves.

```javascript
// Prefetch on login form interaction
function LoginForm() {
  const [email, setEmail] = useState('');

  // Debounced prefetch: only fires after 300ms of no typing AND email > 3 chars
  useEffect(() => {
    if (email.length <= 3) return;

    const timer = setTimeout(() => {
      preloadApi('/api/user/profile');
      preloadApi('/api/dashboard/data');
      preloadRoute('/dashboard');
    }, 300);

    return () => clearTimeout(timer);
  }, [email]);

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter email"
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

### Prefetch Helpers (Deduplicated)

```javascript
const prefetchedUrls = new Set();

const preloadApi = (url) => {
  if (prefetchedUrls.has(url)) return;
  prefetchedUrls.add(url);
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
};

const preloadRoute = (route) => {
  const component = import(`../pages${route}.jsx`);
};
```

### 2. Page Mount Preloading

Preload 7+ essential APIs on initial load with WebSocket preconnect.

```javascript
// App.jsx - Preload on mount
function App() {
  useEffect(() => {
    // Preconnect to WebSocket server
    const wsLink = document.createElement('link');
    wsLink.rel = 'preconnect';
    wsLink.href = 'wss://api.yourapp.com';
    document.head.appendChild(wsLink);

    // Preload essential APIs in parallel
    const essentialApis = [
      '/api/user/profile',
      '/api/user/preferences',
      '/api/portfolio/summary',
      '/api/watchlist/default',
      '/api/markets/status',
      '/api/notifications/unread',
      '/api/settings/ui'
    ];

    // Use requestIdleCallback for non-critical preloading
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        essentialApis.forEach(api => preloadApi(api));
      });
    } else {
      setTimeout(() => {
        essentialApis.forEach(api => preloadApi(api));
      }, 1000);
    }
  }, []);

  return <Router />;
}
```

### 3. Hover-Based Prefetching

Implement hover prefetching for tickers, chat, navigation elements.

```javascript
// HoverPrefetchLink.jsx
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

function HoverPrefetchLink({ to, apiUrl, children, ...props }) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    // Prefetch route component
    prefetchRoute(to);

    // Prefetch API data
    if (apiUrl) {
      prefetchApi(apiUrl);
    }
  };

  const prefetchRoute = (route) => {
    // Dynamic import the route component
    const routeModule = import(`../pages${route}.jsx`);
  };

  const prefetchApi = async (url) => {
    // Use fetch with cache to warm the cache
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'X-Prefetch': 'true' }
      });
      // Store in cache for immediate use
      const data = await response.json();
      queryClient.setQueryData([url], data);
    } catch (e) {
      // Silently fail - prefetch shouldn't break the app
    }
  };

  return (
    <Link
      to={to}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleMouseEnter}
      style={{ cursor: 'pointer' }}
      {...props}
    >
      {children}
    </Link>
  );
}

// Usage
<HoverPrefetchLink
  to="/stock/AAPL"
  apiUrl="/api/stock/AAPL/quote"
>
  Apple Inc.
</HoverPrefetchLink>
```

### 4. Touch-Based Prefetching (Mobile)

```javascript
// TouchPrefetchWrapper.jsx
function TouchPrefetchWrapper({ to, apiUrl, children }) {
  const touchStartTime = useRef(null);
  const touchTimeout = useRef(null);

  const handleTouchStart = () => {
    touchStartTime.current = Date.now();

    // Prefetch after 100ms touch (intent confirmed)
    touchTimeout.current = setTimeout(() => {
      prefetchRoute(to);
      if (apiUrl) prefetchApi(apiUrl);
    }, 100);
  };

  const handleTouchEnd = () => {
    // Cancel prefetch if touch was quick (less than 100ms - likely scroll)
    if (Date.now() - touchStartTime.current < 100) {
      clearTimeout(touchTimeout.current);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => navigate(to)}
    >
      {children}
    </div>
  );
}
```

## Parallel Data Loading

### Stock Page Parallel Fetching

Fetch charts, financials, and Reddit data in parallel on page load.

```javascript
// StockPage.jsx
function StockPage({ ticker }) {
  // Fetch all data in parallel
  const { data: stockData, isLoading } = useQueries({
    queries: [
      {
        queryKey: ['stock', ticker, 'quote'],
        queryFn: () => fetchStockQuote(ticker),
        staleTime: 30 * 1000 // 30 seconds
      },
      {
        queryKey: ['stock', ticker, 'chart'],
        queryFn: () => fetchStockChart(ticker),
        staleTime: 60 * 1000 // 1 minute
      },
      {
        queryKey: ['stock', ticker, 'financials'],
        queryFn: () => fetchFinancials(ticker),
        staleTime: 5 * 60 * 1000 // 5 minutes
      },
      {
        queryKey: ['stock', ticker, 'reddit'],
        queryFn: () => fetchRedditData(ticker),
        staleTime: 2 * 60 * 1000 // 2 minutes
      }
    ],
    combine: (results) => {
      return {
        data: {
          quote: results[0].data,
          chart: results[1].data,
          financials: results[2].data,
          reddit: results[3].data
        },
        isLoading: results.some(r => r.isLoading)
      };
    }
  });

  if (isLoading) return <SkeletonLoader />;

  return (
    <div className="stock-page">
      <StockQuote data={stockData.quote} />
      <StockChart data={stockData.chart} />
      <Financials data={stockData.financials} />
      <RedditFeed data={stockData.reddit} />
    </div>
  );
}
```

## Priority-Based Prefetching

### Priority Levels

```javascript
// Prefetch priority system
const PREFETCH_PRIORITY = {
  CRITICAL: 1,   // Login, dashboard, core APIs
  HIGH: 2,       // Current page related
  MEDIUM: 3,     // Likely next pages
  LOW: 4         // Background data
};

function usePriorityPrefetch() {
  const prefetchQueue = useRef([]);
  const isProcessing = useRef(false);

  const addToQueue = (url, priority = PREFETCH_PRIORITY.MEDIUM) => {
    prefetchQueue.current.push({ url, priority, timestamp: Date.now() });
    prefetchQueue.current.sort((a, b) => a.priority - b.priority);

    if (!isProcessing.current) {
      processQueue();
    }
  };

  const processQueue = async () => {
    if (prefetchQueue.current.length === 0) {
      isProcessing.current = false;
      return;
    }

    isProcessing.current = true;
    const item = prefetchQueue.current.shift();

    // Use requestIdleCallback for non-critical items
    const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));

    idleCallback(async () => {
      try {
        await fetch(item.url, { priority: 'low' });
      } catch (e) {
        // Silently fail
      }
      processQueue();
    });
  };

  return { addToQueue };
}

// Usage
function Dashboard() {
  const { addToQueue } = usePriorityPrefetch();

  useEffect(() => {
    // Critical: Load immediately
    addToQueue('/api/dashboard/data', PREFETCH_PRIORITY.CRITICAL);

    // High: Related data
    addToQueue('/api/portfolio/summary', PREFETCH_PRIORITY.HIGH);

    // Medium: Likely next pages
    addToQueue('/api/watchlist/data', PREFETCH_PRIORITY.MEDIUM);

    // Low: Background analytics
    addToQueue('/api/analytics/views', PREFETCH_PRIORITY.LOW);
  }, []);

  return <DashboardContent />;
}
```

## Smart Prefetching Rules

### Connection-Aware Prefetching

`navigator.connection` is a Chrome-only enhancement. Always include a fallback so prefetching works across all browsers.

```javascript
function useSmartPrefetch() {
  const canPrefetch = () => {
    try {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

      // No Network Information API? Default to prefetching — all browsers support basic fetch.
      if (!connection) return true;

      // Honor data saver mode
      if (connection.saveData) return false;

      // Skip on slowest connections
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') return false;

      // Limit on 3G
      if (connection.effectiveType === '3g') {
        return connection.downlink > 1.0;
      }

      return true;
    } catch {
      // If anything throws (older browser), default to prefetching
      return true;
    }
  };

  const prefetch = (url) => {
    if (!canPrefetch()) return;

    fetch(url, { priority: 'low' }).catch(() => {});
  };

  return { prefetch, canPrefetch };
}
```

### Visibility-Aware Prefetching

```javascript
function useVisibilityPrefetch() {
  const prefetchQueue = useRef([]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Process queued prefetches when tab becomes visible
        while (prefetchQueue.current.length > 0) {
          const url = prefetchQueue.current.shift();
          fetch(url).catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const queuePrefetch = (url) => {
    if (document.visibilityState === 'hidden') {
      prefetchQueue.current.push(url);
    } else {
      fetch(url).catch(() => {});
    }
  };

  return { queuePrefetch };
}
```

## Implementation Examples

### Screener Prefetching

```javascript
// ScreenerItem.jsx
function ScreenerItem({ stock }) {
  return (
    <HoverPrefetchLink
      to={`/stock/${stock.ticker}`}
      apiUrl={`/api/stock/${stock.ticker}/preview`}
    >
      <div className="screener-row">
        <span className="ticker">{stock.ticker}</span>
        <span className="price">{stock.price}</span>
        <span className="change">{stock.changePercent}%</span>
      </div>
    </HoverPrefetchLink>
  );
}
```

### Chat Prefetching

```javascript
// ChatTrigger.jsx
function ChatTrigger({ chatId }) {
  const handleMouseEnter = () => {
    // Prefetch chat messages
    prefetchApi(`/api/chat/${chatId}/messages`);

    // Prefetch chat participants
    prefetchApi(`/api/chat/${chatId}/participants`);

    // Preload chat component
    import('../components/ChatWindow.jsx');
  };

  return (
    <button
      onMouseEnter={handleMouseEnter}
      onClick={() => openChat(chatId)}
    >
      Open Chat
    </button>
  );
}
```

### Agent/Ticker Prefetching

```javascript
// AgentCard.jsx
function AgentCard({ agentId }) {
  const handleHover = () => {
    // Prefetch agent details
    prefetchApi(`/api/agents/${agentId}`);

    // Prefetch agent's recent activity
    prefetchApi(`/api/agents/${agentId}/activity`);

    // Preload agent detail page
    import('../pages/AgentDetailPage.jsx');
  };

  return (
    <div onMouseEnter={handleHover} className="agent-card">
      <AgentPreview agentId={agentId} />
    </div>
  );
}
```

## Checklist

- [ ] Implement login intent detection with debounced preloading
- [ ] Deduplicate prefetch URLs to prevent DOM leaks
- [ ] Preload 7+ essential APIs on page mount
- [ ] Add WebSocket preconnect
- [ ] Implement hover-based prefetching for navigation
- [ ] Add touch-based prefetching for mobile
- [ ] Use parallel data fetching for stock pages
- [ ] Implement priority-based prefetching queue
- [ ] Add connection-aware prefetching with cross-browser fallback
- [ ] Add visibility-aware prefetching
- [ ] Track prefetch hit rates and effectiveness

## Key Metrics

- **Prefetch hit rate:** 70%+ of prefetched data should be used
- **Time to navigation:** Under 100ms for prefetched routes
- **API response time:** Instant for cached prefetches
- **False positive rate:** Less than 30% (unused prefetches)

## Key Takeaways

1. **Anticipate intent:** Prefetch when users show intent, not just on hover
2. **Parallel loading:** Fetch all needed data simultaneously
3. **Smart conditions:** Respect connection speed and data saver modes
4. **Priority queue:** Load critical data first, background data last
5. **Measure effectiveness:** Track prefetch hit rates to optimize
6. **Choose the right hint:** preload for current page, prefetch for next, preconnect for cross-origin
7. **Debounce typing:** Never prefetch on every keystroke — wait for pauses
8. **Deduplicate:** Track prefetched URLs to avoid leaking DOM nodes
