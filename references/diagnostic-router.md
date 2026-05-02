# Performance Diagnostic Router

Map symptoms → measurement → root cause → reference file.

## "My page loads slowly"
→ Run Lighthouse. Measure LCP, TTFB.
→ If TTFB > 800ms → [Database & Backend Performance](./database-backend-performance.md) — start with N+1 query check and indexing
→ If LCP > 2.5s AND TTFB is fine → [Image Optimization](./image-optimization.md) OR [Bundle Optimization](./bundle-optimization.md) — check hero image and render-blocking resources
→ If CLS > 0.1 → [Core Web Vitals](./core-web-vitals.md) CLS section OR [DOM Discipline](./dom-discipline.md)
→ If FCP > 1.8s → [Core Web Vitals](./core-web-vitals.md) — check critical rendering path

## "Interactions feel sluggish / clicks lag"
→ Measure INP with web-vitals.
→ If INP > 200ms → [DOM Discipline](./dom-discipline.md) — check layout thrashing, long tasks, React re-renders
→ If scroll jank → [DOM Discipline](./dom-discipline.md) — check scroll handlers, content-visibility

## "Bundle is too large"
→ Run bundle analyzer (vite-bundle-visualizer or webpack-bundle-analyzer)
→ [Bundle Optimization](./bundle-optimization.md) — tree shaking, code splitting, dependency replacement

## "API calls are slow"
→ Measure with console.time or APM
→ [Database & Backend Performance](./database-backend-performance.md) — N+1 queries, missing indexes, Redis caching, pagination

## "Images are loading slowly / causing layout shifts"
→ Check Lighthouse image audit
→ [Image Optimization](./image-optimization.md) — format cascade, srcset, lazy loading, LCP preload

## "App feels slow even though metrics are good"
→ [Perceived Performance](./perceived-performance.md) — optimistic UI, skeleton screens, animation timing, 80ms threshold

## "Real-time data is stale or connection drops"
→ [WebSocket Architecture](./websocket-architecture.md) — state machine, heartbeat, reconnection

## "App doesn't work offline"
→ [Service Worker & PWA](./service-worker-offline.md) — cache strategies, offline shell

## "I need to cache data aggressively"
→ [Multi-Layered Caching](./multi-layered-caching.md) — SWR, localStorage, Redis, HTTP headers

## "AI/chat streaming is slow"
→ [Streaming Optimization](./streaming-optimization.md) — true streaming, anti-buffering, SSE

## Quick Decision Table

| User says | Measure | First read | Second read |
|-----------|---------|------------|-------------|
| "Page loads slowly" | LCP, TTFB, FCP | core-web-vitals.md | image-optimization.md or bundle-optimization.md |
| "Clicks feel sluggish" | INP | dom-discipline.md | core-web-vitals.md |
| "Layout is jumpy" | CLS | dom-discipline.md | image-optimization.md |
| "Bundle is huge" | bundle size | bundle-optimization.md | — |
| "API is slow" | response time | database-backend-performance.md | multi-layered-caching.md |
| "Images are slow" | image weight | image-optimization.md | perceived-performance.md |
| "App feels slow overall" | Lighthouse score | core-web-vitals.md | perceived-performance.md |
| "Offline doesn't work" | PWA audit | service-worker-offline.md | — |

## Measurement First

Always measure before opening a reference file. Run Lighthouse, check bundle size, or profile the specific symptom. The reference files assume you know your bottleneck.
