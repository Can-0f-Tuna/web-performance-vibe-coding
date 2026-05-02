# DOM Discipline and Rendering Optimization

Achieve zero jank and instant paint through rigorous DOM structure discipline.

## Overview

Every pixel and interaction must be engineered to avoid layout shifts and maintain responsiveness under heavy data loads.

## Key Strategies

### 1. Lazy-Loaded Charts with Reserved Height

Prevent cumulative layout shift (CLS) by reserving space before charts load.

```jsx
function LazyChart({ data, height = 400 }) {
  return (
    <div style={{ height, minHeight: height }}>
      <Suspense fallback={<ChartSkeleton height={height} />}>
        <Chart data={data} />
      </Suspense>
    </div>
  );
}
```

### 2. Tab-Level Lazy Loading

Load tab content only when accessed. Use conditional rendering so inactive tabs never mount.

```jsx
function TabContainer({ tabs }) {
  const [activeTab, setActiveTab] = useState(0);
  const visitedTabs = useRef(new Set([0]));

  const handleTabChange = (index) => {
    visitedTabs.current.add(index);
    setActiveTab(index);
  };

  return (
    <div>
      <div role="tablist">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === index}
            onClick={() => handleTabChange(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tabs.map((tab, index) =>
          visitedTabs.current.has(index) ? (
            <div
              key={tab.id}
              role="tabpanel"
              style={{ display: activeTab === index ? 'block' : 'none' }}
            >
              {tab.component}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
```

Previously-visited tabs use `display: none` so their DOM and internal state are preserved on switch-back; unvisited tabs are never rendered at all. Avoid `hidden` for primary lazy loading — it mounts all components immediately, wasting memory and CPU.

### 3. Memoized List Items

Prevent unnecessary re-renders of expensive list items. Let `React.memo` do shallow comparison of all props by default.

```jsx
const StockListItem = memo(function StockListItem({ stock }) {
  return (
    <div className="stock-item">
      <span>{stock.ticker}</span>
      <span>{stock.price}</span>
    </div>
  );
});
```

Custom comparators in `React.memo(Component, arePropsEqual)` are risky. If you forget to compare any prop — e.g., comparing only `price` while ignoring `ticker`, `change`, or `volume` — stale data renders silently. Prefer the default shallow comparison unless you deeply understand the component's data model. If you must use a custom comparator, compare every prop the render output depends on:

```jsx
// Only use a custom comparator when you fully understand every prop
const StockListItem = memo(function StockListItem({ stock }) { /* ... */ },
  (prev, next) =>
    prev.stock.ticker === next.stock.ticker &&
    prev.stock.price === next.stock.price &&
    prev.stock.change === next.stock.change
);
```

### 4. Instant Repaints on Cache Hits

Show cached data immediately while fetching fresh data.

```jsx
function StockPrice({ ticker }) {
  const { data, isLoading } = useStockPrice(ticker);

  // Show cached data instantly
  // isLoading only true if no cached data
  return (
    <span className={isLoading ? 'loading' : ''}>
      {data?.price || '--'}
    </span>
  );
}
```

### 5. Lightweight DOM Structure

Keep DOM nodes minimal for better performance.

```jsx
// ❌ Avoid deeply nested structures
<div>
  <div>
    <div>
      <div>
        <span>Content</span>
      </div>
    </div>
  </div>
</div>

// ✅ Keep it flat
<div className="stock-card">
  <span className="ticker">{stock.ticker}</span>
  <span className="price">{stock.price}</span>
</div>
```

### 6. Layout Thrashing Prevention

Forced synchronous layout happens when the browser must calculate layout mid-JavaScript because you interleave DOM reads (which require up-to-date layout) with DOM writes (which invalidate layout). Each read forces an expensive reflow.

```javascript
// BAD: Alternating reads and writes forces reflow each iteration
elements.forEach(el => {
  const h = el.offsetHeight;   // READ — forces layout
  el.style.height = h * 2;     // WRITE — invalidates layout
});

// GOOD: Batch all reads, then batch all writes
const heights = elements.map(el => el.offsetHeight);  // All reads first
elements.forEach((el, i) => {
  el.style.height = heights[i] * 2;                    // All writes after
});
```

**Properties that trigger layout when read:** `offsetHeight`, `offsetWidth`, `offsetTop`, `offsetLeft`, `clientHeight`, `clientWidth`, `scrollHeight`, `scrollWidth`, `getComputedStyle()`, `getBoundingClientRect()`.

**Rule:** Read everything first, write everything last. In React, use `useLayoutEffect` for measurements and pass them as state — React batches DOM writes.

### 7. CSS Containment for Independent Regions

`contain` tells the browser an element's internals don't affect the rest of the page, letting it skip expensive recalculations across the full layout tree.

```css
.widget {
  contain: layout style paint;
  /* layout  — internal layout changes stay inside this element
     style   — counters, quotes, list-style-type don't cross boundaries
     paint   — descendants are clipped to this element's bounds */
}
```

Use `contain: layout style paint` on self-contained UI regions like dashboards, widgets, sidebar panels, and modal dialogs. The browser can recompute just that subtree instead of the entire page.

### 8. content-visibility: auto for Medium Lists

`content-visibility: auto` is browser-native virtualization — off-screen items are skipped entirely by the rendering pipeline, slashing layout and paint work. Best for medium lists (50–500 items).

```css
.long-list-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 200px; /* Estimated placeholder height — prevents CLS */
}
```

`contain-intrinsic-size` provides a placeholder dimension so the scrollbar is accurate before items render. When an item enters the viewport, the browser renders it and the actual size replaces the estimate. Combine with `content-visibility: hidden` for off-screen tabs to keep their content in DOM but skip all rendering until they become visible.

### 9. True Virtual Scrolling for Large Lists

For lists with 1000+ items, use a dedicated virtualizer library. `content-visibility: auto` helps, but it still mounts DOM nodes for every item. Virtual scrolling only renders items in and near the viewport, keeping DOM size constant regardless of list length.

#### react-window (Fixed-size rows)

```bash
npm install react-window
```

```jsx
import { FixedSizeList as List } from 'react-window';

function VirtualList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style} className="list-item">
      <span>{items[index].ticker}</span>
      <span className="price">{items[index].price}</span>
      <span className={items[index].change >= 0 ? 'positive' : 'negative'}>
        {items[index].change}%
      </span>
    </div>
  );

  return (
    <List
      height={600}
      itemCount={items.length}
      itemSize={48}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

#### @tanstack/react-virtual (Dynamic row heights, headless)

```bash
npm install @tanstack/react-virtual
```

```jsx
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

function DynamicVirtualList({ items }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      style={{ height: 600, overflow: 'auto' }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <span>{items[virtualItem.index].ticker}</span>
            <span>{items[virtualItem.index].price}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**When to use which:**

| Approach | Best for | DOM footprint |
|---|---|---|
| `content-visibility: auto` | 50–500 items, simple markup | All items in DOM, off-screen skipped |
| `react-window` | 1000+ items, fixed row heights | Only ~visible + overscan items |
| `@tanstack/virtual` | 1000+ items, dynamic row heights, grid layouts | Only ~visible + overscan items |

### 10. React 18/19 Concurrent Features

Concurrent React lets you defer expensive work without blocking user input.

#### useDeferredValue — Defer expensive filtering

```jsx
import { useState, useDeferredValue, useMemo } from 'react';

function SearchableList({ items }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  // This re-computation is deferred — keystrokes stay instant
  const filtered = useMemo(() => {
    const q = deferredQuery.toLowerCase();
    return items.filter(item => item.name.toLowerCase().includes(q));
  }, [items, deferredQuery]);

  const isStale = query !== deferredQuery;

  return (
    <>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search…"
      />
      <div style={{ opacity: isStale ? 0.5 : 1 }}>
        {filtered.map(item => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
    </>
  );
}
```

#### startTransition — Mark non-urgent state updates

```jsx
import { useState, startTransition } from 'react';

function Dashboard() {
  const [tab, setTab] = useState('overview');
  const [tabData, setTabData] = useState(null);

  const switchTab = (nextTab) => {
    // Tab highlight updates immediately (urgent)
    setTab(nextTab);
    // Heavy data fetch is deferred (non-urgent), keeps click responsive
    startTransition(() => {
      setTabData(loadTabData(nextTab));
    });
  };

  return (
    <>
      <TabBar active={tab} onChange={switchTab} />
      <div>{tabData}</div>
    </>
  );
}
```

#### Suspense + use() (React 19) — Declarative data loading

```jsx
// React 19: use() hook unwraps promises in render, pairs with <Suspense>
import { use, Suspense, useState, startTransition } from 'react';

const fetchProducts = (() => {
  const cache = new Map();
  return (query) => {
    if (!cache.has(query)) {
      cache.set(query, fetch(`/api/products?q=${query}`).then(r => r.json()));
    }
    return cache.get(query);
  };
})();

function ProductList({ query }) {
  const products = use(fetchProducts(query));

  return (
    <ul>
      {products.map(p => <li key={p.id}>{p.name}</li>)}
    </ul>
  );
}

function SearchableProducts() {
  const [query, setQuery] = useState('');

  return (
    <>
      <input
        value={query}
        onChange={e => {
          startTransition(() => setQuery(e.target.value));
        }}
        placeholder="Search products…"
      />
      <Suspense fallback={<Spinner />}>
        <ProductList query={query} />
      </Suspense>
    </>
  );
}
```

**Key points for concurrent features:**
- `useDeferredValue` keeps input responsive when an expensive list re-render lags behind keystrokes.
- `startTransition` tells React "this update can be interrupted" — the urgent update (tab switch, type-ahead highlight) completes first.
- React 19's `use()` hook + `<Suspense>` gives you declarative data fetching with automatic loading boundaries.
- Always wrap the fallback path with `useDeferredValue` or `startTransition` — never block the main thread on a synchronous filter over a huge array.

### 11. GPU-Accelerated Animation Properties

Only `transform` and `opacity` run purely on the compositor thread — animations stay at 60fps even during heavy main-thread work.

| Safe (compositor-only, 60fps) | Avoid Animating (triggers layout/paint) |
|-------------------------------|----------------------------------------|
| `transform`                   | `width`, `height`                      |
| `opacity`                     | `top`, `left`, `right`, `bottom`       |
|                               | `margin`, `padding`                    |
|                               | `border-width`                         |
|                               | `box-shadow`                           |
|                               | `font-size`, `color`                   |

```css
/* Safe: compositor-only animation */
.card {
  transition: transform 200ms, opacity 200ms;
}
.card:hover {
  transform: translateY(-2px);
  opacity: 0.9;
}
```

### 12. will-change Rules

`will-change` tells the browser to promote an element to its own GPU layer ahead of an animation. Misused, it wastes GPU memory and hurts performance.

- **NEVER** apply `will-change` globally (`*` selector) — creates GPU layers for everything and exhausts memory.
- **ONLY** apply when animation is imminent — on `:hover`, or toggle an `.animating` class right before starting.
- **REMOVE** after the animation completes to free the layer.

```css
/* Good: applied only when hover signals imminent animation */
.card {
  transition: transform 300ms;
}
.card:hover {
  will-change: transform;
}

/* Good via class toggle in JavaScript */
.card.animating {
  will-change: transform, opacity;
}
```

### 13. Stable References Deep Dive

Stable references are the foundation of effective memoization in React. The most common reason `React.memo`, `useMemo`, and `useCallback` fail is that callers pass **new references** on every render.

#### The Three Anti-Patterns That Defeat React.memo

```tsx
// ❌ ANTI-PATTERN 1: Inline objects
//    A new object is created every render — React.memo always re-renders.
function TaskList() {
  return <TaskFilters options={{ sortBy: 'date', order: 'desc' }} />;
}

// ❌ ANTI-PATTERN 2: Inline arrays
//    Same problem — new array reference every render.
function Dashboard() {
  return <ChartWidget series={[{ name: 'Revenue', data: [1,2,3] }]} />;
}

// ❌ ANTI-PATTERN 3: Inline functions
//    New function identity every render — triggers all downstream effects/memos.
function UserProfile() {
  return <UserCard onSave={() => saveUser(user)} />;
}
```

#### Stable Fixes

```tsx
// ✅ Fix 1: Hoist constants outside the component
const DEFAULT_OPTIONS = { sortBy: 'date', order: 'desc' } as const;
const DEFAULT_SERIES = [{ name: 'Revenue', data: [1, 2, 3] }] as const;

function TaskList() {
  return <TaskFilters options={DEFAULT_OPTIONS} />;
}

// ✅ Fix 2: useMemo when the value depends on props/state
function Dashboard() {
  const series = useMemo(
    () => [{ name: 'Revenue', data: recentSales }],
    [recentSales]
  );
  return <ChartWidget series={series} />;
}

// ✅ Fix 3: useCallback for event handlers
function UserProfile() {
  const handleSave = useCallback(() => saveUser(user), [user]);
  return <UserCard onSave={handleSave} />;
}
```

**Rules for stable references:**
- Constants that never change → hoist outside the component.
- Derived data that depends on props/state → wrap in `useMemo`.
- Event handlers passed as props → wrap in `useCallback`.
- Never pass freshly-constructed objects, arrays, or anonymous functions as props to memoized children.
- If you can't avoid inline objects (e.g., a style prop like `style={{ opacity }}`), accept that `React.memo` on the child won't help — the child must be cheap to re-render.

### 14. React: useMemo for Expensive Computations

Wrap expensive filtering, sorting, or derived data in `useMemo` so it only recalculates when dependencies change.

```tsx
const filtered = useMemo(
  () => products.filter(p => p.category === category),
  [products, category]
);

const sorted = useMemo(
  () => [...filtered].sort((a, b) => b.metric - a.metric),
  [filtered]
);
```

Without `useMemo`, every render re-runs the computation — even when inputs haven't changed. Chain `useMemo` calls for multi-step derivations (filter → sort → limit) to skip intermediate work as well.

## Checklist

- [ ] Reserve height for lazy-loaded content
- [ ] Implement tab-level lazy loading (conditional rendering, not hidden)
- [ ] Memoize expensive list items (default shallow comparison)
- [ ] Show cached data instantly on load
- [ ] Keep DOM structure flat and minimal
- [ ] Prevent layout thrashing (batch reads before writes)
- [ ] Use CSS `contain` on independent UI regions
- [ ] Use `content-visibility: auto` for medium lists (50–500 items)
- [ ] Use `react-window` or `@tanstack/virtual` for large lists (1000+ items)
- [ ] Use `useDeferredValue` / `startTransition` to keep input responsive
- [ ] Use `<Suspense>` with React 19's `use()` for declarative data loading
- [ ] Animate only `transform` and `opacity`
- [ ] Use `will-change` sparingly and remove after animation
- [ ] Use stable object references (hoist constants, avoid inline objects/arrays/functions)
- [ ] Monitor CLS (keep under 0.1)
- [ ] Ensure 60fps during scrolling

## Memory Profiling & Leak Detection

Memory leaks degrade performance gradually — the app gets slower over time and eventually crashes the tab. Chrome DevTools Memory panel catches these before users do.

### Taking Heap Snapshots

1. Open DevTools → **Memory** tab
2. Select **Heap snapshot**, click "Take snapshot"
3. Perform a user flow (navigate, open/close modals, switch tabs)
4. Take a second snapshot
5. Sort by "Delta" (Objects Count) — look for objects that grew unexpectedly
6. Select objects with high delta and inspect retainers to find what's holding references

For a before/after comparison on a single flow:
- Snapshot 1 → do the flow → Snapshot 2
- Filter by "Objects allocated between Snapshot 1 and Snapshot 2"
- Look for components, event listeners, or timers that should have been garbage collected

### Allocation Timeline

Select **Allocation instrumentation on timeline** to record allocations during interaction. This shows which functions allocate memory in real-time — useful for identifying per-frame allocation spikes causing GC pauses.

### Common React Memory Leaks

**1. `setInterval` without `clearInterval`:**

```jsx
useEffect(() => {
  const id = setInterval(() => {
    fetchPrices();
  }, 5000);
  return () => clearInterval(id); // REQUIRED
}, []);
```

Without the cleanup, each mount/unmount cycle creates a new interval while the old one keeps running on a stale closure.

**2. Event listeners without removal:**

```jsx
useEffect(() => {
  const handleResize = () => setWidth(window.innerWidth);
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

Resize, scroll, and keyboard listeners attached to `window` or `document` persist across unmounts if not cleaned up. Every unmount/mount cycle adds another listener.

**3. Subscriptions without unsubscribe:**

```jsx
useEffect(() => {
  const sub = stockFeed.subscribe(ticker, setPrice);
  return () => sub.unsubscribe(); // REQUIRED
}, [ticker]);
```

WebSocket subscriptions, EventEmitter listeners, and Observer patterns all need explicit teardown. Each orphaned subscription holds a closure reference to the component's state.

**4. Detached DOM Nodes:**

References to DOM elements stored in refs or closures after the element is removed from the DOM prevent garbage collection. Always null out refs in cleanup:

```jsx
useEffect(() => {
  const el = containerRef.current;
  if (!el) return;
  const observer = new ResizeObserver(handleResize);
  observer.observe(el);
  return () => {
    observer.disconnect();
    // el reference is released when observer is disconnected
  };
}, []);
```

### The Universal Cleanup Rule

Every resource acquisition in `useEffect` must have a corresponding release in the cleanup function:

| Resource | Acquisition | Cleanup |
|---|---|---|
| `setInterval` / `setTimeout` | `const id = setInterval(...)` | `clearInterval(id)` |
| Event listener | `addEventListener(...)` | `removeEventListener(...)` |
| Subscription | `.subscribe(...)` | `.unsubscribe()` |
| Observer | `new MutationObserver(...)` | `observer.disconnect()` |
| WebSocket | `new WebSocket(...)` | `socket.close()` |
| Fetch abort | `const ctrl = new AbortController()` | `ctrl.abort()` |

## Web Workers for Heavy Computation

Move CPU-intensive work off the main thread to keep the UI responsive.

### When to Use a Worker

Any synchronous operation that blocks the main thread for >50ms should move to a worker:

- **JSON parsing >50ms** — large API responses, deeply nested data
- **CSV/data processing** — filtering, sorting, aggregating large datasets
- **Image manipulation** — resizing, format conversion, pixel operations
- **Cryptographic operations** — hashing, encryption, signature verification
- **Text processing** — search indexing, markdown parsing, syntax highlighting

### Basic Worker with Comlink

[Comlink](https://github.com/GoogleChromeLabs/comlink) wraps `postMessage` with a clean async API:

```ts
// worker.ts
import { expose } from 'comlink';

const api = {
  processData(raw: PortfolioRow[]): PortfolioSummary {
    // Heavy computation runs off main thread
    const filtered = raw.filter(r => r.value > 1000);
    const grouped = groupBy(filtered, 'sector');
    return computeMetrics(grouped);
  }
};

expose(api);
```

```tsx
// Component
import { wrap } from 'comlink';

const worker = wrap<typeof import('./worker')>(
  new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
);

function Portfolio() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);

  useEffect(() => {
    worker.processData(rawData).then(setSummary);
  }, [rawData]);
  // ...
}
```

### Transferable Objects (Zero-Copy)

Transfer ownership of large buffers instead of copying them:

```ts
// Without transfer: data is copied (slow for large buffers)
worker.postMessage({ type: 'process', data: largeArrayBuffer });

// With transfer: ownership moves, zero copy (fast)
worker.postMessage({ type: 'process', data: largeArrayBuffer }, [largeArrayBuffer]);
// largeArrayBuffer is now detached — can't use it in main thread anymore
```

Use transferables for `ArrayBuffer`, `MessagePort`, `ImageBitmap`, and `OffscreenCanvas`.

### Worker Pool Pattern

For parallel processing, create a pool of workers and round-robin tasks:

```ts
class WorkerPool {
  private workers: Worker[];
  private index = 0;

  constructor(WorkerClass: new () => Worker, size = navigator.hardwareConcurrency || 4) {
    this.workers = Array.from({ length: size }, () => new WorkerClass());
  }

  postMessage(data: any, transfer?: Transferable[]) {
    const worker = this.workers[this.index++ % this.workers.length];
    worker.postMessage(data, transfer ?? []);
  }

  terminate() {
    this.workers.forEach(w => w.terminate());
  }
}
```

## `scheduler.yield()` — New API

The [Prioritized Task Scheduling API](https://developer.mozilla.org/en-US/docs/Web/API/Prioritized_Task_Scheduling_API) lets you yield control to the main thread in long-running tasks, keeping the UI responsive during heavy processing.

### Yielding During Array Processing

```ts
async function processLargeArray(items: Item[]) {
  const results: Result[] = [];
  const CHUNK_SIZE = 1000;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);

    // Do some work on this chunk
    const processed = chunk.map(heavyTransformation);
    results.push(...processed);

    // Yield to the main thread — allows pending UI updates to paint
    if ('scheduler' in globalThis) {
      await (scheduler as any).yield();
    } else {
      // Fallback: yield via setTimeout for browsers without the API
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return results;
}
```

### `scheduler.postTask()` with Priorities

Schedule work at explicit priority levels:

```ts
// High priority: user-visible interactions
scheduler.postTask(() => updateChatMessage(msg), { priority: 'user-blocking' });

// Medium priority: default for data fetching and rendering
scheduler.postTask(() => fetchStockPrices(), { priority: 'user-visible' });

// Low priority: analytics, logging, prefetching
scheduler.postTask(() => sendAnalytics(), { priority: 'background' });
```

### Task Priorities

| Priority | Use Case | Browser Behavior |
|---|---|---|
| `user-blocking` | Responding to clicks, keystrokes | Runs immediately |
| `user-visible` | Data fetching, rendering updates | Runs soon, may yield to `user-blocking` |
| `background` | Analytics, logging, prefetch, cleanup | Runs during idle, may be deferred |

### Chunked Processing with Dual-API Approach

```ts
async function chunkedProcess<T, R>(
  items: T[],
  fn: (item: T) => R,
  chunkSize: number = 500
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    results.push(...chunk.map(fn));

    if (i + chunkSize < items.length) {
      if ('scheduler' in globalThis) {
        await (scheduler as any).yield();
      } else {
        // Fallback for browsers without the API
        await new Promise(r => setTimeout(r, 0));
      }
    }
  }

  return results;
}
```

**Browser support:** `scheduler.yield()` landed in Chrome 129 (2024). `scheduler.postTask()` is available since Chrome 94. Both are Chromium-only as of 2025; always include a `setTimeout` fallback.

## Key Metrics

- **Cumulative Layout Shift (CLS):** Under 0.1
- **First Contentful Paint (FCP):** Under 1.8s (Good per Google CWV)
- **Largest Contentful Paint (LCP):** Under 2.5s
- **Animation frame rate:** 60fps

→ See full implementation details in [bundle-optimization.md](./bundle-optimization.md) and [multi-layered-caching.md](./multi-layered-caching.md)
