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
---

# Web Performance Vibe Coding

Apply Brotzky's extreme performance techniques to build blazing-fast web applications through AI-guided optimization.

## When to Use

Activate this skill when:
- Building new performance-focused applications (financial, dashboard, real-time)
- Refactoring existing apps for speed optimization
- Implementing specific techniques: bundle splitting, caching, prefetching, streaming
- Creating AI-powered apps requiring fast data interactions
- Following "vibe coding" workflow (AI-directed via natural language prompts)

## Core Philosophy

**"There's no magic. Just tell the AI what you want it to do."**

Combine deep engineering intuition with AI leverage to achieve meticulous optimization. The AI implements micro-optimizations while you focus on vision and architectural decisions.

## Quick Start: 7 Performance Strategies

### 1. Bundle Size and Cold-Start Optimization

**Target:** Main JS bundle under 150 KB for instant cold starts.

**Actions:**
- Replace heavy dependencies with custom-tailored libraries
- Implement lazy code splitting with `modulepreload` hints
- Inline critical CSS to eliminate render-blocking
- Add middleware-level cookie checks for routing

**Key Result:** 114 KB bundle for full-featured React app.

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

**Prompt Template:**
> "Implement intent-based prefetching. Preload essential APIs on page mount. Add hover prefetching for interactive elements. Make navigation feel instantaneous."

→ [Implementation patterns](./references/intelligent-prefetching.md)

### 3. Multi-Layered Caching Strategy

**Goal:** Fresh data without latency through tiered caching.

**Actions:**
- Configure SWR with cache lifetimes (30s to 1 day)
- Implement localStorage + React Query hydration for price data
- Add Gemini context cache (30-minute KV store) for AI features
- Share AI-generated summaries and chart data across components

**Prompt Template:**
> "Build a multi-layered caching system. Use SWR with configurable TTL. Add localStorage hydration. Share cached data across the app. Target 5-minute data freshness."

→ [Caching architecture](./references/multi-layered-caching.md)

### 4. True Streaming and Parallel Execution

**Focus:** Make AI interactions and data operations feel snappy.

**Actions:**
- Implement real token streaming (not fake chunking)
- Add anti-buffering headers for chat features
- Use parallel tool calls and batched prompts on backend
- Batch client-side APIs over single endpoint

**Prompt Template:**
> "Implement true streaming for AI chat. Add anti-buffering headers. Use parallel tool calls. Make complex flows feel uninterrupted."

→ [Streaming implementation](./references/streaming-optimization.md)

### 5. Rendering and DOM Discipline

**Target:** Zero jank, immediate paint, responsive under load.

**Actions:**
- Lazy-load charts with reserved height (prevent layout shifts)
- Implement tab-level lazy loading
- Memoize list items and expensive renders
- Keep DOM structure lightweight
- Enable instant repaints on cache hits

**Prompt Template:**
> "Optimize rendering and DOM structure. Lazy-load charts with reserved space. Memoize expensive renders. Keep DOM lightweight. Eliminate jank."

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

**Prompt Template:**
> "Implement service worker with offline-first shell. Precache app shell. NetworkFirst navigation with timeout. Long-term font caching. Register on idle."

→ [PWA implementation](./references/service-worker-offline.md)

## Vibe Coding Workflow

### Terminal-Based Development

1. **Minimal Setup:** Run AI directly in macOS Terminal (or equivalent)
2. **Precise Prompts:** Issue high-level, performance-focused instructions
3. **Diff Review:** Skim terminal diffs rather than reading full codebase
4. **Trust the AI:** Let AI suggest optimizations you might miss

### Effective Prompting Patterns

**Performance-Focused:**
- "Make this component render instantly"
- "Eliminate layout shift in this chart"
- "Reduce this API call's latency"
- "Cache this data for 5 minutes"

**Architecture-Focused:**
- "Implement tiered caching for this data"
- "Add hover prefetching to these elements"
- "Stream these AI responses token-by-token"
- "Share this WebSocket across the app"

## Tooling Recommendation: Use Bun

**Why Bun:**
- **3x faster package installs** than npm (critical for iteration speed)
- **4x faster script execution** (faster dev server and builds)
- **Native TypeScript support** (no transpilation step)
- **Built-in bundler** (optional alternative to Vite for even smaller bundles)
- **Compatible with npm packages** (drop-in replacement)

**Commands:**
```bash
# Instead of: npm install
bun install

# Instead of: npm run dev
bun run dev

# Instead of: npm run build
bun run build

# Instead of: npx <package>
bunx <package>
```

## Complete Implementation Example

Build the fastest financial app in a weekend:

```
1. Initialize React app with Bun (bun create vite)
2. Implement bundle optimization (114 KB target)
3. Add intelligent prefetching for all navigation
4. Configure multi-layered caching (SWR + localStorage + KV)
5. Enable true streaming for AI features
6. Optimize DOM with lazy charts and memoization
7. Build shared WebSocket for real-time data
8. Add service worker with offline-first shell
```

→ [Complete weekend build guide](./references/complete-implementation.md)

## Key Metrics to Track

- **Bundle Size:** Main JS under 150 KB
- **Time to First Byte (TTFB):** Under 200ms
- **First Contentful Paint (FCP):** Under 1s
- **Largest Contentful Paint (LCP):** Under 2.5s
- **Cumulative Layout Shift (CLS):** Under 0.1
- **Cache Hit Rate:** 80%+ for cached data
- **WebSocket Reconnect Time:** Under 500ms

## Navigation

### Strategy Implementation
- **[📦 Bundle Optimization](./references/bundle-optimization.md)** - Dependency replacement, code splitting, critical CSS inlining
- **[⚡ Intelligent Prefetching](./references/intelligent-prefetching.md)** - Intent detection, hover prefetching, parallel loading
- **[💾 Multi-Layered Caching](./references/multi-layered-caching.md)** - SWR configuration, localStorage hydration, shared caching
- **[🌊 Streaming Optimization](./references/streaming-optimization.md)** - True streaming, anti-buffering, parallel execution
- **[🎨 DOM Discipline](./references/dom-discipline.md)** - Lazy loading, memoization, layout shift prevention
- **[🔌 WebSocket Architecture](./references/websocket-architecture.md)** - Shared connections, reconnect logic, real-time data
- **[📱 Service Worker & PWA](./references/service-worker-offline.md)** - Offline shell, NetworkFirst strategy, long-term caching

### Complete Guides
- **[🏗️ Complete Implementation](./references/complete-implementation.md)** - Weekend build walkthrough, step-by-step integration
- **[🧠 Vibe Coding Techniques](./references/vibe-coding-workflow.md)** - Terminal workflow, effective prompting, AI collaboration

## Key Reminders

- **Start minimal:** Strip everything unnecessary before adding features
- **Measure obsessively:** Track bundle size, load times, cache hit rates
- **Compound gains:** Small optimizations stack into massive speed improvements
- **Trust AI suggestions:** The model surfaces optimizations you might overlook
- **Work in terminal:** Minimal setup keeps focus on architecture, not tooling
- **Keep it light:** "An obsession with keeping things light, simple, and fast compounds"

**Result:** The fastest app you've ever built — instant loads, zero stale data, pure interactions.
