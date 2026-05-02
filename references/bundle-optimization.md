# Bundle Size and Cold-Start Optimization

Comprehensive guide to achieving sub-150 KB bundles and instant cold starts.

## Target Metrics

- **Main JS bundle:** Under 150 KB (target: 114 KB)
- **Initial load time:** Under 1 second
- **First Contentful Paint (FCP):** Under 1.8s (Good per Google CWV)
- **Time to Interactive (TTI):** Under 3.8s (Good per Core Web Vitals)
- **Interaction to Next Paint (INP):** Under 200ms (primary interactivity metric)

## Strategy 1: Custom-Tailored Libraries

### Replace Heavy Dependencies

**Audit current dependencies:**
```bash
# For Vite projects — use rollup-plugin-visualizer (underlying tool)
bun add -D rollup-plugin-visualizer
bunx vite-bundle-visualizer

# For webpack projects
bun install -g webpack-bundle-analyzer
bunx webpack-bundle-analyzer dist/stats.json
```

**Common replacements:**

| Heavy Library | Lightweight Alternative | Savings |
|--------------|------------------------|---------|
| Lodash (full, 72KB) | Lodash-es + tree-shaking, or import only needed functions (e.g. `lodash/uniq` = 5KB) | 67 KB |
| Moment.js (67KB) | date-fns (12KB, tree-shakeable) or dayjs (7KB) | 55 KB |
| Lodash `uniq` (5KB) | Native `[...new Set(array)]` (0KB) | 5 KB |
| Full React | Preact (if compatible) | 40 KB |
| Redux + Thunk | Zustand or Jotai | 30 KB |
| Axios | Native fetch + wrapper | 15 KB |

**Implementation:**
```javascript
// ❌ Before: Import entire library
import _ from 'lodash';

// ✅ After: Import specific functions
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';

// ❌ Before: Moment.js
import moment from 'moment';
const date = moment().format('YYYY-MM-DD');

// ✅ After: date-fns (tree-shakeable)
import { format } from 'date-fns';
const date = format(new Date(), 'yyyy-MM-dd');
```

### Tree Shaking Configuration

To ensure the bundler can remove unused exports, two pieces of configuration are needed:

```javascript
// webpack.config.js
module.exports = {
  mode: 'production',
  optimization: {
    usedExports: true,
  }
};
```

```json
// package.json
{ "sideEffects": false }
```

Setting `"sideEffects": false` tells bundlers that no module in the project has side effects when imported, making it safe to remove unused exports. If specific files do have side effects (e.g., CSS imports, polyfills), list them explicitly:

```json
{ "sideEffects": ["*.css", "./src/polyfills.js"] }
```

With tree shaking enabled, a barrel import like `import _ from 'lodash'` (72KB) can be reduced to `import uniq from 'lodash/uniq'` (5KB) — a 67KB saving from one import alone.

## Strategy 2: Lazy Code Splitting

### Dynamic Imports with Module Preload

```javascript
// Route-based splitting
import { lazy, Suspense } from 'react';

const StockPage = lazy(() => import('./pages/StockPage'));
const ChartPage = lazy(() => import('./pages/ChartPage'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/stock/:ticker" element={<StockPage />} />
        <Route path="/charts" element={<ChartPage />} />
      </Routes>
    </Suspense>
  );
}
```

### Module Preload Hints

```html
<!-- Add to index.html head -->
<link rel="modulepreload" href="/src/main.jsx" />
<link rel="modulepreload" href="/src/pages/StockPage.jsx" />

<!-- Prefetch on intent detection -->
<link rel="prefetch" href="/src/pages/ChartPage.jsx" />
```

### Prefetch on User Intent

```javascript
// Prefetch on hover/touch start
function PrefetchLink({ to, children }) {
  const prefetchRoute = () => {
    const component = import(`./pages/${to}.jsx`);
  };
  
  return (
    <Link 
      to={to} 
      onMouseEnter={prefetchRoute}
      onTouchStart={prefetchRoute}
    >
      {children}
    </Link>
  );
}
```

## Strategy 3: Critical CSS Inlining

### Inline Above-the-Fold Styles

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Critical CSS inlined - under 14 KB */
    body { margin: 0; font-family: system-ui, sans-serif; }
    .app-shell { min-height: 100vh; }
    .loading { display: flex; justify-content: center; align-items: center; }
    /* ... more critical styles ... */
  </style>
  
  <!-- Async load remaining CSS -->
  <link rel="preload" href="/assets/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/assets/styles.css"></noscript>
</head>
```

### CSS-in-JS Optimization

```javascript
// Use linaria or similar for zero-runtime CSS-in-JS
import { styled } from '@linaria/react';

const Button = styled.button`
  background: blue;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
`;
// Extracted to CSS at build time - no runtime overhead
```

## Strategy 4: Middleware-Level Routing

### Handle Routing Before Client Load

```javascript
// middleware.js (Next.js) or edge function
export function middleware(request) {
  const token = request.cookies.get('auth-token');
  
  // Redirect before React loads
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Add headers for client-side optimization
  const response = NextResponse.next();
  response.headers.set('X-Preload-Routes', '/api/user,/api/settings');
  
  return response;
}
```

### Cookie-Based Route Guards

```javascript
// Check auth before loading heavy components
function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  
  useEffect(() => {
    // Instant check - no API call needed
    const token = document.cookie.includes('auth-token=');
    setIsAuthenticated(token);
    
    if (!token) {
      window.location.href = '/login';
    }
  }, []);
  
  if (isAuthenticated === null) return null; // Nothing renders during check
  return isAuthenticated ? children : null;
}
```

## Strategy 5: Asset Optimization

### Image Optimization

```javascript
// Use WebP with fallbacks
<picture>
  <source srcSet="/images/logo.webp" type="image/webp" />
  <source srcSet="/images/logo.png" type="image/png" />
  <img src="/images/logo.png" alt="Logo" width="200" height="50" />
</picture>
```

### Font Loading

```html
<!-- Preconnect to font CDN -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Use font-display: swap -->
<link 
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" 
  rel="stylesheet"
/>
```

### Third-Party Script Delayed Injection

Third-party scripts (analytics, chat widgets, social embeds) are notorious for blocking the main thread. Instead of loading them with a simple `<script async>` tag, delay their injection until after the page is fully rendered:

```javascript
window.addEventListener('load', () => {
  const script = document.createElement('script');
  script.src = 'https://analytics.example.com/script.js';
  script.async = true;
  document.body.appendChild(script);
});
```

This is better than `async` alone because it defers loading until **after** the page is fully rendered (`load` event fires after all critical resources), preventing third-party scripts from competing with your own JavaScript during the initial parse and render. For non-critical widgets (chat, support), consider delaying even further with `setTimeout` or loading on user interaction.

## Build Configuration

### Vite Optimization

```javascript
// vite.config.js
export default {
  build: {
    target: 'esnext', // Modern browsers only
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log']
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  }
};
```

### Webpack Optimization

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
        common: {
          minChunks: 2,
          chunks: 'all',
          enforce: true
        }
      }
    },
    runtimeChunk: 'single'
  }
};
```

## Performance Budget Enforcement in CI

### Budget Targets

Enforce these budgets to prevent gradual regression. All sizes are gzipped:

| Resource Type | Budget |
|--------------|--------|
| JS (initial load) | < 200 KB |
| CSS | < 50 KB |
| Images (above fold) | < 500 KB total |
| Fonts | < 100 KB total |

### Enforce with bundlesize

```json
// package.json
{
  "bundlesize": [
    { "path": "./dist/assets/*.js", "maxSize": "200 KB" },
    { "path": "./dist/assets/*.css", "maxSize": "50 KB" }
  ]
}
```

```bash
npm install -D bundlesize
npx bundlesize
```

### Enforce with Lighthouse CI

```bash
npm install -D @lhci/cli
npx lhci autorun --collect.url=https://example.com --upload.target=temporary-public-storage
```

Add to your CI pipeline (`.github/workflows/lighthouse.yml`):

```yaml
- name: Lighthouse CI
  run: |
    npx lhci autorun
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### Custom Bundle Size Check (as fallback)

```javascript
// scripts/check-bundle-size.js
const fs = require('fs');
const stats = require('../dist/stats.json');

const bundleSize = stats.assets
  .filter(asset => asset.name.endsWith('.js'))
  .reduce((sum, asset) => sum + asset.size, 0);

const bundleSizeKB = (bundleSize / 1024).toFixed(2);

if (bundleSize > 150 * 1024) {
  console.error(`❌ Bundle size ${bundleSizeKB} KB exceeds 150 KB limit`);
  process.exit(1);
} else {
  console.log(`✅ Bundle size: ${bundleSizeKB} KB`);
}
```

**Run with Bun for faster CI:**
```bash
bun run build && bun scripts/check-bundle-size.js
```

## Checklist

- [ ] Replaced heavy dependencies with lightweight alternatives
- [ ] Implemented dynamic imports for routes
- [ ] Added modulepreload hints for critical routes
- [ ] Inlined critical CSS in HTML head
- [ ] Configured middleware-level routing
- [ ] Optimized images (WebP format, proper sizing)
- [ ] Optimized font loading (preconnect, font-display: swap)
- [ ] Configured tree shaking (`usedExports: true`, `"sideEffects": false`)
- [ ] Delayed third-party script injection to `window.load`
- [ ] Added bundle size monitoring and performance budget enforcement to CI/CD
- [ ] Achieved main bundle under 150 KB

## Key Takeaways

1. **Every KB matters:** Aggressively remove unused code
2. **Split by route:** Only load what's needed for current view
3. **Inline critical:** Render-blocking resources must be instant
4. **Middleware routing:** Check auth/permissions before React loads
5. **Measure constantly:** Add bundle size checks to your workflow
