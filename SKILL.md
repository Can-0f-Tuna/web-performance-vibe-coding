---
name: web-performance-vibe-coding
description: Implement extreme web performance optimizations using "vibe coding" techniques - bundle optimization, intelligent prefetching, multi-layered caching, streaming, DOM discipline, WebSocket architecture, and service workers. Use when building fast React apps, optimizing bundle sizes, implementing caching strategies, or creating performance-focused financial/AI apps.
triggers:
  - "optimize web performance"
  - "reduce bundle size"
  - "implement prefetching"
  - "caching strategy"
  - "streaming optimization"
  - "DOM performance"
  - "service worker"
  - "vibe coding"
  - "fast React app"
  - "core web vitals"
  - "LCP optimization"
  - "CLS fix"
  - "image optimization"
  - "database performance"
---

# Web Performance Vibe Coding

Apply extreme performance techniques to build blazing-fast web applications through AI-guided optimization.

## When to Use

Activate this skill when:
- Building new performance-focused applications (financial, dashboard, real-time)
- Refactoring existing apps for speed optimization
- Implementing specific techniques: bundle splitting, caching, prefetching, streaming
- Creating AI-powered apps requiring fast data interactions
- Following "vibe coding" workflow (AI-directed via natural language prompts)
- Core Web Vitals are poor and need systematic improvement
- Image loading is slow or causing layout shifts
- Database queries or API responses are bottlenecking

## Core Philosophy

**"Measure first. Optimize second. There's no magic — just tell the AI what you want it to do."**

Combine deep engineering intuition with AI leverage to achieve meticulous optimization. Performance work without measurement is guessing — profile first, identify the actual bottleneck, fix it, measure again. The AI implements micro-optimizations while you focus on vision and architectural decisions.

### The 5-Step Optimization Cycle

```
MEASURE → IDENTIFY → FIX → VERIFY → GUARD
```

1. **Measure**: Lighthouse, Core Web Vitals, bundle analyzers, network waterfall — get baselines
2. **Identify**: Pinpoint the actual bottleneck. Large bundles? Slow server? Layout thrashing?
3. **Fix**: Apply the specific technique for that bottleneck. One thing at a time.
4. **Verify**: Re-measure. Did it improve? By how much? On real devices with real network conditions.
5. **Guard**: Add performance budgets to CI. Prevent regressions.

### When NOT to Optimize

- Without measurement data (premature optimization is waste)
- Without a specific bottleneck identified
- When the fix sacrifices readability/maintainability for negligible gain
- When users won't notice the difference
- Desktop-only optimization — always test on mobile, slow CPU, throttled network

## Quick Start: 7 Performance Strategies

### 1. Bundle Size and Cold-Start Optimization

**Target:** Main JS bundle under 150 KB for instant cold starts.

**Actions:**
- Replace heavy dependencies with custom-tailored libraries (moment → date-fns: saves 55KB)
- Import only what you need (`import debounce from 'lodash/debounce'` not `import _ from 'lodash'`)
- Implement lazy code splitting with `modulepreload` hints
- Inline critical CSS to eliminate render-blocking
- Add middleware-level cookie checks for routing
- Set `"sideEffects": false` in package.json for tree shaking
- Use native alternatives: `[...new Set(array)]` instead of lodash uniq

**Key Result:** 150 KB bundle (gzipped) for full-featured React app. 114 KB is the aspirational ceiling—achievable after all optimizations in a focused financial app context.

**Prompt Template:**
> "Optimize this React app for minimal bundle size. Replace heavy libraries with lightweight alternatives. Implement code splitting with modulepreload. Inline critical CSS. Target bundle under 150 KB."

→ [Full implementation guide](./references/bundle-optimization.md)

### 2. Intelligent Prefetching and Intent-Based Loading

**Principle:** Turn reactive loading into proactive performance.

**Actions:**
- Preload critical routes/APIs on login intent detection
- Preload 7+ essential APIs on page mount with WebSocket preconnect
- Implement hover-based prefetching for tickers, chat, navigation
- Fetch data in parallel on page load (charts, financials, Reddit)
- Use `<link rel="preconnect">` for cross-origin resources
- Use `<link rel="preload">` with `fetchpriority="high"` for LCP images

**Prompt Template:**
> "Implement intent-based prefetching. Preload essential APIs on page mount. Add hover prefetching for interactive elements. Make navigation feel instantaneous."

→ [Implementation patterns](./references/intelligent-prefetching.md)

### 3. Multi-Layered Caching Strategy

**Goal:** Fresh data without latency through tiered caching.

**Actions:**
- Configure SWR with cache lifetimes (30s to 1 day)
- Implement localStorage + React Query hydration for price data
- Add Redis cache-aside pattern for API responses (1-5 min TTL)
- Add Gemini context cache (30-minute KV store) for AI features
- Share AI-generated summaries and chart data across components
- Set proper Cache-Control headers: `immutable` for hashed assets (1y), `stale-while-revalidate` for unhashed
- Use `Cache-Control: public, max-age=300, stale-while-revalidate=3600` for API responses
- Enable Brotli compression (15-20% smaller than gzip) on your CDN or reverse proxy

**Prompt Template:**
> "Build a multi-layered caching system. Use SWR with configurable TTL. Add Redis caching for API routes. Add localStorage hydration. Share cached data across the app. Target 5-minute data freshness."

→ [Caching architecture](./references/multi-layered-caching.md)

### 4. True Streaming and Parallel Execution

**Focus:** Make AI interactions and data operations feel snappy.

**Actions:**
- Implement real token streaming (not fake chunking)
- Add anti-buffering headers for chat features
- Use parallel tool calls and batched prompts on backend
- Batch client-side APIs over single endpoint
- Use HTTP/2 or HTTP/3 for multiplexing

**Prompt Template:**
> "Implement true streaming for AI chat. Add anti-buffering headers. Use parallel tool calls. Make complex flows feel uninterrupted."

→ [Streaming implementation](./references/streaming-optimization.md)

### 5. Rendering and DOM Discipline

**Target:** Zero jank, immediate paint, responsive under load.

**Actions:**
- Lazy-load charts with reserved height (prevent layout shifts)
- Implement tab-level lazy loading
- Memoize list items and expensive renders
- Keep DOM structure lightweight — flatter is faster
- Use `content-visibility: auto` for rendering off-screen long lists
- Use CSS `contain` property for independent layout regions
- Enable instant repaints on cache hits
- Use `React.memo`, `useMemo`, `useCallback` appropriately (not blindly everywhere)

**Prompt Template:**
> "Optimize rendering and DOM structure. Lazy-load charts with reserved space. Memoize expensive renders. Add content-visibility for long lists. Keep DOM lightweight. Eliminate jank."

→ [DOM optimization](./references/dom-discipline.md)

### 6. Shared WebSocket Architecture

**Approach:** Single intelligent connection for real-time updates.

**Actions:**
- Use one shared WebSocket instance across app
- Implement smart reconnect logic gated by page visibility
- Prefetch data immediately upon WebSocket connection
- Handle live financial/real-time data efficiently

**Prompt Template:**
> "Build a shared WebSocket architecture. Single connection across app. Smart reconnect on visibility change. Prefetch data on connection. Handle real-time updates efficiently."

→ [WebSocket patterns](./references/websocket-architecture.md)

### 7. Service Worker and Offline-First Shell

**Goal:** Native-like experience, instant shell load.

**Actions:**
- Precache app shell for instant load
- Use NetworkFirst navigation with 3-second timeout fallback
- Implement long-term caching (30 days) for fonts
- Register service worker on idle
- Use cache-first strategy for static assets (images, styles, scripts)
- Implement facade pattern for third-party embeds — show static preview, load heavy widget on click

**Prompt Template:**
> "Implement service worker with offline-first shell. Precache app shell. NetworkFirst navigation with timeout. Long-term font caching. Register on idle."

→ [PWA implementation](./references/service-worker-offline.md)

**Important:** Don't try to implement all 7 at once. Profile your app, identify the ONE biggest bottleneck, and implement the matching strategy. Re-measure. Repeat.

---

## Measurement-First Philosophy

**"Measure on real devices with real network conditions. Desktop Chrome with fast connection isn't representative."**

### What to Measure

| Category | Tools | What You Get |
|----------|-------|--------------|
| Core Web Vitals | Lighthouse, `web-vitals`, CrUX | LCP, INP, CLS |
| Bundle Size | vite-bundle-visualizer / webpack-bundle-analyzer, Bundlephobia | What's bloating your JS |
| Network | Chrome DevTools, WebPageTest | Waterfall, TTFB, request count |
| Runtime | Performance panel, React Profiler | Frame rate, long tasks, re-renders |
| Backend | APM tools, `console.time`, EXPLAIN ANALYZE | Query latency, N+1 patterns |
| Real Users | RUM (Sentry, Datadog, Google Analytics) | P75/P95 metrics from actual users |

### Critical: Synthetic vs RUM

- **Synthetic (Lighthouse, WebPageTest)**: Reproducible, good for before/after comparisons, CI integration. Run with mobile throttling.
- **RUM (Real User Monitoring)**: Shows what actual users experience. Use `web-vitals` library. CrUX data in Search Console validates.
- **Always use both**: Synthetic catches regressions; RUM validates real-world impact.

### Lighthouse CLI

```bash
# Single run with mobile throttling
lighthouse https://example.com --output html --output-path report.html

# CI integration
lighthouse https://example.com --output json --output-path report.json --throttling.cpuSlowdownMultiplier=4

# Performance budget enforcement
npx bundlesize
npx lhci autorun
```

### Web Vitals in Code

```typescript
import { onLCP, onINP, onCLS } from 'web-vitals';

function sendToAnalytics(metric: { name: string; value: number; rating: string }) {
  // Send to Google Analytics, Datadog, Sentry, etc.
  console.log(metric);
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
```

---

## Core Web Vitals Deep Reference

### LCP (Largest Contentful Paint) — Target: ≤ 2.5s

LCP measures when the largest content element becomes visible. Primarily affected by server response time, render-blocking resources, and image loading.

**Diagnostic:**
- Slow LCP + slow TTFB → Server/network issue (DNS, TCP/TLS, backend processing, CDN)
- Slow LCP + fast TTFB → Render-blocking CSS/JS, unoptimized hero image
- Slow LCP on mobile only → Large images loaded for desktop resolution on mobile

**Fixes:**
- Preload LCP image with `fetchpriority="high"`
- Use `<picture>` with modern formats (AVIF → WebP → JPEG cascade)
- Inline critical CSS, defer non-critical CSS
- Use SSR/SSG for content-heavy pages, or ISR with `revalidate`
- Set explicit `width`/`height` attributes on the LCP image
- Host LCP image on same origin (no cross-origin connection delay)

### INP (Interaction to Next Paint) — Target: ≤ 200ms

INP replaces FID. Measures the latency of all user interactions throughout the page lifecycle. It's the worst-case response to clicks, taps, and keyboard inputs.

**Diagnostic:**
- High INP consistently → Main thread is too busy
- INP spikes during scroll → Expensive scroll handlers, layout thrashing
- INP spikes after data fetch → Large React re-renders on state update

**Fixes:**
- Break up long tasks (< 50ms per task)
- Use `requestAnimationFrame` for visual updates, `requestIdleCallback` for non-critical work
- Debounce/throttle scroll and resize handlers
- Defer non-critical JS with `window.addEventListener('load', ...)`
- Use web workers for heavy computation
- Avoid layout thrashing (batch DOM reads before DOM writes)

### CLS (Cumulative Layout Shift) — Target: ≤ 0.1

CLS measures visual stability. Every unexpected shift of visible elements adds to the score.

**Diagnostic:**
- High CLS on load → Images without dimensions, dynamically injected content, font swaps
- High CLS during interaction → Animations using layout properties

**Fixes:**
- Set explicit `width`/`height` on all images and videos
- Use CSS `aspect-ratio` property as fallback
- Reserve space for ads/embeds with min-height containers
- Use skeleton screens or placeholders for async content
- Use `font-display: optional` or `swap` + `size-adjust` for web fonts
- Never inject content above existing content
- Avoid animating width/height/top/left — use `transform` instead

→ [Full Core Web Vitals guide](./references/core-web-vitals.md)

---

## Image Optimization Complete Guide

### Format Selection

| Format | Best For | Quality Setting |
|--------|----------|-----------------|
| AVIF | Photos, hero images | 70% (best compression) |
| WebP | Photos, fallback format | 80% |
| JPEG | Universal fallback | 80%, progressive encoding |
| PNG | Graphics with transparency | Optimize with lossless tools |
| SVG | Icons, logos, illustrations | Minify with SVGO |

### The Complete Responsive Picture Pattern

```html
<picture>
  <source 
    type="image/avif"
    srcset="hero-400.avif 400w, hero-800.avif 800w, hero-1200.avif 1200w"
    sizes="(max-width: 768px) 100vw, 50vw">
  <source 
    type="image/webp"
    srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
    sizes="(max-width: 768px) 100vw, 50vw">
  <img 
    src="hero-800.jpg"
    srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w"
    sizes="(max-width: 768px) 100vw, 50vw"
    width="1200" 
    height="600"
    alt="Hero image"
    loading="lazy"
    decoding="async">
</picture>
```

### LCP Image — Above Fold (Load Immediately)

```html
<img 
  src="hero.webp" 
  fetchpriority="high" 
  loading="eager" 
  decoding="sync"
  width="1200" 
  height="600" 
  alt="Hero">
```

### Below Fold — Lazy Load

```html
<img 
  src="product.webp" 
  loading="lazy" 
  decoding="async"
  width="400" 
  height="300" 
  alt="Product">
```

### Sharp Build-Time Conversion Script

```javascript
const sharp = require('sharp');

async function optimizeImage(inputPath, outputDir) {
  const filename = path.basename(inputPath, path.extname(inputPath));
  await sharp(inputPath)
    .resize(1200, 600, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(path.join(outputDir, `${filename}.webp`));
  await sharp(inputPath)
    .resize(1200, 600, { fit: 'cover' })
    .avif({ quality: 70 })
    .toFile(path.join(outputDir, `${filename}.avif`));
  await sharp(inputPath)
    .resize(1200, 600, { fit: 'cover' })
    .jpeg({ quality: 80, progressive: true })
    .toFile(path.join(outputDir, `${filename}.jpg`));
}
```

### Next.js Image Component

```tsx
// Above-fold priority image (LCP)
<Image 
  src="/hero.jpg" 
  alt="Hero" 
  width={1200} 
  height={600} 
  priority 
  quality={80} 
/>

// Below-fold lazy image
<Image 
  src="/product.jpg" 
  alt="Product" 
  width={400} 
  height={300} 
  loading="lazy" 
/>
```

→ [Complete image optimization guide](./references/image-optimization.md)

---

## Perceived Performance: Making Things FEEL Fast

Performance isn't just timings — it's user psychology. What users *perceive* is often more important than what stopwatches measure.

### The 80ms Neural Threshold

Our brains buffer sensory input for ~80ms to synchronize perception. Anything under 80ms feels instant and simultaneous. This is your target for all micro-interactions (button presses, toggles, hover responses).

### Optimistic UI

Update the interface immediately, handle failures gracefully. The user sees instant response — the system reconciles in the background.

```typescript
// Optimistic like button
function handleLike() {
  setLiked(true);                          // Update UI instantly
  setLikeCount(prev => prev + 1);
  
  try {
    await api.likePost(postId);            // Persist in background
  } catch {
    setLiked(false);                       // Rollback on failure
    setLikeCount(prev => prev - 1);
  }
}
```

**When to use:** Low-stakes actions (likes, follows, toggles). **Never for:** Payments, deletions, destructive operations.

### Skeleton Screens > Spinners

Generic spinners feel slower than skeleton screens because skeletons preview content layout and give the brain something to track.

```css
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Active vs Passive Time

Passive waiting (staring at a spinner) feels significantly longer than active engagement.
- **Preemptive start**: Begin transitions immediately, even before data arrives (iOS app zoom effect)
- **Early completion**: Show content progressively — don't wait for everything to load
- **Stream data**: Token-by-token feels faster than waiting for full response

### Duration Rules for UI Animations

| Duration | Use Case |
|----------|----------|
| 100-150ms | Instant feedback (button press, toggle) |
| 200-300ms | State changes (menu open, hover) |
| 300-500ms | Layout changes (accordion, modal open) |
| 500-800ms | Entrance animations (page load) |

Exit animations should be ~75% of enter duration.

→ [Full perceived performance guide](./references/perceived-performance.md)

---

## Animation & Rendering Performance

### GPU-Accelerated Properties (60fps Safe)

```css
/* Compositor-only — no layout or paint */
transform: translateX(100px);
transform: scale(1.1);
transform: rotate(5deg);
opacity: 0.5;
```

### Properties That Trigger Layout (AVOID animating)

```css
/* Forces layout recalculation — causes jank */
width, height, top, left, right, bottom
margin, padding
border-width
```

### CSS Containment for Independent Regions

```css
.widget {
  contain: layout style paint; /* Isolates this element's rendering */
}

.long-list-item {
  content-visibility: auto;           /* Skip rendering off-screen content */
  contain-intrinsic-size: 0 200px;    /* Placeholder height estimate */
}
```

### Layout Thrashing Prevention

```javascript
// BAD: Alternating reads and writes — forces reflow each iteration
elements.forEach(el => {
  const h = el.offsetHeight;   // READ — browser must calculate layout
  el.style.height = h * 2;      // WRITE — invalidates layout
});

// GOOD: Batch all reads, then batch all writes
const heights = elements.map(el => el.offsetHeight);  // Phase 1: All reads
elements.forEach((el, i) => {
  el.style.height = heights[i] * 2;                    // Phase 2: All writes
});
```

### React-Specific Rendering

```tsx
// Stable references for objects/arrays passed as props
const DEFAULT_OPTIONS = { sortBy: 'date', order: 'desc' } as const;

// useMemo for expensive computations
const filtered = useMemo(
  () => products.filter(p => p.category === category),
  [products, category]
);

// React.memo for expensive components
const ProductList = React.memo(({ products }) => { /* ... */ });
```

### Easing Curves for Natural Motion

```css
/* Use these, never "ease" or "ease-in-out" defaults */
--ease-out: cubic-bezier(0.25, 1, 0.5, 1);       /* Smooth deceleration */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);   /* Snappy, confident */
--ease-in: cubic-bezier(0.7, 0, 0.84, 0);         /* For exit animations */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);    /* For toggles */
```

---

## Database & Backend Performance

### Fix N+1 Queries

```typescript
// BAD: 101 queries for 100 posts
const posts = await db.post.findMany();
for (const post of posts) {
  const author = await db.user.findUnique({ where: { id: post.authorId } });
}

// GOOD: 1 query with eager loading
const posts = await db.post.findMany({ include: { author: true } });
```

### Add Database Indexes

```sql
-- Find slow queries first
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- Add strategic indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
```

### Redis Cache-Aside Pattern

```typescript
async function getUserProfile(userId: string) {
  // 1. Check cache
  const cached = await redis.get(`user:${userId}`);
  if (cached) return JSON.parse(cached);
  
  // 2. Query database
  const user = await db.user.findUnique({ where: { id: userId } });
  
  // 3. Store in cache (1 hour TTL)
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(user));
  
  return user;
}
```

### Paginate Everything

```typescript
// Never return unbounded results
const results = await db.post.findMany({
  take: 20,
  skip: (page - 1) * 20,
  orderBy: { createdAt: 'desc' },
});
```

### HTTP Cache-Control Headers by Asset Type

```
# Static assets with content hash — immutable, 1 year
Cache-Control: public, max-age=31536000, immutable

# Static assets without hash — 1 day + stale-while-revalidate
Cache-Control: public, max-age=86400, stale-while-revalidate=604800

# API responses — short cache, private
Cache-Control: public, max-age=300, stale-while-revalidate=3600

# HTML — never cache, always validate
Cache-Control: no-cache, must-revalidate
```

→ [Full backend performance guide](./references/database-backend-performance.md)

---

## Performance Budget Template

| Resource | Budget |
|----------|--------|
| Total page weight | < 1.5 MB |
| JavaScript (initial, gzipped) | < 200 KB |
| CSS (gzipped) | < 50 KB |
| Images above fold | < 500 KB total |
| Fonts | < 100 KB total |
| API response (p95) | < 200ms |
| Time to Interactive | < 3.8s on 4G |
| Lighthouse score | ≥ 90 |

Enforce in CI: `npx bundlesize` for JS budget, `npx lhci autorun` for Lighthouse.

---

## Common Anti-Patterns

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Slow LCP | Unoptimized hero image, render-blocking CSS | `<picture>` + avif, inline critical CSS, `fetchpriority="high"` |
| High CLS | Images without dimensions, injected content | `width`/`height` attributes, `aspect-ratio`, skeleton placeholders |
| Poor INP | Long tasks (>50ms), layout thrashing | Break up tasks, batch DOM reads/writes, debounce handlers |
| Slow initial load | Large bundle, many requests | Code split, tree shake, dynamic imports, remove unused deps |
| Slow API | N+1 queries, missing indexes, no cache | Eager loading, CREATE INDEX, Redis cache-aside |
| Memory growth | Leaked listeners, unbounded caches | Clean up in useEffect return, set cache size limits |
| Desktop fast, mobile slow | No mobile testing | Test with `--throttling.cpuSlowdownMultiplier=4`, real devices |

### Common Rationalizations (Don't Fall for These)

- "We'll optimize later" → Performance debt compounds exponentially
- "It's fast on my machine" → Test on representative hardware and networks
- "This optimization is obvious" → If you didn't measure, you don't know
- "Users won't notice 100ms" → Research shows conversion impact at 100ms
- "The framework handles performance" → Frameworks can't fix N+1 queries or bundle bloat

---

## Font Performance

### Font Loading Strategy

```css
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;        /* Show fallback immediately, swap when loaded */
  unicode-range: U+0020-007F; /* Subset: Basic Latin only — saves KB */
}
```

### Preload Critical Fonts

```html
<!-- crossorigin is REQUIRED even for same-origin — otherwise browser fetches twice -->
<link rel="preload" href="/fonts/heading.woff2" as="font" type="font/woff2" crossorigin>
```

### System Font Stack Fallback

```css
body {
  font-family: 'Custom Font', -apple-system, BlinkMacSystemFont, 
               'Segoe UI', Roboto, sans-serif;
}
```

### Variable Fonts — Single File for All Weights

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
}
```

---

## Third-Party Script Management

### Async for Analytics

```html
<script async src="https://analytics.example.com/script.js"></script>
```

### Post-Load Injection (Lowest Priority)

```javascript
window.addEventListener('load', () => {
  const script = document.createElement('script');
  script.src = 'https://widget.example.com/embed.js';
  script.async = true;
  document.body.appendChild(script);
});
```

### Facade Pattern — Click to Load Embeds

```html
<!-- Lightweight placeholder replaces heavy embed until user clicks -->
<div class="youtube-facade" onclick="loadYouTube(this)" data-video-id="abc123">
  <img src="/thumbnails/abc123.jpg" alt="Video title">
  <button aria-label="Play video">▶</button>
</div>
```

---

## Vibe Coding Workflow

### Terminal-Based Development

1. **Minimal Setup:** Run AI directly in macOS Terminal (or equivalent)
2. **Precise Prompts:** Issue high-level, performance-focused instructions
3. **Diff Review:** Skim terminal diffs rather than reading full codebase
4. **Verify AI suggestions:** The model may surface optimizations, but always measure before and after implementing them

### Effective Prompting Patterns

**Performance-Focused:**
- "Make this component render instantly"
- "Eliminate layout shift in this chart"
- "Reduce this API call's latency"
- "Cache this data for 5 minutes"
- "Batch all DOM reads before writes to prevent layout thrashing"

**Architecture-Focused:**
- "Implement tiered caching for this data"
- "Add hover prefetching to these elements"
- "Stream these AI responses token-by-token"
- "Share this WebSocket across the app"
- "Fix N+1 queries in this API route using eager loading"

**Optimization-Focused:**
- "Profile this page and identify the top 3 bottlenecks"
- "Add a Redis cache layer for this endpoint"
- "Replace moment.js with date-fns tree-shakeable imports"
- "Add image srcset with AVIF/WebP/JPEG format cascade"

---

## Tooling Recommendation: Use Bun

**Why Bun:**
- **3x faster package installs** than npm (critical for iteration speed)
- **4x faster script execution** (faster dev server and builds)
- **Native TypeScript support** (no transpilation step)
- **Built-in bundler** (optional alternative to Vite for even smaller bundles)
- **Compatible with npm packages** (drop-in replacement)

**Commands:**
```bash
bun install          # Instead of: npm install
bun run dev          # Instead of: npm run dev
bun run build        # Instead of: npm run build
bunx <package>       # Instead of: npx <package>
```

---

## Complete Implementation Example

Build the fastest financial app in a weekend:

```
1. Initialize React app with Bun (bun create vite)
2. Implement bundle optimization (114 KB target)
3. Add intelligent prefetching for all navigation
4. Configure multi-layered caching (SWR + localStorage + Redis + KV)
5. Enable true streaming for AI features
6. Optimize DOM with lazy charts, content-visibility, and memoization
7. Build shared WebSocket for real-time data
8. Add service worker with offline-first shell
9. Optimize images with Sharp pipeline (AVIF, WebP, JPEG, srcset)
10. Add database indexes and Redis caching
11. Set up Lighthouse CI with performance budgets
```

→ [Complete weekend build guide](./references/complete-implementation.md)

---

## Key Metrics to Track

- **Bundle Size:** Main JS under 150 KB (gzipped)
- **Time to First Byte (TTFB):** Under 200ms (CDN/edge), Under 800ms (origin)
- **First Contentful Paint (FCP):** Under 1.8s
- **Largest Contentful Paint (LCP):** Under 2.5s
- **Interaction to Next Paint (INP):** Under 200ms
- **Cumulative Layout Shift (CLS):** Under 0.1
- **Time to Interactive (TTI):** Under 3.8s on 4G. Note: INP (Interaction to Next Paint) is now the primary interactivity metric in Core Web Vitals.
- **Cache Hit Rate:** 80%+ for cached data
- **WebSocket Reconnect Time:** Under 500ms
- **Lighthouse Score:** 90+

---

## Navigation

### Strategy Implementation
- **[📦 Bundle Optimization](./references/bundle-optimization.md)** — Dependency replacement, code splitting, tree shaking, critical CSS inlining
- **[⚡ Intelligent Prefetching](./references/intelligent-prefetching.md)** — Intent detection, hover prefetching, parallel loading, preconnect
- **[💾 Multi-Layered Caching](./references/multi-layered-caching.md)** — SWR, localStorage, Redis, HTTP headers, stale-while-revalidate
- **[🌊 Streaming Optimization](./references/streaming-optimization.md)** — True streaming, anti-buffering, parallel execution
- **[🎨 DOM Discipline](./references/dom-discipline.md)** — Lazy loading, memoization, layout thrashing, CSS containment, content-visibility
- **[🔌 WebSocket Architecture](./references/websocket-architecture.md)** — Shared connections, reconnect logic, real-time data
- **[📱 Service Worker & PWA](./references/service-worker-offline.md)** — Offline shell, cache strategies, facade pattern
- **[🖼️ Image Optimization](./references/image-optimization.md)** — AVIF/WebP/JPEG cascade, srcset, Sharp pipeline, LCP optimization
- **[📊 Core Web Vitals](./references/core-web-vitals.md)** — Diagnostic decision trees, fix patterns, measurement methodology
- **[⚡ Perceived Performance](./references/perceived-performance.md)** — 80ms threshold, optimistic UI, skeleton screens, animation timing
- **[🗄️ Database & Backend](./references/database-backend-performance.md)** — N+1 fixes, indexes, Redis cache-aside, pagination, HTTP caching

### Complete Guides
- **[🏗️ Complete Implementation](./references/complete-implementation.md)** — Weekend build walkthrough, step-by-step integration
- **[🧠 Vibe Coding Techniques](./references/vibe-coding-workflow.md)** — Terminal workflow, effective prompting, AI collaboration

---

## Key Reminders

- **Measure first:** Never optimize without profiling data
- **Start minimal:** Strip everything unnecessary before adding features
- **Measure obsessively:** Track bundle size, load times, cache hit rates
- **Compound gains:** Small optimizations stack into massive speed improvements
- **Verify AI suggestions:** The model surfaces optimizations you might overlook — always measure before and after implementing them
- **Work in terminal:** Minimal setup keeps focus on architecture, not tooling
- **Keep it light:** "An obsession with keeping things light, simple, and fast compounds"
- **Test on mobile:** Desktop Chrome with fast connection isn't representative
- **A single Lighthouse run is noisy** (stddev ~15%). Run 3–5 times and take the median.
- **Guard against regressions:** Performance budgets in CI prevent backsliding

**Result:** The fastest app you've ever built — instant loads, zero stale data, pure interactions.
