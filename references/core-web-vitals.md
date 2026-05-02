# Core Web Vitals — Comprehensive Reference

Systems-level diagnostic guide with runnable code examples for LCP, INP, and CLS.

---

## 1. Quick Reference Table

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |

**Ancillary thresholds:**

| Metric | Good | Target |
|--------|------|--------|
| **TTFB** (Time to First Byte) | ≤ 800ms | CDN edge: < 200ms |
| **FCP** (First Contentful Paint) | ≤ 1.8s | — |
| **TBT** (Total Blocking Time) | ≤ 200ms | — |
| **TTI** (Time to Interactive) | ≤ 3.8s | — |
| **Speed Index** | ≤ 3.4s | — |

---

## 2. Measurement Tools

### Synthetic (Lab) — Reproducible, CI-friendly

```bash
# Lighthouse CLI — full audit
npx lighthouse https://example.com \
  --output html \
  --output-path report.html \
  --throttling.cpuSlowdownMultiplier=4 \
  --throttling.throughputKbps=1600 \
  --throttling.rttMs=150 \
  --preset=desktop

# Lighthouse CLI — mobile emulation
npx lighthouse https://example.com \
  --preset=perf \
  --chrome-flags="--headless" \
  --only-categories=performance

# Targeted metric check (JSON output for scripting)
npx lighthouse https://example.com \
  --output json \
  --output-path metrics.json \
  --only-categories=performance
```

```bash
# Chrome DevTools Performance panel — trace recording
# Start recording → interact with page → stop → analyze long tasks
# CLI equivalent (Puppeteer trace):
node -e "
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.tracing.start({ categories: ['devtools.timeline'] });
  await page.goto('https://example.com');
  // interact here
  const trace = await page.tracing.stop();
  require('fs').writeFileSync('trace.json', JSON.stringify(trace));
  await browser.close();
})();
"
```

```bash
# WebPageTest — multi-device, multi-location
# https://www.webpagetest.org/
# CLI via webpagetest-api:
npx webpagetest test https://example.com \
  --location "Dulles:Chrome" \
  --runs 3 \
  --firstViewOnly
```

### RUM (Real User Monitoring) — Real-user data

```javascript
// web-vitals library — install: npm install web-vitals
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

// Log to console
onLCP(console.log);
onINP(console.log);
onCLS(console.log);

// Send to analytics
function sendToAnalytics({ name, value, id, delta, rating, entries }) {
  // Use `rating` for 'good' | 'needs-improvement' | 'poor'
  gtag('event', name, {
    event_category: 'Web Vitals',
    event_label: id,
    value: Math.round(name === 'CLS' ? delta * 1000 : delta),
    non_interaction: true,
  });
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

```javascript
// attribution — what caused the metric
import { onLCP, onINP, onCLS } from 'web-vitals/attribution';

onLCP((metric) => {
  console.log('LCP element:', metric.attribution.element);
  console.log('LCP resource type:', metric.attribution.url);
  console.log('LCP load time:', metric.attribution.lcpResourceEntry?.duration);
});

onCLS((metric) => {
  metric.attribution.largestShiftSources?.forEach((source) => {
    console.log('CLS source node:', source.node);
    console.log('CLS shift value:', source.currentRect);
  });
});

onINP((metric) => {
  console.log('INP event type:', metric.attribution.eventType);
  console.log('INP input delay:', metric.attribution.inputDelay);
  console.log('INP processing duration:', metric.attribution.processingDuration);
  console.log('INP presentation delay:', metric.attribution.presentationDelay);
});
```

### CrUX (Chrome UX Report) — Field data at scale

```bash
# CrUX via BigQuery (28-day rolling average):
# SELECT * FROM `chrome-ux-report.materialized.device_summary`
# WHERE origin = 'https://example.com' AND date = '2026-04-01'

# CrUX via PageSpeed Insights API
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&strategy=mobile&category=performance"

# CrUX History API (trends over time)
curl "https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord?key=API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"origin": "https://example.com", "formFactor": "PHONE"}'
```

### Synthetic vs. RUM — When to use what

| Need | Use |
|------|-----|
| Regression detection in CI | Synthetic (Lighthouse CI) |
| Baseline before/after optimization | Synthetic |
| Debugging a specific bottleneck | Synthetic (DevTools trace) |
| Understanding real user experience | RUM (web-vitals) |
| SEO / ranking impact assessment | CrUX |
| Competitor benchmarking | CrUX + WebPageTest |

---

## 3. LCP Diagnostic Decision Tree

```
Slow LCP (> 2.5s)?
├── Slow TTFB (> 800ms)? ─────────────────────────────────────┐
│   ├── DNS lookup > 50ms → Add dns-prefetch / preconnect      │
│   ├── TCP/TLS > 200ms → Enable HTTP/2, keep-alive, edge CDN  │
│   ├── Waiting (TTFB) > 600ms → Server-render, cache, CDN edge│
│   └── Redirects → Eliminate redirect chains                  │
├── Fast TTFB, slow LCP resource load? ────────────────────────┤
│   ├── Render-blocking CSS → Inline critical CSS              │
│   ├── Render-blocking JS → Defer non-critical scripts        │
│   ├── LCP image > 1s download → Optimize, preload, CDN       │
│   └── LCP is text node → Font blocking (font-display: swap)  │
├── Slow LCP mobile only? ─────────────────────────────────────┤
│   ├── Wrong image resolution → Responsive srcset             │
│   └── Mobile CPU throttling → Reduce JS on critical path     │
└── Late-discovery LCP? ───────────────────────────────────────┤
    ├── Image loaded by JS → Preload in <head>                 │
    └── Lazy-loaded LCP candidate → Remove loading="lazy"      │
```

### Fix: Slow TTFB → DNS/TCP/TLS/Server/CDN

```html
<!-- Preconnect to required origins early -->
<link rel="dns-prefetch" href="https://api.example.com">
<link rel="preconnect" href="https://api.example.com">
<link rel="preconnect" href="https://images.cdn.example.com" crossorigin>

<!-- Eliminate redirect chains -->
<!-- Instead of http://example.com → https://example.com → https://www.example.com -->
<!-- Go directly to https://www.example.com -->

<!-- Preload critical resources with fetchpriority -->
<link rel="preload" as="image" href="/hero.avif" fetchpriority="high">
<link rel="preload" as="font" href="/fonts/heading.woff2" crossorigin fetchpriority="high">
```

```javascript
// Server-side: aggressive CDN edge caching for HTML
// Vercel: export const dynamic = 'force-static';
// Next.js ISR:
export async function getStaticProps() {
  return {
    props: { data: await fetchData() },
    revalidate: 60, // Regenerate every 60s at edge
  };
}
```

### Fix: Fast TTFB, Slow LCP → Render-blocking Resources

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Preload the LCP image early in <head> -->
  <link rel="preload" as="image" href="/hero-1200.avif" fetchpriority="high">

  <!-- Inline critical CSS (above-fold only) -->
  <style>
    /* Critical: header, hero, above-fold layout */
    :root { --nav-h: 56px; }
    .site-header { height: var(--nav-h); position: sticky; top: 0; }
    .hero { min-height: calc(100vh - var(--nav-h)); display: grid; place-items: center; }
    .hero img { width: 100%; max-width: 1200px; height: auto; aspect-ratio: 2/1; }
  </style>

  <!-- Defer non-critical CSS -->
  <link rel="preload" href="/styles/full.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/styles/full.css"></noscript>

  <!-- Defer non-critical JS -->
  <script defer src="/app.js"></script>
  <script async src="/analytics.js"></script>
</head>
<body>
  <!-- LCP image: eager, high priority, explicit dimensions -->
  <img
    src="/hero-1200.avif"
    fetchpriority="high"
    loading="eager"
    decoding="sync"
    width="1200"
    height="600"
    alt="Hero"
  >

  <!-- Below-fold: lazy -->
  <img
    src="/content.webp"
    loading="lazy"
    decoding="async"
    width="800"
    height="400"
    alt="Content"
  >
</body>
</html>
```

### Fix: Slow LCP Mobile Only → Wrong Image Resolution

```html
<!-- Responsive LCP image with art direction -->
<picture>
  <!-- Mobile: portrait crop, smaller file -->
  <source
    media="(max-width: 767px)"
    srcset="/hero-mobile-400.avif 400w, /hero-mobile-800.avif 800w"
    sizes="100vw"
    width="800"
    height="1000"
    type="image/avif"
  />
  <source
    media="(max-width: 767px)"
    srcset="/hero-mobile-400.webp 400w, /hero-mobile-800.webp 800w"
    sizes="100vw"
    width="800"
    height="1000"
    type="image/webp"
  />
  <!-- Desktop: landscape crop -->
  <source
    srcset="/hero-800.avif 800w, /hero-1200.avif 1200w, /hero-1600.avif 1600w"
    sizes="(max-width: 1200px) 100vw, 1200px"
    width="1200"
    height="600"
    type="image/avif"
  />
  <source
    srcset="/hero-800.webp 800w, /hero-1200.webp 1200w, /hero-1600.webp 1600w"
    sizes="(max-width: 1200px) 100vw, 1200px"
    width="1200"
    height="600"
    type="image/webp"
  />
  <img
    src="/hero-desktop.jpg"
    width="1200"
    height="600"
    fetchpriority="high"
    alt="Hero"
  />
</picture>
```

### Fix: Late-Discovery LCP → Image Loaded by JS

```javascript
// Bad: LCP image injected by JS after framework hydrates
function Hero() {
  return <img src={heroUrl} alt="Hero" />;
}

// Good: Preload in <head> so the download starts immediately
// Add to document <head>:
// <link rel="preload" as="image" href="/hero.avif" fetchpriority="high">

// Or with React Helmet / Next.js Head:
import Head from 'next/head';
function Page() {
  return (
    <Head>
      <link rel="preload" as="image" href="/hero.avif" fetchpriority="high" />
    </Head>
  );
}

// Never use loading="lazy" on the LCP element
```

---

## 4. INP Diagnostic Decision Tree

```
High INP (> 200ms)?
├── Consistently high across all interactions? ───────────────────┐
│   ├── Main thread overloaded → Break up long tasks (>50ms)      │
│   ├── Too much JS on load → Code splitting, defer, idle load    │
│   └── Large DOM → Reduce DOM size, virtualize lists             │
├── Spikes during scroll? ────────────────────────────────────────┤
│   ├── Expensive scroll handlers → requestAnimationFrame, debounce│
│   ├── Layout thrashing → Batch DOM reads, then writes           │
│   └── Heavy paint areas → will-change, contain, content-visibility│
├── Spikes after data fetch / React re-render? ───────────────────┤
│   ├── Large React re-renders → React.memo, useMemo, virtualization│
│   ├── Expensive state updates → useTransition, startTransition  │
│   └── Many concurrent updates → Batching, useDeferredValue      │
└── Spikes on specific elements? ─────────────────────────────────┤
    ├── Heavy event handlers → Move to Web Worker                 │
    └── Animation causing layout → Use transform: translate() only│
```

### Fix: Consistently High INP → Break Up Long Tasks

```javascript
// Bad: blocking the main thread for 200ms+
function processLargeDataset(items) {
  const results = items.map(item => heavyComputation(item)); // blocks
  return results;
}

// Good: yield to the browser every 50ms
async function processInChunks(items, chunkSize = 100) {
  const results = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    results.push(...chunk.map(item => heavyComputation(item)));
    // Yield to the main thread
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return results;
}

// Better: use requestIdleCallback for non-urgent work
function scheduleIdleWork(items) {
  const results = [];
  let index = 0;

  function processChunk(deadline) {
    while (index < items.length && deadline.timeRemaining() > 5) {
      results.push(heavyComputation(items[index]));
      index++;
    }
    if (index < items.length) {
      requestIdleCallback(processChunk);
    }
  }

  requestIdleCallback(processChunk);
  return results;
}

// Best: move heavy computation to a Web Worker
// worker.js
self.onmessage = (e) => {
  const results = e.data.map(item => heavyComputation(item));
  self.postMessage(results);
};

// main.js
const worker = new Worker(new URL('./worker.js', import.meta.url));
worker.onmessage = (e) => {
  console.log('Results ready:', e.data);
};
worker.postMessage(largeDataset);
```

### Fix: INP Spikes During Scroll → Batching DOM Reads/Writes

```javascript
// Bad: layout thrashing — interleaved reads and writes
elements.forEach(el => {
  const height = el.offsetHeight;          // READ (forces reflow)
  el.style.height = height + 10 + 'px';    // WRITE (invalidates layout)
});

// Good: batch all reads first, then all writes
const heights = elements.map(el => el.offsetHeight); // All READs
elements.forEach((el, i) => {
  el.style.height = heights[i] + 10 + 'px';           // All WRITEs
});

// Good: scroll handler with requestAnimationFrame
let ticking = false;

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      // All DOM work here
      updateParallax();
      updateStickyHeader();
      ticking = false;
    });
    ticking = true;
  }
});

// Good: passive scroll listener (can't call preventDefault)
window.addEventListener('scroll', handleScroll, { passive: true });

// Good: use IntersectionObserver instead of scroll handlers
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.lazy-section').forEach(el => observer.observe(el));
```

### Fix: INP Spikes After Data Fetch → React Optimizations

```jsx
import { useTransition, useDeferredValue, useMemo, memo, startTransition } from 'react';

// Use startTransition for non-urgent updates
function SearchResults({ query }) {
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(input) {
    // Urgent: update the input field immediately
    setQuery(input);

    // Non-urgent: defer the expensive results update
    startTransition(() => {
      const filtered = expensiveFilter(allData, input);
      setResults(filtered);
    });
  }

  return (
    <>
      <input value={query} onChange={e => handleSearch(e.target.value)} />
      {isPending ? <Spinner /> : <ResultList results={results} />}
    </>
  );
}

// useDeferredValue for keeping UI responsive during re-renders
function ProductList({ products, searchTerm }) {
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filtered = useMemo(
    () => products.filter(p => p.name.includes(deferredSearchTerm)),
    [products, deferredSearchTerm]
  );

  return filtered.map(p => <ProductCard key={p.id} product={p} />);
}

// Memoize expensive components
const ProductCard = memo(function ProductCard({ product }) {
  // expensive render logic
  return <div className="card">{product.name}</div>;
});

// Memoize expensive computations
function ExpensiveChart({ data }) {
  const chartData = useMemo(() => {
    return data.map(d => ({ x: d.date, y: expensiveTransform(d.value) }));
  }, [data]);

  return <Canvas data={chartData} />;
}
```

### Fix: CSS-Only Animations (No INP Cost)

```css
/* Bad: animating layout-triggering properties → INP spike */
.bad-animation {
  transition: width 0.3s, height 0.3s, top 0.3s, left 0.3s;
}
.bad-animation:hover {
  width: 300px;  /* triggers layout */
  height: 200px; /* triggers layout */
}

/* Good: only animate composite-only properties */
.good-animation {
  transition: transform 0.3s, opacity 0.3s;
  will-change: transform;
}
.good-animation:hover {
  transform: scale(1.05);
  opacity: 0.9;
}

/* Also good: hardware-accelerated properties */
.hardware-animated {
  transform: translateZ(0); /* force GPU layer */
  transition: transform 0.3s ease-out;
}

/* Good: hide off-screen elements from layout calculations */
.off-screen-list-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px; /* estimated height */
}
```

---

## 5. CLS Diagnostic Decision Tree

```
High CLS (> 0.1)?
├── Shift on page load? ────────────────────────────────────────┐
│   ├── Images without dimensions → width/height, aspect-ratio  │
│   ├── Injected content (ads, banners) → Reserve space         │
│   ├── Web fonts causing FOUT/FOIT → font-display: optional     │
│   ├── Late-loading CSS → Inline critical CSS                  │
│   └── Dynamic content → Skeleton screens, min-height          │
├── Shift during user interaction? ─────────────────────────────┤
│   ├── Animations using layout properties → transform only     │
│   ├── Infinite scroll inserting content above → Insert below  │
│   └── DOM mutations after load → Reserve space beforehand     │
└── Shift after load (non-interaction)? ────────────────────────┤
    ├── Third-party widgets → Facade pattern, reserve space     │
    └── Lazy-loaded iframes → Reserve explicit dimensions       │
```

### Fix: Images Without Dimensions

```html
<!-- Bad: no dimensions → browser doesn't know the space -->
<img src="/photo.jpg" alt="Photo">

<!-- Good: explicit width/height + CSS aspect-ratio -->
<img
  src="/photo.jpg"
  alt="Photo"
  width="800"
  height="600"
  style="width: 100%; height: auto; aspect-ratio: 800 / 600;"
>

<!-- Best: aspect-ratio + responsive srcset -->
<img
  src="/photo-800.webp"
  srcset="/photo-400.webp 400w, /photo-800.webp 800w, /photo-1200.webp 1200w"
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="Photo"
  width="800"
  height="600"
  style="width: 100%; height: auto;"
>
```

```css
/* Global CLS prevention for all images */
img, video, iframe {
  max-width: 100%;
  height: auto;
  aspect-ratio: attr(width) / attr(height);
}

/* Fallback for images without width/height attributes */
img:not([width]):not([height]) {
  aspect-ratio: 16 / 9;
}
```

### Fix: Injected Content (Ads, Banners, Widgets)

```html
<!-- Bad: ad loads and pushes content down -->
<div id="ad-container"></div>
<!-- Ad script injects a 250px tall iframe -->

<!-- Good: reserve the space before the ad loads -->
<div id="ad-container" style="min-height: 250px; background: #f5f5f5;">
  <div class="ad-label">Advertisement</div>
</div>

<!-- Better: skeleton + min-height that collapses if no ad -->
<style>
  .ad-slot {
    min-height: 250px;
    background: #f9f9f9;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed #ddd;
  }
  .ad-slot:empty {
    min-height: 0; /* collapse if no ad fills in */
  }
</style>
<div class="ad-slot" id="ad-container"></div>
```

### Fix: Web Fonts Causing FOIT/FOUT Layout Shift

```css
/* Bad: invisible text until font loads, then shift */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2');
  /* font-display defaults to 'block' → invisible for up to 3s */
}

/* Good: show fallback text immediately */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;
  font-weight: 400;
  unicode-range: U+0000-00FF; /* subset to Latin only */
}

/* Better: for non-critical text (body copy), use optional */
@font-face {
  font-family: 'BodyFont';
  src: url('/fonts/body.woff2') format('woff2');
  font-display: optional; /* only use if cached; never shift */
  font-weight: 400;
}

/* Minimize FOUT shift: match fallback font metrics */
body {
  font-family: 'CustomFont', 'Fallback Font', system-ui;
}
```

```css
/* Use size-adjust + ascent-override to eliminate shift entirely */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;
  font-weight: 400;
}

/* Match fallback to custom font metrics */
@font-face {
  font-family: 'CustomFont-Fallback';
  src: local('Arial');
  size-adjust: 105%;
  ascent-override: 90%;
}
```

### Fix: Animations Using Layout Properties

```css
/* Bad: animating height → layout shift every frame */
.expandable {
  overflow: hidden;
  transition: height 0.3s;
}
.expandable.open {
  height: 300px;
}

/* Good: use transform + max-height, no layout */
.expandable {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.3s ease, opacity 0.3s ease;
  opacity: 0;
}
.expandable.open {
  max-height: 1000px;
  opacity: 1;
}

/* Best: CSS grid animation with scale for truly zero CLS */
.drawer {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}
.drawer.open {
  grid-template-rows: 1fr;
}
.drawer > .drawer-content {
  overflow: hidden;
}
```

### Fix: Skeleton Screens for Dynamic Content

```jsx
// React: skeleton that matches final content's dimensions
function ProductCard({ product }) {
  if (!product) {
    return (
      <div className="product-card skeleton" style={{ minHeight: 320 }}>
        <div className="skeleton-image" style={{ height: 200 }} />
        <div className="skeleton-line" style={{ width: '60%', height: 20 }} />
        <div className="skeleton-line" style={{ width: '80%', height: 14 }} />
      </div>
    );
  }

  return (
    <div className="product-card">
      <img src={product.image} width={300} height={200} alt={product.name} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
    </div>
  );
}
```

```css
/* Skeleton animation */
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-line {
  background: #e8e8e8;
  border-radius: 4px;
  margin: 8px 0;
}
```

---

## 6. Performance Check Table

| Symptom | Likely Cause | Measurement | Fix |
|---------|-------------|-------------|-----|
| Slow LCP | Large hero image | DevTools Network > filter `Img` > sort by time | Compress to < 200KB, use AVIF, `fetchpriority="high"`, preload |
| Slow LCP + slow TTFB | CDN/server latency | `curl -w "ttfb: %{time_starttransfer}s\n" -o /dev/null -s https://yoursite.com` | CDN edge caching, server-side caching, HTTP/2 |
| Slow LCP + fast TTFB | Render-blocking CSS | Lighthouse > "Eliminate render-blocking resources" | Inline critical CSS, defer full CSS |
| Slow LCP mobile only | Wrong image size for viewport | DevTools > Inspect LCP element > check natural vs. rendered size | Responsive `srcset` with mobile-sized variants |
| LCP element is text | Web font blocking | Lighthouse > "Ensure text remains visible during webfont load" | `font-display: swap`, subset fonts, preload woff2 |
| High INP (consistent) | Long tasks on main thread | Performance panel > "Main" track > look for tasks > 50ms | Code splitting, Web Workers, break up long tasks |
| High INP (scroll) | Layout thrashing | Performance panel > look for forced reflows (purple bars) | Batch reads/writes, `requestAnimationFrame` |
| High INP (click) | Heavy event handler | Performance panel > click interaction > flame chart | Defer heavy work, use `setTimeout(fn, 0)` |
| High INP (React) | Large re-renders | React DevTools Profiler > record interaction | `React.memo`, `useMemo`, `startTransition`, virtualize |
| High CLS (load) | Images without dimensions | Lighthouse > "Image elements have explicit width and height" | `width`/`height` attributes, `aspect-ratio` CSS |
| High CLS (load) | Injected ads/widgets | Lighthouse > "Avoid large layout shifts" | Reserve space with `min-height`, skeleton slots |
| High CLS (load) | Font shift (FOUT) | Visually: text changes size after fonts load | `font-display: optional` or `size-adjust` |
| High CLS (interaction) | Layout-triggering animation | DevTools > Performance > check for Layout in frames | Use `transform` and `opacity` only |
| High CLS (scroll) | Infinite scroll inserting above viewport | Manual: scroll down, check CLS attribution | Insert new content below, not above |
| High TBT | Too much JS executing | Lighthouse > "Reduce JavaScript execution time" | Code split, defer non-critical JS, remove dead code |
| Large bundle | Unused dependencies | `npx vite-bundle-visualizer` (Vite) or `npx webpack-bundle-analyzer dist/stats.json` (webpack) | Replace heavy libs, tree-shaking, dynamic imports |
| Slow API responses | N+1 database queries | Server logs, APM trace | `Promise.all()`, join/include queries, cache |
| Third-party script blocking | Synchronous third-party scripts | Lighthouse > "Reduce the impact of third-party code" | Load with `async`/`defer`, facade pattern, delay until idle |

---

## 7. CI Integration

### Lighthouse CI — Automated Performance Audits

```bash
npm install -D @lhci/cli
```

```yaml
# .github/workflows/lighthouse.yml (GitHub Actions)
name: Lighthouse CI
on: [pull_request]

jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - name: Run Lighthouse CI
        run: |
          npx lhci autorun \
            --upload.target=temporary-public-storage \
            --collect.url=http://localhost:3000 \
            --collect.numberOfRuns=3
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

```json
// lighthouserc.json — config for lhci
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000/", "http://localhost:3000/about"],
      "numberOfRuns": 3,
      "startServerCommand": "npm run start",
      "startServerReadyPattern": "ready on"
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["warn", { "minScore": 0.85 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "interaction-to-next-paint": ["warn", { "maxNumericValue": 200 }],
        "unused-javascript": ["warn", { "maxLength": 0 }],
        "uses-responsive-images": ["error", { "minScore": 1 }],
        "uses-optimized-images": ["error", { "minScore": 1 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### Bundle Size Budget — Prevent Regressions

```bash
npm install -D bundlesize
```

```json
// bundlesize.config.json
{
  "files": [
    {
      "path": "./dist/assets/*.js",
      "maxSize": "200 kB",
      "compression": "gzip"
    },
    {
      "path": "./dist/assets/*.css",
      "maxSize": "50 kB",
      "compression": "gzip"
    },
    {
      "path": "./dist/assets/fonts/*.woff2",
      "maxSize": "100 kB"
    },
    {
      "path": "./dist/assets/images/hero*.avif",
      "maxSize": "200 kB"
    }
  ],
  "ci": {
    "trackBranches": ["main"]
  }
}
```

```json
// package.json
{
  "scripts": {
    "size": "bundlesize",
    "lhci": "lhci autorun"
  },
  "bundlesize": [
    { "path": "./dist/assets/*.js", "maxSize": "200 kB", "compression": "gzip" }
  ]
}
```

### Custom Performance Budgets in CI

```javascript
// scripts/perf-budget.js — custom assertion script
const fs = require('fs');

const budgets = {
  bundleJS: 200 * 1024,  // 200 KB gzipped
  bundleCSS: 50 * 1024,  // 50 KB gzipped
  heroImage: 200 * 1024, // 200 KB
};

function checkFileSize(filePath, budget, label) {
  const stats = fs.statSync(filePath);
  if (stats.size > budget) {
    console.error(`FAIL: ${label} — ${(stats.size / 1024).toFixed(1)} KB exceeds ${(budget / 1024).toFixed(1)} KB budget`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${label} — ${(stats.size / 1024).toFixed(1)} KB`);
  }
}

// Usage in CI:
checkFileSize('./dist/assets/index-abc123.js', budgets.bundleJS, 'Main JS bundle');
checkFileSize('./dist/assets/hero.avif', budgets.heroImage, 'Hero image');

if (process.exitCode === 0) console.log('\nAll budgets passed.');
```

```json
// package.json — run budgets in CI
{
  "scripts": {
    "perf-budget": "node scripts/perf-budget.js",
    "test:perf": "npm run lhci && npm run perf-budget && npm run size"
  }
}
```

### Web Vitals Guard — Catch Regressions in E2E Tests

```javascript
// e2e/perf.spec.js — Playwright example
const { test, expect } = require('@playwright/test');

test('Core Web Vitals within budget', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Wait for LCP
  await page.waitForFunction(() => {
    return performance.getEntriesByType('largest-contentful-paint').length > 0;
  });

  const [lcpEntry] = performance.getEntriesByType('largest-contentful-paint');
  expect(lcpEntry.startTime).toBeLessThan(2500);

  // Wait for layout stability
  await page.waitForTimeout(2000);
  const cls = await page.evaluate(() => {
    return new Promise((resolve) => {
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) clsValue += entry.value;
        }
        resolve(clsValue);
      }).observe({ type: 'layout-shift', buffered: true });
    });
  });

  expect(cls).toBeLessThan(0.1);
});
```

---

## 8. Before/After Example — Real Improvement Scenario

### Scenario: E-commerce Product Listing Page

**Initial state:**

| Metric | Before | Severity |
|--------|--------|----------|
| LCP | 4.2s | Poor |
| INP | 320ms | Needs Improvement |
| CLS | 0.25 | Poor |
| TTFB | 950ms | Poor |
| Bundle (gzip) | 580 KB | — |
| Hero image | 2.1 MB JPEG | — |
| Lighthouse | 42/100 | — |

### Root Cause Analysis

1. **LCP 4.2s**: Hero product image is 2.1 MB JPEG, no `fetchpriority`, no preload, no `srcset` for mobile
2. **INP 320ms**: Monolithic JS bundle (580 KB) with 15 heavy `node_modules` imports, no code splitting
3. **CLS 0.25**: Product cards render without dimensions, injected ad banner pushes content, web fonts shift
4. **TTFB 950ms**: No CDN, no server-side caching, SSR doing blocking DB queries

### Intervention Plan

```html
<!-- 1. LCP: Hero image optimization -->
<!-- Before -->
<img src="/hero.jpg" alt="New Arrivals">

<!-- After -->
<link rel="preload" as="image" href="/hero-1200.avif" fetchpriority="high">
<picture>
  <source media="(max-width: 767px)"
          srcset="/hero-400.avif 400w, /hero-800.avif 800w"
          sizes="100vw" type="image/avif">
  <source srcset="/hero-800.avif 800w, /hero-1200.avif 1200w, /hero-1600.avif 1600w"
          sizes="(max-width: 1200px) 100vw, 1200px" type="image/avif">
  <img src="/hero-1200.jpg" width="1200" height="600"
       fetchpriority="high" loading="eager" decoding="sync"
       alt="New Arrivals">
</picture>
```

```javascript
// 2. INP: Code splitting + lazy loading
// Before: monolithic import
import { HeavyChart } from './charts/HeavyChart';
import { ProductFilter } from './filters/ProductFilter';
import { AnalyticsDashboard } from './analytics/Dashboard';
import { UploadWidget } from './upload/UploadWidget';
import moment from 'moment';              // 67 KB
import lodash from 'lodash';              // 72 KB
import { FullCalendar } from '@fullcalendar/react';

// After: dynamic imports + lightweight alternatives
import { lazy, Suspense } from 'react';
import { format } from 'date-fns';        // 12 KB (saved 55 KB)
import debounce from 'lodash/debounce';    // 5 KB (saved 67 KB)

const HeavyChart = lazy(() => import('./charts/HeavyChart'));
const ProductFilter = lazy(() => import('./filters/ProductFilter'));
const AnalyticsDashboard = lazy(() => import('./analytics/Dashboard'));

// Load analytics only on admin pages
if (isAdmin) {
  const { AnalyticsDashboard } = await import('./analytics/Dashboard');
}

// Defer widget loading until idle
requestIdleCallback(() => {
  import('./upload/UploadWidget');
});
```

```css
/* 3. CLS: Reserve spaces, font-display, skeleton screens */
/* Image dimensions */
.product-card img {
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
}

/* Ad slot reservation */
.ad-banner {
  min-height: 90px;
  background: #f9f9f9;
}
.ad-banner:empty {
  min-height: 0;
}

/* Font loading without layout shift */
@font-face {
  font-family: 'Brand';
  src: url('/fonts/brand.woff2') format('woff2');
  font-display: optional; /* never cause shift */
  font-weight: 700;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC,
                 U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074,
                 U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215,
                 U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Brand-Fallback';
  src: local('Arial');
  size-adjust: 105%;
  ascent-override: 90%;
}

body {
  font-family: 'Brand', 'Brand-Fallback', system-ui, -apple-system, sans-serif;
}
```

```javascript
// 4. TTFB: Edge caching + parallel data fetching
// Next.js App Router example — parallel fetch + ISR
export default async function ProductsPage() {
  // Parallel data fetching — no waterfall
  const [products, categories, promotions] = await Promise.all([
    fetch('https://api.example.com/products', { next: { revalidate: 60 } }),
    fetch('https://api.example.com/categories', { next: { revalidate: 3600 } }),
    fetch('https://api.example.com/promotions', { next: { revalidate: 300 } }),
  ]);

  const productsData = await products.json();
  const categoriesData = await categories.json();
  const promotionsData = await promotions.json();

  return <ProductList products={productsData} categories={categoriesData} promotions={promotionsData} />;
}

// ISR revalidation: regenerate pages at edge every 60s
export const revalidate = 60;
```

```nginx
# Nginx: aggressive CDN caching
location / {
    proxy_cache STATIC;
    proxy_cache_valid 200 60s;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503;
    add_header X-Cache-Status $upstream_cache_status;
    add_header Cache-Control "public, max-age=60, stale-while-revalidate=300";
}

# Static assets: immutable long cache
location /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# Fonts: long cache
location ~* \.(woff2)$ {
    expires 30d;
    add_header Cache-Control "public, max-age=2592000";
}

# Images: moderate cache
location ~* \.(avif|webp|jpg|png|svg)$ {
    expires 7d;
    add_header Cache-Control "public, max-age=604800";
}

# Brotli compression (15-20% better than gzip)
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/javascript application/json image/svg+xml;
```

### Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **LCP** | 4.2s | 1.8s | **57% faster** |
| **INP** | 320ms | 95ms | **70% lower** |
| **CLS** | 0.25 | 0.03 | **88% reduction** |
| **TTFB** | 950ms | 180ms | **81% faster** |
| **Bundle (gzip)** | 580 KB | 148 KB | **74% smaller** |
| **Hero image** | 2.1 MB | 124 KB (AVIF) | **94% smaller** |
| **Lighthouse** | 42/100 | 96/100 | **129% improvement** |

### What drove the improvement

- **LCP 4.2s → 1.8s**: Image format switch (JPEG→AVIF), preload, `fetchpriority="high"`, CDN with edge caching, responsive sizes
- **INP 320ms → 95ms**: Code splitting eliminated 62% of main-thread work, `requestIdleCallback` for non-critical imports, `date-fns` replaced `moment`
- **CLS 0.25 → 0.03**: `aspect-ratio` on all images, `font-display: optional` eliminated font shift, `min-height` on ad slot
- **TTFB 950ms → 180ms**: CDN edge caching, ISR with 60s revalidate, parallel `Promise.all()` eliminated server waterfall
- **Bundle 580 KB → 148 KB**: Dynamic imports split 10 chunks, removed `moment` and full `lodash`, tree-shaking enabled

---

## 9. What NOT to Do — Anti-Patterns

### LCP Anti-Patterns

```
DO NOT:
├── Set loading="lazy" on the LCP element
├── Load the LCP image via JavaScript (it's discovered too late)
├── Use a spinner as the main page content (spinner becomes the LCP)
├── Preload dozens of resources (dilutes priority)
├── Host LCP image on a different origin without preconnect
├── Use massive images (2MB+) for hero — target < 200 KB
├── Rely on client-side rendering for LCP content
```

```html
<!-- Bad: LCP image is lazy-loaded (discovered after all JS parses) -->
<img src="/hero.jpg" loading="lazy" alt="Hero">

<!-- Bad: preloading everything dilutes LCP priority -->
<link rel="preload" href="/hero.avif" as="image">
<link rel="preload" href="/logo.svg" as="image">
<link rel="preload" href="/font1.woff2" as="font" crossorigin>
<link rel="preload" href="/font2.woff2" as="font" crossorigin>
<link rel="preload" href="/styles.css" as="style">

<!-- Good: only preload the LCP image + critical font -->
<link rel="preload" href="/hero.avif" as="image" fetchpriority="high">
<link rel="preload" href="/fonts/heading.woff2" as="font" type="font/woff2" crossorigin>
```

### INP Anti-Patterns

```
DO NOT:
├── Assume setTimeout(fn, 0) breaks up long tasks (it doesn't always; use requestIdleCallback)
├── Use React.memo everywhere (over-memoizing costs more than it saves)
├── Animate width, height, top, left, or margin (triggers layout)
├── Read from the DOM in a loop while also writing to it (layout thrashing)
├── Set state in a scroll handler without rAF batching
├── Defer everything — the initial interaction still needs fast response
├── Add event listeners to document without { passive: true } for scroll/wheel
```

```javascript
// Bad: this still blocks the main thread
function badLongTask(items) {
  items.forEach(item => {
    setTimeout(() => {
      heavyWork(item); // still runs on main thread, just deferred
    }, 0);
  });
}

// Better: yields between chunks
async function betterLongTask(items) {
  for (let i = 0; i < items.length; i += 50) {
    const chunk = items.slice(i, i + 50);
    chunk.forEach(item => heavyWork(item));
    await new Promise(r => setTimeout(r, 0)); // actual yield
  }
}

// Best: moves work off the main thread entirely
const worker = new Worker(new URL('./heavy-worker.js', import.meta.url));
worker.postMessage(items);
```

### CLS Anti-Patterns

```
DO NOT:
├── Insert dynamic content above existing content (ads, banners, notifications)
├── Use font-display: block on non-critical text
├── Animate using CSS properties that trigger layout (height, width, padding, margin, top, left)
├── Use infinite scroll that prepends content
├── Load third-party widgets without reserving space
├── Set image dimensions via CSS only (use HTML width/height attributes)
├── Use display: none → display: block to toggle (use visibility or opacity)
```

```html
<!-- Bad: top banner injected after load pushes everything down -->
<div id="dynamic-banner"></div>
<script>
  fetch('/banner').then(res => res.text()).then(html => {
    document.getElementById('dynamic-banner').innerHTML = html; // CLS!
  });
</script>

<!-- Good: reserve space, only collapse if empty -->
<div id="dynamic-banner" style="min-height: 60px;"></div>
<script>
  fetch('/banner').then(res => res.text()).then(html => {
    const container = document.getElementById('dynamic-banner');
    container.innerHTML = html;
    if (!html.trim()) container.style.minHeight = '0';
  });
</script>
```

```html
<!-- Bad: prepending to list causes all visible items to shift down -->
<!-- Infinite scroll appending items above the viewport -->

<!-- Good: always append below existing content -->
```

### General Anti-Patterns

```
DO NOT:
├── Optimize without measuring first (premature optimization)
├── Measure only on desktop with fast internet
├── Trust a single Lighthouse run (always use 3+ runs, take median)
├── Optimize for lab metrics only (validate with RUM data)
├── Add more caching layers without measuring hit rates
├── gzip when Brotli is available (Brotli is 15-20% smaller)
├── Serve full libraries when you need 1-2 functions (tree-shake or use native)
├── Use `import *` from barrel files (prevents tree-shaking)
├── Assume SSR alone fixes LCP (you still need optimized resources)
├── Forget to test on actual slow devices (Moto G4, low-end Android)
```

```javascript
// Bad: importing entire library for one function
import lodash from 'lodash';
const uniqueItems = lodash.uniq(items);

// Bad: barrel import prevents tree-shaking
import { Button, Modal, Card, Table } from '@company/ui'; // loads everything

// Good: named import with tree-shaking support
import uniq from 'lodash/uniq';

// Good: direct file import (most tree-shakeable)
import { Button } from '@company/ui/Button';
import { Modal } from '@company/ui/Modal';

// Even better: use native when possible
const uniqueItems = [...new Set(items)];
```

```javascript
// Bad: no error handling on performance observers
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    sendToAnalytics(entry); // what if this throws?
  });
});

// Good: wrapped in try/catch
const observer = new PerformanceObserver((list) => {
  try {
    list.getEntries().forEach((entry) => {
      sendToAnalytics(entry);
    });
  } catch (e) {
    console.warn('Performance observer error:', e);
  }
});
```

---

## Quick Reference Card

```
RECIPE: Fix an LCP problem

1. Identify LCP element
   DevTools → Performance → Timings → LCP marker
   (The element that is the LCP candidate)

2. Check the LCP sub-parts
   TTFB       — server time (target < 800ms)
   Load Delay — time until resource starts loading (target < 100ms)
   Load Time  — download duration (target < 500ms)
   Render Delay — time from download to paint (target < 200ms)

3. Fix the biggest sub-part
   TTFB high       → CDN, caching, SSR
   Load Delay high  → Preload, fetchpriority, eliminate render-blocking
   Load Time high   → Optimize image, use CDN, responsive sizes
   Render Delay high → Reduce JS/CSS on critical path

RECIPE: Fix an INP problem

1. Identify the interaction causing high INP
   web-vitals attribution: onINP with { reportAllChanges: true }

2. Check the three sub-parts
   Input Delay       — time from interaction to event handler start
   Processing Time   — time in event handler + triggered work
   Presentation Delay — time from render to next paint

3. Fix the biggest sub-part
   Input Delay high     → Break up long tasks, defer non-critical JS
   Processing Time high  → Optimize handler code, Web Worker, avoid layout thrashing
   Presentation Delay high → Reduce DOM size, use transform animations only

RECIPE: Fix a CLS problem

1. Identify the shifting element
   DevTools → Rendering → Layout Shift Regions
   Chrome DevTools → Performance → Experience → Layout Shifts

2. Determine the cause
   Image without dimensions → Add width/height + aspect-ratio
   Late-loading content    → Reserve space (min-height), skeleton screens
   Font shift              → font-display: optional + size-adjust
   Animation               → Use transform/opacity only
   Dynamic injection       → Reserve space before injection

3. Verify fix
   Measure CLS before and after with web-vitals
```

---

## References

- [Web Vitals — Google](https://web.dev/vitals/)
- [LCP Optimization Guide](https://web.dev/optimize-lcp/)
- [INP Optimization Guide](https://web.dev/optimize-inp/)
- [CLS Optimization Guide](https://web.dev/optimize-cls/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [web-vitals npm package](https://www.npmjs.com/package/web-vitals)
- [Chrome UX Report](https://developer.chrome.com/docs/crux/)
- [WebPageTest](https://www.webpagetest.org/)
