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

Load tab content only when accessed.

```jsx
function TabContainer({ tabs }) {
  const [activeTab, setActiveTab] = useState(0);
  const loadedTabs = useRef(new Set([0]));
  
  const handleTabChange = (index) => {
    loadedTabs.current.add(index);
    setActiveTab(index);
  };
  
  return (
    <div>
      {tabs.map((tab, index) => (
        <div key={tab.id} hidden={activeTab !== index}>
          {loadedTabs.current.has(index) && tab.component}
        </div>
      ))}
    </div>
  );
}
```

### 3. Memoized List Items

Prevent unnecessary re-renders of expensive list items.

```jsx
const StockListItem = memo(function StockListItem({ stock }) {
  return (
    <div className="stock-item">
      <span>{stock.ticker}</span>
      <span>{stock.price}</span>
    </div>
  );
}, (prev, next) => prev.stock.price === next.stock.price);
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

## Checklist

- [ ] Reserve height for lazy-loaded content
- [ ] Implement tab-level lazy loading
- [ ] Memoize expensive list items
- [ ] Show cached data instantly on load
- [ ] Keep DOM structure flat and minimal
- [ ] Monitor CLS (keep under 0.1)
- [ ] Ensure 60fps during scrolling

## Key Metrics

- **Cumulative Layout Shift (CLS):** Under 0.1
- **First Contentful Paint (FCP):** Under 1s
- **Largest Contentful Paint (LCP):** Under 2.5s
- **Animation frame rate:** 60fps

→ See full implementation details in [bundle-optimization.md](./bundle-optimization.md) and [multi-layered-caching.md](./multi-layered-caching.md)
