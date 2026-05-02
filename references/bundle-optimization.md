# Bundle Size and Cold-Start Optimization

Comprehensive guide to achieving sub-150 KB bundles and instant cold starts.

## Target Metrics

- **Main JS bundle:** Under 150 KB (target: 114 KB)
- **Initial load time:** Under 1 second
- **First Contentful Paint (FCP):** Under 1s
- **Time to Interactive (TTI):** Under 2s

## Strategy 1: Custom-Tailored Libraries

### Replace Heavy Dependencies

**Audit current dependencies:**
```javascript
// Analyze bundle size
bun install -g webpack-bundle-analyzer
bunx webpack-bundle-analyzer dist/stats.json
```

**Common replacements:**

| Heavy Library | Lightweight Alternative | Savings |
|--------------|------------------------|---------|
| Lodash (full) | Lodash-es + tree-shaking | ~70 KB |
| Moment.js | date-fns or dayjs | ~200 KB |
| Full React | Preact (if compatible) | ~40 KB |
| Redux + Thunk | Zustand or Jotai | ~30 KB |
| Axios | Native fetch + wrapper | ~15 KB |

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

## Monitoring Bundle Size

```javascript
// Add to CI/CD pipeline
const fs = require('fs');
const stats = require('./dist/stats.json');

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
- [ ] Set up build minification and tree-shaking
- [ ] Added bundle size monitoring to CI/CD
- [ ] Achieved main bundle under 150 KB

## Key Takeaways

1. **Every KB matters:** Aggressively remove unused code
2. **Split by route:** Only load what's needed for current view
3. **Inline critical:** Render-blocking resources must be instant
4. **Middleware routing:** Check auth/permissions before React loads
5. **Measure constantly:** Add bundle size checks to your workflow
