# Image Optimization: The Complete Guide

Images account for ~50% of the average page weight. Getting them right is the single highest-leverage performance optimization you can make.

## Target Metrics

- **Largest Contentful Paint (LCP):** Under 2.5s (often the hero image)
- **Cumulative Layout Shift (CLS):** Under 0.1 (explicit dimensions on every image)
- **Image payload per page:** Under 200 KB total (above-fold), under 500 KB total (full page)
- **Format adoption:** AVIF for 90%+ of raster images, SVG for vectors/icons

---

## 1. Format Selection Guide

Choose the right format for every image. No exceptions.

| Format | Best For | Quality Setting | Notes |
|--------|----------|----------------|-------|
| **AVIF** | Photos, hero images, product shots | 60-75 | Best compression. ~50% smaller than JPEG at same quality. Supported in all modern browsers (Chrome 85+, Firefox 93+, Safari 16.4+). |
| **WebP** | Broad fallback for AVIF | 75-85 | ~25-35% smaller than JPEG. Universal browser support. |
| **JPEG** | Legacy fallback. Use progressive encoding. | 80 | The last-resort format. Always encode progressive. |
| **PNG** | Screenshots, images requiring exact pixel fidelity | Lossless | Never for photos. 3-5x larger than AVIF equivalent. |
| **SVG** | Icons, logos, illustrations, charts | N/A | Vector format. Infinitely scalable, tiny file size. Always prefer over PNG for icons. |

### Quality Decision Matrix

```javascript
const QUALITY = {
  // Hero images: prioritize visual quality
  hero:     { avif: 70, webp: 80, jpeg: 82 },

  // Content images: balance quality and size
  content:  { avif: 65, webp: 75, jpeg: 78 },

  // Thumbnails / cards: prioritize file size
  thumb:    { avif: 55, webp: 65, jpeg: 72 },

  // Background images: slightly lower quality acceptable
  bg:       { avif: 55, webp: 65, jpeg: 70 },
};
```

### Real-World Savings

```
Original JPEG (1200px):    284 KB
                                 ↓
AVIF (quality 65):          48 KB   (83% smaller)
WebP (quality 75):          74 KB   (74% smaller)
JPEG progressive (q80):    142 KB   (50% smaller)
```

---

## 2. The Complete Responsive Picture Pattern

The `<picture>` element provides format negotiation and resolution switching in one element. Every content image on your site should use this pattern.

### Desktop Variant (multi-column layouts)

```html
<picture>
  <!-- AVIF: Best compression, modern browsers -->
  <source
    srcset="
      /img/hero-400w.avif  400w,
      /img/hero-800w.avif  800w,
      /img/hero-1200w.avif 1200w,
      /img/hero-1800w.avif 1800w,
      /img/hero-2400w.avif 2400w
    "
    sizes="
      (min-width: 1200px) 50vw,
      (min-width: 768px)  66vw,
      100vw
    "
    type="image/avif"
  />

  <!-- WebP: Broad fallback -->
  <source
    srcset="
      /img/hero-400w.webp  400w,
      /img/hero-800w.webp  800w,
      /img/hero-1200w.webp 1200w,
      /img/hero-1800w.webp 1800w,
      /img/hero-2400w.webp 2400w
    "
    sizes="
      (min-width: 1200px) 50vw,
      (min-width: 768px)  66vw,
      100vw
    "
    type="image/webp"
  />

  <!-- JPEG: Universal fallback (progressive) -->
  <img
    src="/img/hero-800w.jpg"
    srcset="
      /img/hero-400w.jpg   400w,
      /img/hero-800w.jpg   800w,
      /img/hero-1200w.jpg 1200w,
      /img/hero-1800w.jpg 1800w,
      /img/hero-2400w.jpg 2400w
    "
    sizes="
      (min-width: 1200px) 50vw,
      (min-width: 768px)  66vw,
      100vw
    "
    alt="Product hero shot showing the dashboard interface"
    width="1200"
    height="675"
    loading="lazy"
    decoding="async"
  />
</picture>
```

### Mobile Variant (full-width, single-column)

```html
<picture>
  <source
    srcset="
      /img/product-mobile-400w.avif  400w,
      /img/product-mobile-600w.avif  600w,
      /img/product-mobile-800w.avif  800w
    "
    sizes="100vw"
    type="image/avif"
  />
  <source
    srcset="
      /img/product-mobile-400w.webp  400w,
      /img/product-mobile-600w.webp  600w,
      /img/product-mobile-800w.webp  800w
    "
    sizes="100vw"
    type="image/webp"
  />
  <img
    src="/img/product-mobile-400w.jpg"
    srcset="
      /img/product-mobile-400w.jpg 400w,
      /img/product-mobile-600w.jpg 600w,
      /img/product-mobile-800w.jpg 800w
    "
    sizes="100vw"
    alt="Product detail on mobile"
    width="800"
    height="800"
    loading="lazy"
    decoding="async"
  />
</picture>
```

### Art Direction (different crop per breakpoint)

When the image needs different composition at different sizes (not just scaling):

```html
<picture>
  <!-- Wide desktop crop -->
  <source
    media="(min-width: 1024px)"
    srcset="
      /img/banner-wide-1200w.avif 1200w,
      /img/banner-wide-1800w.avif 1800w
    "
    sizes="100vw"
    type="image/avif"
  />

  <!-- Square tablet crop -->
  <source
    media="(min-width: 640px)"
    srcset="
      /img/banner-square-800w.avif 800w,
      /img/banner-square-1200w.avif 1200w
    "
    sizes="100vw"
    type="image/avif"
  />

  <!-- Tall mobile crop -->
  <img
    src="/img/banner-tall-600w.jpg"
    srcset="
      /img/banner-tall-400w.jpg 400w,
      /img/banner-tall-600w.jpg 600w
    "
    sizes="100vw"
    alt="Seasonal promotion banner"
    width="600"
    height="900"
    loading="lazy"
    decoding="async"
  />
</picture>
```

### `sizes` Attribute Explained

`sizes` tells the browser how wide the image will be rendered at each breakpoint **before** the image loads — this lets the browser pick the correct `srcset` candidate without downloading CSS first.

```
sizes="(min-width: 1200px) 50vw, (min-width: 768px) 66vw, 100vw"
```

| Viewport | Image renders at | Picks srcset candidate near |
|----------|-----------------|-----------------------------|
| 1400px | 50vw = 700px | ~800w |
| 1000px | 66vw = 660px | ~800w |
| 500px  | 100vw = 500px | ~400w or ~600w (DPR dependent) |

---

## 3. LCP Image Optimization

The Largest Contentful Paint element is usually the hero image. It must load before anything else.

### Full LCP-Optimized Hero Image

```html
<head>
  <!-- Preload the LCP image so the browser discovers it immediately -->
  <link
    rel="preload"
    as="image"
    href="/img/hero-lcp-1200w.avif"
    imagesrcset="
      /img/hero-lcp-400w.avif   400w,
      /img/hero-lcp-800w.avif   800w,
      /img/hero-lcp-1200w.avif 1200w,
      /img/hero-lcp-1800w.avif 1800w,
      /img/hero-lcp-2400w.avif 2400w
    "
    imagesizes="
      (min-width: 1200px) 50vw,
      (min-width: 768px)  66vw,
      100vw
    "
    fetchpriority="high"
  />
</head>

<body>
  <picture>
    <source
      srcset="
        /img/hero-lcp-400w.avif   400w,
        /img/hero-lcp-800w.avif   800w,
        /img/hero-lcp-1200w.avif 1200w,
        /img/hero-lcp-1800w.avif 1800w,
        /img/hero-lcp-2400w.avif 2400w
      "
      sizes="(min-width: 1200px) 50vw, (min-width: 768px) 66vw, 100vw"
      type="image/avif"
    />
    <source
      srcset="
        /img/hero-lcp-400w.webp   400w,
        /img/hero-lcp-800w.webp   800w,
        /img/hero-lcp-1200w.webp 1200w,
        /img/hero-lcp-1800w.webp 1800w,
        /img/hero-lcp-2400w.webp 2400w
      "
      sizes="(min-width: 1200px) 50vw, (min-width: 768px) 66vw, 100vw"
      type="image/webp"
    />
    <img
      src="/img/hero-lcp-1200w.jpg"
      srcset="
        /img/hero-lcp-400w.jpg   400w,
        /img/hero-lcp-800w.jpg   800w,
        /img/hero-lcp-1200w.jpg 1200w,
        /img/hero-lcp-1800w.jpg 1800w,
        /img/hero-lcp-2400w.jpg 2400w
      "
      sizes="(min-width: 1200px) 50vw, (min-width: 768px) 66vw, 100vw"
      alt="Hero image - financial dashboard overview"
      width="1200"
      height="675"
      fetchpriority="high"
      loading="eager"
      decoding="sync"
    />
  </picture>
</body>
```

### LCP Image Checklist

| Attribute | Value | Why |
|-----------|-------|-----|
| `fetchpriority` | `"high"` | Bumps this image to the front of the network queue |
| `loading` | `"eager"` | Forces immediate load (default for `<img>`, but explicit is better) |
| `decoding` | `"sync"` | Tells the browser to decode immediately, not defer |
| `<link rel="preload">` | Matched `imagesrcset`/`imagesizes` | Discovers the image before the HTML parser reaches it |
| Image position | First meaningful element in viewport | The LCP element must be in the initial viewport paint |

### Critical: Inline LCP Image CSS

```css
/* Prevent the hero image container from causing layout shift */
.hero-image {
  width: 100%;
  max-width: 1200px;
  height: auto;
  aspect-ratio: 16 / 9;

  /* Prevents the image from being the target of CLS while fonts load */
  display: block;
}

.hero-image img {
  width: 100%;
  height: auto;
  display: block;
}
```

### What Makes an Image the LCP Element

For an image to be considered for LCP by the browser, it must be:
1. A content image (`<img>`, `<image>` in `<svg>`, or CSS `background-image`)
2. In the initial viewport (above the fold)
3. The largest visible element by pixel area

If your hero is a CSS `background-image`, the browser **cannot** apply `fetchpriority` or `loading` to it. Convert it to an `<img>` tag. Always.

---

## 4. Below-Fold Lazy Loading

Every image that is not in the initial viewport must be lazy-loaded.

```html
<!-- Below-fold content image - fully optimized -->
<picture>
  <source
    srcset="
      /img/article-photo-400w.avif  400w,
      /img/article-photo-800w.avif  800w,
      /img/article-photo-1200w.avif 1200w
    "
    sizes="(min-width: 768px) 50vw, 100vw"
    type="image/avif"
  />
  <source
    srcset="
      /img/article-photo-400w.webp  400w,
      /img/article-photo-800w.webp  800w,
      /img/article-photo-1200w.webp 1200w
    "
    sizes="(min-width: 768px) 50vw, 100vw"
    type="image/webp"
  />
  <img
    src="/img/article-photo-400w.jpg"
    srcset="
      /img/article-photo-400w.jpg  400w,
      /img/article-photo-800w.jpg  800w,
      /img/article-photo-1200w.jpg 1200w
    "
    sizes="(min-width: 768px) 50vw, 100vw"
    alt="Article illustration showing market trends"
    width="800"
    height="450"
    loading="lazy"
    decoding="async"
  />
</picture>
```

### Lazy Loading Rules

| Position | `loading` | `decoding` | `fetchpriority` |
|----------|-----------|------------|-----------------|
| Hero / LCP | `"eager"` | `"sync"` | `"high"` |
| Above-fold, non-LCP | `"eager"` | `"async"` | `"auto"` (default) |
| Just below fold | `"lazy"` | `"async"` | `"low"` |
| Deep below fold | `"lazy"` | `"async"` | `"low"` |

### Intersection Observer Lazy Loading (for CSS backgrounds)

When images must be CSS backgrounds, use Intersection Observer:

```javascript
const bgImages = document.querySelectorAll('[data-bg]');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const el = entry.target;
      el.style.backgroundImage = `url(${el.dataset.bg})`;
      observer.unobserve(el);
    }
  });
}, {
  rootMargin: '200px', // Start loading 200px before visible
});

bgImages.forEach((el) => observer.observe(el));
```

```html
<div
  class="hero-section"
  data-bg="/img/hero-bg-1200w.avif"
  style="background-color: #0a0a1a; background-size: cover;"
>
  <!-- content -->
</div>
```

---

## 5. Sharp Build-Time Conversion Script

Use Sharp to batch-process all source images into optimized AVIF, WebP, and JPEG variants at build time.

### Complete Build Script

```javascript
// scripts/optimize-images.js
import sharp from 'sharp';
import { glob } from 'glob';
import path from 'node:path';
import fs from 'node:fs';

// ── Configuration ──────────────────────────────────────────

const CONFIG = {
  /** Source directory with original high-res images */
  sourceDir: './public/img/originals',

  /** Output directory for optimized images */
  outputDir: './public/img/optimized',

  /** Output widths for srcset (pixels) */
  widths: [400, 600, 800, 1200, 1800, 2400],

  /** Quality settings per format and image type */
  quality: {
    hero:    { avif: 70, webp: 80, jpeg: 82 },
    content: { avif: 65, webp: 75, jpeg: 78 },
    thumb:   { avif: 55, webp: 65, jpeg: 72 },
    bg:      { avif: 55, webp: 65, jpeg: 70 },
  },

  /** Image type classification by filename prefix */
  typePrefixes: {
    'hero-':    'hero',
    'content-': 'content',
    'thumb-':   'thumb',
    'bg-':      'bg',
  },

  /** Create AVIF variants */
  avif: true,

  /** Create WebP variants */
  webp: true,

  /** Create progressive JPEG variants */
  jpeg: true,
};

// ── Helpers ────────────────────────────────────────────────

function classifyImage(filename) {
  const base = path.basename(filename);
  for (const [prefix, type] of Object.entries(CONFIG.typePrefixes)) {
    if (base.startsWith(prefix)) return type;
  }
  return 'content'; // default
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getQuality(type, format) {
  return CONFIG.quality[type][format];
}

async function resizeAndConvert(inputPath, outputBaseName, width, type) {
  const ext = path.extname(inputPath).toLowerCase();
  const baseName = `${outputBaseName}-${width}w`;
  const results = [];

  // Skip if source is smaller than target width
  const metadata = await sharp(inputPath).metadata();
  if (metadata.width && metadata.width < width) {
    return results; // Don't upscale
  }

  const pipeline = sharp(inputPath).resize(width, undefined, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  // AVIF
  if (CONFIG.avif && ext !== '.svg') {
    const avifPath = `${baseName}.avif`;
    await pipeline
      .clone()
      .avif({ quality: getQuality(type, 'avif'), effort: 4 })
      .toFile(avifPath);
    results.push({ format: 'avif', path: avifPath, width });
  }

  // WebP
  if (CONFIG.webp) {
    const webpPath = `${baseName}.webp`;
    await pipeline
      .clone()
      .webp({ quality: getQuality(type, 'webp') })
      .toFile(webpPath);
    results.push({ format: 'webp', path: webpPath, width });
  }

  // Progressive JPEG
  if (CONFIG.jpeg) {
    const jpegPath = `${baseName}.jpg`;
    await pipeline
      .clone()
      .jpeg({
        quality: getQuality(type, 'jpeg'),
        progressive: true,
        mozjpeg: true, // Smaller files with mozjpeg
      })
      .toFile(jpegPath);
    results.push({ format: 'jpeg', path: jpegPath, width });
  }

  return results;
}

async function optimizeImage(inputPath, relativePath) {
  const parsed = path.parse(relativePath);
  const outputBaseName = path.join(CONFIG.outputDir, parsed.dir, parsed.name);
  const type = classifyImage(relativePath);

  ensureDir(path.dirname(outputBaseName));

  const allResults = [];

  for (const width of CONFIG.widths) {
    const results = await resizeAndConvert(inputPath, outputBaseName, width, type);
    allResults.push(...results);
  }

  return allResults;
}

// ── SVG Pass-Through ───────────────────────────────────────

async function copySvg(inputPath, relativePath) {
  const dest = path.join(CONFIG.outputDir, relativePath);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(inputPath, dest);
  return [{ format: 'svg', path: dest }];
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  const startTime = performance.now();

  console.log('🔍 Finding source images...');
  const sourceFiles = await glob('**/*.{jpg,jpeg,png,svg,webp,avif}', {
    cwd: CONFIG.sourceDir,
  });

  console.log(`📸 Found ${sourceFiles.length} source images\n`);

  const stats = { total: 0, avif: 0, webp: 0, jpeg: 0, svg: 0, skipped: 0 };
  let totalInputSize = 0;
  let totalOutputSize = 0;

  for (const relativePath of sourceFiles) {
    const inputPath = path.join(CONFIG.sourceDir, relativePath);
    const ext = path.extname(relativePath).toLowerCase();

    // SVG: copy as-is (vector format doesn't need resizing)
    if (ext === '.svg') {
      const results = await copySvg(inputPath, relativePath);
      stats.svg += results.length;
      stats.total += results.length;
      console.log(`  ✓ ${relativePath} → SVG (copied)`);
      continue;
    }

    const inputSize = fs.statSync(inputPath).size;
    totalInputSize += inputSize;

    const results = await optimizeImage(inputPath, relativePath);

    if (results.length === 0) {
      stats.skipped++;
      console.log(`  ⊘ ${relativePath} (skipped - source too small)`);
      continue;
    }

    for (const r of results) {
      const outputSize = fs.statSync(r.path).size;
      totalOutputSize += outputSize;
      stats[r.format]++;
      stats.total++;
    }

    // Report savings for the middle width as a sample
    const midWidth = results.find((r) => r.format === 'avif' && r.width === 800);
    if (midWidth) {
      const outputSize = fs.statSync(midWidth.path).size;
      const savings = ((1 - outputSize / inputSize) * 100).toFixed(0);
      console.log(`  ✓ ${relativePath} → AVIF (${midWidth.width}w: ${(outputSize / 1024).toFixed(0)}KB, ${savings}% smaller)`);
    }
  }

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);

  console.log(`\n──────────────────────────────────────────`);
  console.log(`✅ Done in ${elapsed}s`);
  console.log(`   Total outputs:  ${stats.total}`);
  console.log(`   AVIF: ${stats.avif}  |  WebP: ${stats.webp}  |  JPEG: ${stats.jpeg}  |  SVG: ${stats.svg}  |  Skipped: ${stats.skipped}`);
  if (totalInputSize > 0) {
    const overallSavings = ((1 - totalOutputSize / stats.total / (totalInputSize / sourceFiles.length)) * 100).toFixed(0);
    console.log(`   Input total:  ${(totalInputSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`   Output total: ${(totalOutputSize / 1024 / 1024).toFixed(1)} MB`);
  }
  console.log(`──────────────────────────────────────────`);
}

main().catch((err) => {
  console.error('❌ Image optimization failed:', err);
  process.exit(1);
});
```

### package.json Script

```json
{
  "scripts": {
    "optimize-images": "node scripts/optimize-images.js",
    "prebuild": "npm run optimize-images"
  },
  "devDependencies": {
    "sharp": "^0.33.0",
    "glob": "^11.0.0"
  }
}
```

### Source File Naming Convention

```
public/img/originals/
├── hero-dashboard.jpg       → hero quality (70 avif / 80 webp / 82 jpeg)
├── hero-mobile-dash.jpg     → hero quality
├── content-article-1.jpg    → content quality (65 avif / 75 webp / 78 jpeg)
├── content-chart.jpg        → content quality
├── thumb-team-avatar.png    → thumb quality (55 avif / 65 webp / 72 jpeg)
├── bg-hero-pattern.jpg      → bg quality (55 avif / 65 webp / 70 jpeg)
└── logo.svg                 → SVG, copied as-is
```

This produces output like:

```
public/img/optimized/
├── hero-dashboard-400w.avif
├── hero-dashboard-400w.webp
├── hero-dashboard-400w.jpg
├── hero-dashboard-800w.avif
├── hero-dashboard-800w.webp
├── hero-dashboard-800w.jpg
├── ... (all widths, all formats)
└── logo.svg
```

---

## 6. Next.js Image Component

Next.js `next/image` automates most of what `<picture>` does manually. Use it everywhere.

### Hero / LCP Image (Priority)

```tsx
import Image from 'next/image';
import heroImage from '@/public/img/hero-dashboard.jpg';

export function HeroSection() {
  return (
    <section className="relative w-full aspect-[16/9] max-h-[70vh]">
      <Image
        src={heroImage}
        alt="Financial dashboard hero"
        fill
        priority           // = loading="eager" + fetchpriority="high" + preload
        quality={85}       // LCP images: higher quality
        sizes="
          (min-width: 1200px) 50vw,
          (min-width: 768px)  66vw,
          100vw
        "
        style={{ objectFit: 'cover' }}
      />
    </section>
  );
}
```

### Content Image (Lazy)

```tsx
import Image from 'next/image';

export function ArticleImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={450}
      sizes="(min-width: 768px) 50vw, 100vw"
      quality={75}
      loading="lazy"
      placeholder="blur"
      blurDataURL="data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoEAAQAA...=="
    />
  );
}
```

### Static Import with Blur Placeholder

```tsx
import Image from 'next/image';
import productShot from '@/public/img/product.jpg';

// Next.js auto-generates the blurDataURL when using static imports
export function ProductImage() {
  return (
    <Image
      src={productShot}
      alt="Product photo"
      width={600}
      height={600}
      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      quality={80}
      placeholder="blur"   // Auto-generated blur placeholder from static import
    />
  );
}
```

### Remote Images (next.config.js)

```javascript
// next.config.js
const nextConfig = {
  images: {
    // Whitelist remote domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
        port: '',
        pathname: '/images/**',
      },
    ],

    // Output sizes for srcset generation
    deviceSizes: [400, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Default formats (Next.js generates WebP + AVIF automatically)
    formats: ['image/avif', 'image/webp'],

    // Minimum cache TTL for optimized images
    minimumCacheTTL: 31536000, // 1 year
  },
};

export default nextConfig;
```

### Next.js Image Summary

| Prop | LCP Image | Content Image | Thumbnail |
|------|-----------|---------------|-----------|
| `priority` | `true` | — | — |
| `loading` | (auto: eager) | `"lazy"` | `"lazy"` |
| `quality` | `85-90` | `75-80` | `60-70` |
| `placeholder` | `"blur"` | `"blur"` | `"blur"` |
| `sizes` | Required | Required | Required |

---

## 7. CLS Prevention from Images

Cumulative Layout Shift from images is entirely preventable. The rule is simple: **always reserve space.**

### Rule 1: Always Set Width and Height

```html
<!-- ❌ Causes layout shift — browser doesn't know dimensions until image loads -->
<img src="photo.jpg" alt="Photo" />

<!-- ✅ No layout shift — browser reserves exact space immediately -->
<img src="photo.jpg" alt="Photo" width="800" height="450" />
```

Modern browsers use `width` and `height` to calculate the aspect ratio and reserve space, even with CSS that overrides the intrinsic size.

### Rule 2: CSS `aspect-ratio` for Containers

```css
/* For containers that hold background images or fill-mode images */
.image-card {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #1a1a2e; /* Placeholder color while loading */
}

.image-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

### Rule 3: Skeleton Loader Placeholders

```jsx
function ImageWithSkeleton({ src, alt, width, height }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="image-wrapper"
      style={{
        aspectRatio: `${width} / ${height}`,
        backgroundColor: '#1e1e2e',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Skeleton shimmer — exactly matches the image dimensions */}
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, #1e1e2e 25%, #2a2a3e 50%, #1e1e2e 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      )}

      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  );
}
```

```css
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### Rule 4: Pre-calculate Dimensions from Metadata

At build time, extract image dimensions and bake them into your component:

```javascript
// scripts/generate-image-manifest.js
import sharp from 'sharp';
import { glob } from 'glob';
import fs from 'node:fs';

async function generateManifest() {
  const images = await glob('public/img/**/*.{jpg,jpeg,png,avif,webp}');

  const manifest = {};

  for (const img of images) {
    const metadata = await sharp(img).metadata();
    manifest[img] = {
      width: metadata.width,
      height: metadata.height,
      aspectRatio: (metadata.width / metadata.height).toFixed(4),
      format: metadata.format,
    };
  }

  fs.writeFileSync(
    'src/data/image-manifest.json',
    JSON.stringify(manifest, null, 2)
  );

  console.log(`Generated manifest with ${Object.keys(manifest).length} images`);
}

generateManifest();
```

```typescript
// src/lib/images.ts
import manifest from '@/data/image-manifest.json';

interface ImageMeta {
  width: number;
  height: number;
  aspectRatio: string;
  format: string;
}

export function getImageDimensions(src: string): ImageMeta {
  return manifest[src] ?? { width: 800, height: 450, aspectRatio: '1.7778', format: 'jpeg' };
}

// Usage:
// const { width, height } = getImageDimensions('/img/hero.jpg');
// <img src="/img/hero.jpg" width={width} height={height} alt="..." />
```

---

## 8. CDN & Delivery

### Why a CDN Matters for Images

| Without CDN | With CDN |
|-------------|----------|
| Served from a single origin server | Served from 200+ edge locations |
| 150-300ms latency for distant users | 5-30ms latency globally |
| Single point of failure | Highly available |
| No automatic format negotiation | Many CDNs auto-convert to WebP/AVIF |
| No automatic compression | Many CDNs auto-compress on first request |

### Cache Headers for Hashed Filenames

When your build pipeline produces hashed filenames (e.g., `hero-dashboard.a3f2b1c.avif`), the content is immutable. Set aggressive cache headers:

```nginx
# nginx.conf — Immutable cache for hashed images
location ~* ^/img/optimized/.*\.(avif|webp|jpg|jpeg|png|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable, max-age=31536000";
    add_header Vary "Accept";

    # Serve AVIF to browsers that accept it (auto-negotiation)
    # (Most CDNs handle this automatically — Cloudflare, Vercel, Netlify)
}
```

```javascript
// Vercel / Next.js — vercel.json headers
{
  "headers": [
    {
      "source": "/img/optimized/(.*)\\.(avif|webp|jpg|png|svg)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### CDN Image Transformation (on-the-fly)

If you use a CDN that supports on-the-fly transformations, you can skip the build-time resize step entirely:

```html
<!-- Cloudflare Images / imgix / Cloudinary pattern -->
<img
  src="https://cdn.example.com/img/hero.jpg?w=800&q=80&f=auto"
  srcset="
    https://cdn.example.com/img/hero.jpg?w=400&q=80&f=auto  400w,
    https://cdn.example.com/img/hero.jpg?w=800&q=80&f=auto  800w,
    https://cdn.example.com/img/hero.jpg?w=1200&q=80&f=auto 1200w
  "
  sizes="(min-width: 1200px) 50vw, 100vw"
  alt="Hero"
  width="1200"
  height="675"
/>

<!-- `f=auto` = auto-detect best format (AVIF > WebP > JPEG) -->
```

### HTTP/2 and HTTP/3

Image-heavy pages benefit massively from multiplexing:
- **HTTP/2**: Multiple image requests over a single connection (no more 6-connection limit)
- **HTTP/3 (QUIC)**: Zero head-of-line blocking, faster connection establishment

Ensure your CDN supports HTTP/3. Most major CDNs (Cloudflare, Fastly, Vercel) enable it by default.

---

## 9. What NOT to Do

### ❌ Serving a 3000px Image for a 300px Display Slot

```html
<!-- ❌ Downloads 2.4 MB for a 300px-wide card thumbnail -->
<img src="photo-3000px.jpg" alt="Photo" width="300" />

<!-- ✅ Serves the right size for the slot -->
<img
  src="photo-400w.jpg"
  srcset="photo-400w.jpg 400w, photo-800w.jpg 800w"
  sizes="300px"
  alt="Photo"
  width="300"
  height="200"
/>
```

### ❌ Missing `srcset` on Content Images

```html
<!-- ❌ Everyone gets the same 1200px image — mobile users pay the penalty -->
<img src="photo-1200w.jpg" alt="Photo" />

<!-- ✅ Browser picks the right resolution -->
<img
  src="photo-800w.jpg"
  srcset="photo-400w.jpg 400w, photo-800w.jpg 800w, photo-1200w.jpg 1200w"
  sizes="(min-width: 768px) 50vw, 100vw"
  alt="Photo"
  width="800"
  height="450"
/>
```

### ❌ Lazy-Loading the LCP Image

```html
<!-- ❌ Browser defers the hero image — kills LCP -->
<img src="hero.jpg" loading="lazy" />

<!-- ✅ Hero loads immediately -->
<img src="hero.jpg" loading="eager" fetchpriority="high" decoding="sync" />
```

### ❌ No Width/Height on Images

```html
<!-- ❌ Layout explodes when image loads -->
<img src="photo.jpg" alt="Photo" />

<!-- ✅ Browser reserves space immediately -->
<img src="photo.jpg" alt="Photo" width="800" height="450" />
```

### ❌ Using PNG for Photos

```
photo.png:   1.2 MB
photo.avif:  84 KB  (93% smaller — this is not a typo)
```

### ❌ `object-fit` Without `aspect-ratio`

```css
/* ❌ Card collapses to 0 height before image loads */
.card-image {
  width: 100%;
}

.card-image img {
  object-fit: cover;
}

/* ✅ Card maintains shape with or without the image */
.card-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

### ❌ Not Using `<link rel="preload">` for LCP Images in `<head>`

Without a preload, the browser discovers the LCP image only after parsing:
1. The HTML to the `<img>` tag
2. Any CSS that might affect which image loads
3. Any JavaScript that might modify the DOM

A `<link rel="preload">` in the `<head>` discovers the image on line 1 of the HTML parser.

---

## 10. Quick Checklist

Before shipping any image, verify every item:

### Format & Compression
- [ ] AVIF generated for all raster images (quality 60-75)
- [ ] WebP generated as fallback (quality 75-85)
- [ ] Progressive JPEG generated as final fallback (quality 78-82)
- [ ] PNG used only for screenshots or pixel-exact images
- [ ] SVG used for all icons, logos, and vector illustrations
- [ ] No raw BMP, TIFF, or uncompressed formats in production

### Responsive Images
- [ ] `<picture>` element used with `<source>` for AVIF and WebP
- [ ] `srcset` provides at least 3 width variants (400w, 800w, 1200w minimum)
- [ ] `sizes` attribute correctly reflects the rendered width at each breakpoint
- [ ] No 3000px images served to mobile devices
- [ ] Art direction (`media` attribute) used when crop differs by breakpoint

### LCP Image
- [ ] Hero image has `fetchpriority="high"`
- [ ] Hero image has `loading="eager"`
- [ ] Hero image has `decoding="sync"`
- [ ] `<link rel="preload">` in `<head>` with matching `imagesrcset` and `imagesizes`
- [ ] LCP image is an `<img>` tag (not CSS background-image)
- [ ] LCP image is in the initial viewport HTML (not injected by JS)

### Lazy Loading
- [ ] All below-fold images have `loading="lazy"`
- [ ] All below-fold images have `decoding="async"`
- [ ] No `loading="lazy"` on above-fold images

### CLS Prevention
- [ ] Every `<img>` has explicit `width` and `height` attributes
- [ ] Every image container has `aspect-ratio` set in CSS
- [ ] Skeleton or blur placeholder prevents flash of empty space
- [ ] No images injected without reserved space

### Build Pipeline
- [ ] Sharp (or equivalent) converts images at build time
- [ ] Images are optimized before deploy (`prebuild` script)
- [ ] Image dimensions are available at build time (manifest or static import)

### CDN & Caching
- [ ] Images served from CDN (not origin server)
- [ ] Cache-Control: `public, max-age=31536000, immutable` for hashed filenames
- [ ] CDN supports HTTP/3
- [ ] CDN auto-negotiates format if on-the-fly transformation is used

### Tooling-Specific (Next.js)
- [ ] `next/image` used instead of raw `<img>` tags
- [ ] `priority` prop on LCP image
- [ ] `placeholder="blur"` on all images
- [ ] `sizes` prop set correctly on every Image component
- [ ] `formats: ['image/avif', 'image/webp']` in `next.config.js`

---

## Key Metrics

- **Largest Contentful Paint (LCP):** Under 2.5s
- **Cumulative Layout Shift (CLS):** Under 0.1
- **First Contentful Paint (FCP):** Under 1.8s (Good per Google CWV)
- **Image bytes per page (above-fold):** Under 200 KB
- **Image bytes per page (total):** Under 500 KB
- **AVIF adoption rate:** 90%+ of raster images

→ Related: [DOM Discipline](./dom-discipline.md) — CLS prevention, lazy charts, reserved space patterns
→ Related: [Bundle Optimization](./bundle-optimization.md) — Critical CSS inlining, code splitting
