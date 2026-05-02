# Vibe Coding Workflow

The terminal-based, AI-directed development approach that delivered exceptional performance in a weekend.

## Core Philosophy

**"There's no magic. Just tell the AI what you want it to do."**

Combine 15 years of engineering experience with AI leverage to achieve meticulous optimization without manual implementation of every detail.

## Terminal-Based Development

### Minimal Setup

```bash
# No IDE, no complex tooling
# Just macOS Terminal + Claude + Bun (3x faster than npm)

$ mkdir my-financial-app
$ cd my-financial-app
$ bun create vite . --template react
$ bun install

# Start Claude in terminal
$ claude
```

### The Vibe Coding Loop

```
┌─────────────────────────────────────────┐
│  1. Issue high-level instruction        │
│     "Make this component render         │
│      instantly"                         │
├─────────────────────────────────────────┤
│  2. AI generates code                   │
│     • Implements optimization           │
│     • Suggests additional improvements  │
├─────────────────────────────────────────┤
│  3. Skim terminal diff                  │
│     • Check architecture                │
│     • Trust AI on implementation        │
├─────────────────────────────────────────┤
│  4. Test and iterate                    │
│     • Measure performance               │
│     • Issue next instruction            │
└─────────────────────────────────────────┘
```

## Effective Prompting Patterns

### Performance-Focused Prompts

**Bundle Optimization:**
> "Optimize this React app for minimal bundle size. Replace heavy libraries with lightweight alternatives. Implement code splitting with modulepreload. Target bundle under 150 KB."

**Rendering Speed:**
> "Make this stock chart component render instantly. Lazy load it with reserved height to prevent layout shift. Memoize expensive calculations."

**API Optimization:**
> "Reduce this API call's latency. Implement SWR with 30-second cache. Add prefetching on hover. Make the data feel instantaneous."

**Caching Strategy:**
> "Build a multi-layered caching system. Use SWR for in-memory, localStorage for persistence. Target 5-minute data freshness. Share cached data across components."

### Architecture-Focused Prompts

**Streaming Implementation:**
> "Implement true token streaming for this AI chat feature. Add anti-buffering headers. Make it feel snappy and uninterrupted."

**Shared Infrastructure:**
> "Build a shared WebSocket architecture across the entire app. Single connection, smart reconnect. Handle real-time data efficiently."

**Offline Support:**
> "Add service worker with offline-first shell. Precache app shell. NetworkFirst navigation. Make it feel native-like."

### High-Level System Prompts

**Complete App Optimization:**
> "Transform this financial app into the fastest version possible. Implement all 7 performance strategies: bundle optimization, intelligent prefetching, multi-layered caching, true streaming, DOM discipline, shared WebSocket, and offline-first service worker. Focus on instant page loads and zero stale data."

**Weekend Sprint:**
> "Over the weekend, optimize this app for extreme performance. Start with bundle size, add prefetching, implement tiered caching, enable streaming, optimize DOM, add WebSocket, finish with service worker. Report metrics after each strategy."

## Example Session

```
$ claude

# Initial setup
> Create a new React financial dashboard app with 
  minimal dependencies. Use Vite. Target 114 KB bundle.

[AI generates project structure, package.json]

# Strategy 1: Bundle optimization
> Implement lazy code splitting for all routes. 
  Add modulepreload hints. Inline critical CSS.
  Replace moment.js with date-fns.

[AI generates router config, dynamic imports, CSS inlining]

> Show me the bundle analysis

[AI runs build, shows webpack-bundle-analyzer output]

# Strategy 2: Prefetching
> Add hover-based prefetching for all stock tickers.
  Preload 7 essential APIs on page mount. 
  Implement login intent detection.

[AI generates prefetch hooks, intent detection]

# Strategy 3: Caching
> Implement multi-layered caching: SWR for 30s, 
  localStorage for 5min, HTTP headers for 1 hour.
  Add cache hydration on app load.

[AI generates caching layer components]

# Strategy 4: Streaming
> Enable true token streaming for AI chat.
  Add anti-buffering headers. 
  Implement parallel tool calls.

[AI generates streaming components]

# Strategy 5: DOM discipline
> Lazy load all charts with reserved height.
  Memoize list items. Prevent all layout shifts.

[AI generates optimized chart components]

# Strategy 6: WebSocket
> Build shared WebSocket across app.
  Smart reconnect on visibility change.
  Prefetch on connection.

[AI generates WebSocket context]

# Strategy 7: Service Worker
> Add offline-first PWA shell.
  Precache app shell. NetworkFirst navigation.
  30-day font caching.

[AI generates service worker config]

# Final check
> Show me all performance metrics. 
  Verify bundle size, load times, cache hit rates.

[AI generates performance report]
```

## Skimming Diff Output

### What to Check

**Architecture Decisions:**
- ✅ Correct caching layers implemented
- ✅ Proper code splitting boundaries
- ✅ WebSocket connection sharing
- ✅ Service worker scope correct

**Trust AI On:**
- Implementation details
- CSS values and spacing
- Specific function implementations
- Test cases
- Error handling details

### Example Diff Review

```diff
+ import { lazy, Suspense } from 'react';

- import StockPage from './pages/StockPage';
+ const StockPage = lazy(() => import('./pages/StockPage'));

  function App() {
    return (
+     <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/stock/:ticker" element={<StockPage />} />
        </Routes>
+     </Suspense>
    );
  }

# Review: ✓ Code splitting implemented correctly
#         ✓ Lazy loading for routes
#         ✓ Suspense fallback present
```

## AI Suggestion Patterns

### Accepting AI Optimizations

**When AI suggests improvements you didn't consider:**

```
> Optimize this API call

[AI response]
I can optimize this API call. Additionally, I noticed:
1. You're not using requestIdleCallback for prefetching
2. The cache TTL could be dynamic based on data volatility
3. Consider batching these three related calls

Should I implement all three improvements?

> Yes, implement all three

[AI generates optimized implementation with all suggestions]
```

### Iterative Refinement

```
> Implement caching for this component

[AI generates basic SWR implementation]

> Also add localStorage hydration for instant initial load

[AI adds localStorage layer]

> And configure HTTP cache headers for CDN caching

[AI adds header configuration]

> Perfect. Now add cache invalidation on WebSocket update

[AI adds invalidation logic]

# Result: Multi-layered caching system built iteratively
```

## Performance Measurement Prompts

### Bundle Analysis

```
> Analyze current bundle size

[AI runs build, shows analysis]

Main bundle: 114 KB ✓
Vendor chunk: 45 KB
Route chunks: 15-30 KB each

> Which libraries are the largest?

[AI shows breakdown]

react-dom: 40 KB
recharts: 65 KB
lodash: 25 KB

> Replace recharts with lightweight charting library

[AI replaces with lighter alternative]
```

### Load Time Testing

```
> Measure time to interactive

[AI generates performance test]

TTFB: 120ms
FCP: 450ms
LCP: 1.2s
TTI: 1.8s

> What's causing the 300ms delay in FCP?

[AI analyzes]

The custom font is render-blocking. 
Should I add font-display: swap?

> Yes, and preload the font

[AI implements optimizations]
```

## Common Pitfalls to Avoid

### Over-Engineering

```
> Don't:
"Implement a custom caching layer with indexedDB, 
 Service Worker background sync, and complex 
 cache eviction algorithms"

> Do:
"Implement tiered caching: React Query + localStorage. 
 Target 5-minute freshness."
```

### Implementation Details vs Architecture

```
> Don't micromanage:
"Use useMemo with dependency array [ticker, timeRange]. 
 Set staleTime to 30000 milliseconds. Use specific 
 hex color #3b82f6 for the button."

> Focus on outcomes:
"Memoize this expensive chart calculation. 
 Cache data for 30 seconds. Use the primary blue color."
```

### Premature Optimization

```
> Don't optimize before measuring:
"Make everything as fast as possible right now"

> Measure first:
"Show me which components are slow. 
 Then optimize the slowest ones."
```

## Weekend Sprint Schedule

### Day 1: Foundation

**Morning:**
- Hour 1-2: Project setup, minimal dependencies
- Hour 3-4: Bundle optimization (114 KB target)

**Afternoon:**
- Hour 5-6: Intelligent prefetching
- Hour 7-8: Multi-layered caching

### Day 2: Polish

**Morning:**
- Hour 1-2: True streaming implementation
- Hour 3-4: DOM discipline (lazy loading, memoization)

**Afternoon:**
- Hour 5-6: Shared WebSocket architecture
- Hour 7-8: Service worker and PWA shell

**Evening:**
- Hour 9: Performance testing and iteration
- Hour 10: Documentation and deployment

## Key Reminders

1. **Trust the AI:** It implements micro-optimizations while you focus on architecture
2. **Skim don't read:** Check diffs for correctness, trust implementation details
3. **Iterate quickly:** Issue prompts, review, refine, repeat
4. **Measure constantly:** Track bundle size, load times, cache hits
5. **Focus on outcomes:** "Make it fast" not "Implement X pattern"
6. **Stay minimal:** No IDE, no complex tooling, just terminal
7. **Think in systems:** "Multi-layered caching" not "add localStorage"
8. **Accept suggestions:** AI often suggests optimizations you'd miss

## Result

**"The fastest app I've ever built."**

- 114 KB bundle size
- Instant page loads
- Zero stale data
- Built entirely through terminal prompts
- AI implemented every micro-optimization

**Weekend well spent.**
