# Web Performance Vibe Coding

[![Skill](https://img.shields.io/badge/Skill-Extreme%20Performance-blue)](https://github.com/Can-0f-Tuna/web-performance-vibe-coding)
[![Bun](https://img.shields.io/badge/Bun-3x%20Faster-orange)](https://bun.sh)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 📦 Installation (GitHub - Not on NPM Yet)

Since this skill is hosted on GitHub (not npm), use these methods:

### Method 1: Install from GitHub (Recommended)
```bash
# Bun (recommended)
bun install github:Can-0f-Tuna/web-performance-vibe-coding

# pnpm
pnpm install github:Can-0f-Tuna/web-performance-vibe-coding

# npm
npm install github:Can-0f-Tuna/web-performance-vibe-coding

# Yarn
yarn add github:Can-0f-Tuna/web-performance-vibe-coding
```

### Method 2: Clone for Skill Development
```bash
# Clone to your skills directory
git clone https://github.com/Can-0f-Tuna/web-performance-vibe-coding.git

# Move to Claude's skills folder
cp -r web-performance-vibe-coding ~/.agents/skills/

# Or use directly
ls web-performance-vibe-coding/references/
```

### Method 3: Git Submodule (For Projects)
```bash
git submodule add https://github.com/Can-0f-Tuna/web-performance-vibe-coding.git
git submodule update --init
```

> **"There's no magic. Just tell the AI what you want it to do."**

Build the fastest web applications you've ever created using Brotzky's "vibe coding" approach - directing AI through natural language prompts to implement extreme performance optimizations without writing every line of code manually.

## 🎯 What This Skill Delivers

This skill teaches **7 interconnected performance strategies** that compound into exceptional speed:

| Strategy | Target | Result |
|----------|--------|--------|
| **Bundle Optimization** | 114 KB bundle | Instant cold starts |
| **Intelligent Prefetching** | Intent-based loading | Instant navigation |
| **Multi-Layered Caching** | 5 tiers (30s-1day) | Zero stale data |
| **True Streaming** | Real token streaming | Snappy AI interactions |
| **DOM Discipline** | CLS < 0.1 | Zero jank, 60fps |
| **Shared WebSocket** | Single connection | Live real-time data |
| **Service Worker** | Offline-first PWA | Native-like experience |

**Real-world results:**
- ⚡ **114 KB** main bundle (remarkably small)
- ⚡ **Instant** page loads from cache
- ⚡ **Zero** stale data with smart caching
- ⚡ **Weekend** build time (16-20 hours)
- ⚡ **0 IDE time** - All terminal-based AI coding

## 🚀 Quick Start

### For Claude Users (AI-Assisted Development)

When working with Claude/Code, simply say:

```
"Optimize this dashboard for extreme performance using vibe coding.
Implement all 7 strategies. Target 114 KB bundle."
```

Claude will load this skill and provide:
- Assessment of which optimizations your app needs
- Implementation prompts for each strategy
- Bun-based tooling commands
- Performance measurement guidance

### Manual Installation

```bash
# Clone the skill
git clone https://github.com/Can-0f-Tuna/web-performance-vibe-coding.git

# Move to your skills directory
mv web-performance-vibe-coding ~/.agents/skills/

# Or use as reference
ls web-performance-vibe-coding/references/
```

## 📚 Skill Structure

This skill uses **progressive disclosure** - load only what you need:

```
web-performance-vibe-coding/
├── SKILL.md                          ← Entry point (154 lines)
│   └── Quick-start prompts for all 7 strategies
└── references/
    ├── bundle-optimization.md        ← 114 KB bundle strategies
    ├── intelligent-prefetching.md   ← Intent-based loading
    ├── multi-layered-caching.md     ← 5-tier caching
    ├── streaming-optimization.md     ← Real token streaming
    ├── dom-discipline.md            ← Zero layout shift
    ├── websocket-architecture.md    ← Shared WebSocket
    ├── service-worker-offline.md    ← PWA offline-first
    ├── complete-implementation.md   ← Weekend build guide
    └── vibe-coding-workflow.md      ← Terminal AI workflow
```

## 🛠️ Tooling: Bun (Not npm)

This skill uses **Bun** throughout for maximum speed:

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Create project (3x faster than npm)
bun create vite my-app --template react

# Install dependencies
bun install

# Development server
bun run dev

# Production build
bun run build

# Run CLI tools
bunx <package>
```

**Why Bun:**
- ⚡ **3x faster** package installs
- ⚡ **4x faster** script execution
- ⚡ Native TypeScript support (no transpilation)
- ⚡ Drop-in npm replacement

## 💡 Usage Examples

### Example 1: Optimize Bundle Size

**Prompt:**
```
Optimize this React app for minimal bundle size using Bun.
Replace heavy libraries (moment.js → date-fns, lodash → specific imports).
Implement code splitting with modulepreload hints.
Inline critical CSS.
Target bundle under 114 KB.
```

### Example 2: Add Intelligent Prefetching

**Prompt:**
```
Implement intent-based prefetching for this financial dashboard:
1. Preload 7 essential APIs on page mount
2. Add hover prefetching for all stock tickers
3. Detect login intent and preload dashboard data
4. Add touch-based prefetching for mobile
5. Use connection-aware prefetching (skip on 2G)
```

### Example 3: Complete Weekend Sprint

**Prompt:**
```
Transform this app into the fastest version possible over the weekend.
Implement all 7 performance strategies:
1. Bundle optimization (114 KB target)
2. Intelligent prefetching (intent-based)
3. Multi-layered caching (SWR + localStorage + HTTP + KV)
4. True streaming (anti-buffering headers)
5. DOM discipline (lazy charts, memoization, zero CLS)
6. Shared WebSocket architecture
7. Service worker offline-first shell

Use Bun for all tooling. Focus on terminal-based workflow.
Measure and report performance after each strategy.
```

## 📊 Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| **Bundle Size** | ≤ 114 KB | ✅ |
| **FCP** | ≤ 1 second | ✅ |
| **LCP** | ≤ 2.5 seconds | ✅ |
| **CLS** | < 0.1 | ✅ |
| **Cache Hit Rate** | ≥ 80% | ✅ |
| **WS Reconnect** | < 500ms | ✅ |

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────┐
│          Application Layer                  │
│  ┌─────────────────────────────────────┐   │
│  │  React Components (Lazy Loaded)      │   │
│  │  • Memoized lists                   │   │
│  │  • Reserved height charts           │   │
│  │  • Instant repaint on cache hit     │   │
│  └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│          Data Layer                         │
│  ┌─────────────────────────────────────┐   │
│  │  Multi-Layered Caching              │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ │   │
│  │  │ SWR    │ │Local   │ │ HTTP   │ │   │
│  │  │(30s)   │ │Storage │ │(CDN)   │ │   │
│  │  └────────┘ └────────┘ └────────┘ │   │
│  └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│          Network Layer                      │
│  ┌──────────────┐  ┌─────────────────┐     │
│  │ Prefetching  │  │ WebSocket       │     │
│  │ (Intent)     │  │ (Shared)        │     │
│  └──────────────┘  └─────────────────┘     │
├─────────────────────────────────────────────┤
│          Build Layer                        │
│  ┌─────────────────────────────────────┐   │
│  │  Bun + Vite                          │   │
│  │  • Code splitting                   │   │
│  │  • Tree shaking                     │   │
│  │  • 114 KB bundle                    │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## 🔧 Electron Support

Most strategies work for Electron apps with adaptations:

✅ **Bundle Optimization** - Main/renderer split  
✅ **DOM Discipline** - Works directly (Chromium)  
✅ **Multi-Layered Caching** - Use session API  
✅ **True Streaming** - Works directly  
⚠️ **Prefetching** - Use IPC instead of HTTP  
⚠️ **WebSocket** - Use IPC (more efficient)  
❌ **Service Worker** - Use Electron native APIs  

See [Electron adaptations discussion](https://github.com/Can-0f-Tuna/web-performance-vibe-coding/issues) for details.

## 📝 Skill Development

Want to contribute or modify this skill?

### Principles Applied

This skill demonstrates the patterns it teaches:

- ✅ **Progressive Disclosure:** 154-line entry + detailed references
- ✅ **Example-Driven:** Concrete prompts, not abstract concepts
- ✅ **Imperative Voice:** "Implement X" not "You should do X"
- ✅ **Outcome-Focused:** "Make it fast" not specific implementation details
- ✅ **Bun Throughout:** Fast tooling for fast development

### File Sizes (Progressive Disclosure)

| File | Lines | Purpose |
|------|-------|---------|
| SKILL.md | 154 | Entry point, quick start |
| bundle-optimization.md | 350 | Detailed implementation |
| intelligent-prefetching.md | 450 | Complete patterns |
| multi-layered-caching.md | 550 | Architecture guide |
| ... | ... | ... |

**Total:** ~3,168 lines organized for efficient loading

## 🎓 The Philosophy

### Vibe Coding Workflow

```
┌─────────────────────────────────────────┐
│  1. Issue high-level instruction        │
│     "Make this component render fast"   │
├─────────────────────────────────────────┤
│  2. AI generates optimized code         │
│     • Implements micro-optimizations   │
│     • Suggests additional improvements   │
├─────────────────────────────────────────┤
│  3. Skim terminal diff                  │
│     • Check architecture decisions       │
│     • Trust implementation details       │
├─────────────────────────────────────────┤
│  4. Measure & iterate                   │
│     • Track bundle size                 │
│     • Monitor load times                │
│     • Refine and repeat                 │
└─────────────────────────────────────────┘
```

### Why It Works

1. **Deep engineering intuition** + **AI leverage** = Meticulous optimization
2. **Terminal-based workflow** = Minimal setup, maximum focus
3. **Natural language prompts** = Describe outcomes, not implementations
4. **Bun tooling** = Speed at every layer
5. **Systematic approach** = 7 strategies that compound

**The result:** Production-grade, exceptionally fast apps built in a weekend.

## 📦 Installation Methods

### Method 1: Direct Clone (Recommended for reference)
```bash
git clone https://github.com/Can-0f-Tuna/web-performance-vibe-coding.git
cd web-performance-vibe-coding
ls references/
```

### Method 2: Claude Skill Directory
```bash
# Move to Claude's skills directory
cp -r web-performance-vibe-coding ~/.agents/skills/

# Or create symlink
ln -s $(pwd)/web-performance-vibe-coding ~/.agents/skills/
```

### Method 3: Submodule (For projects)
```bash
git submodule add https://github.com/Can-0f-Tuna/web-performance-vibe-coding.git
git submodule update --init
```

## 🚦 Quick Reference

### 7 Strategies at a Glance

| # | Strategy | Key Technique | Target |
|---|----------|---------------|--------|
| 1 | Bundle Size | Custom libraries + code splitting | 114 KB |
| 2 | Prefetching | Intent detection (hover/login) | Instant nav |
| 3 | Caching | 5 tiers (SWR → local → HTTP → KV → Shared) | Zero stale |
| 4 | Streaming | Real tokens + anti-buffering | Snappy AI |
| 5 | DOM | Lazy charts + memoization | 60fps |
| 6 | WebSocket | Single shared connection | Live data |
| 7 | Service Worker | Offline shell + precache | Native feel |

### Bun Commands

```bash
bun install              # 3x faster than npm install
bun run dev             # 4x faster dev server
bun run build           # Optimized production build
bunx <package>          # Run CLI tools
bun test                # Fast test runner
```

## 🤝 Contributing

This skill is open for contributions! Areas to improve:

- Additional framework examples (Vue, Svelte, Solid)
- More Electron-specific adaptations
- Additional performance metrics and monitoring
- Real-world case studies
- Video tutorials

See [Issues](https://github.com/Can-0f-Tuna/web-performance-vibe-coding/issues) for discussion.

## 📄 License

MIT License - See [LICENSE](LICENSE) for details

## 🙏 Credits

- **Brotzky** - Original 