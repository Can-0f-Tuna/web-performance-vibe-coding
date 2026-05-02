# Database & Backend Performance

Eliminate slow queries, reduce server response times, and prevent database bottlenecks at scale.

---

## 1. N+1 Query Problem

The single most common backend performance killer. Executes one query per parent row — 100 posts means 101 queries instead of 1.

### The Bad Pattern (N+1)

```typescript
// app/api/posts/route.ts — DO NOT DO THIS
import { prisma } from '@/lib/prisma';

export async function GET() {
  // Query 1: Fetch all posts
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Queries 2-51: One query per post to fetch author
  // Queries 52-101: One query per post to fetch comments (if you loop again)
  const enriched = [];
  for (const post of posts) {
    const author = await prisma.user.findUnique({
      where: { id: post.authorId },
    });
    const comments = await prisma.comment.findMany({
      where: { postId: post.id },
    });
    enriched.push({ ...post, author, comments });
  }

  return Response.json(enriched);
}
// Result: 1 + (50 × 2) = 101 database round-trips
// Each round-trip = ~2ms connection overhead + ~1ms query = ~300ms minimum
// Under load, this crumbles exponentially
```

### Why It Happens

- **Lazy loading in ORMs**: Many ORMs default to lazy loading. Accessing a relation triggers a new query transparently. You never see the query, so you never suspect it.
- **Looping over query results**: The natural instinct is to loop and enrich.
- **GraphQL resolvers without dataloaders**: Each field resolver fires independently.

### Detection

```typescript
// Enable Prisma query logging to spot N+1
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [
    { emit: 'stdout', level: 'query' },
    { emit: 'stdout', level: 'warn' },
  ],
});

// In development, you'll see repeated queries for the same table.
// Production: use OpenTelemetry or query analytics in your database dashboard.
```

```sql
-- PostgreSQL: Check for frequently repeated queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
WHERE calls > 100
ORDER BY total_exec_time DESC
LIMIT 20;
```

### The Fix: Eager Loading

```typescript
// app/api/posts/route.ts — CORRECT
import { prisma } from '@/lib/prisma';

export async function GET() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      comments: {
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5, // Only fetch the 5 most recent comments
      },
    },
  });

  return Response.json(posts);
}
// Result: 1 query with JOINs — ~5ms total instead of ~300ms
```

### GraphQL-Specific Fix: DataLoader

```typescript
// lib/dataloaders.ts
import DataLoader from 'dataloader';
import { prisma } from '@/lib/prisma';

export const userLoader = new DataLoader(async (ids: readonly string[]) => {
  const users = await prisma.user.findMany({
    where: { id: { in: [...ids] } },
  });
  return ids.map((id) => users.find((u) => u.id === id) ?? null);
});

// Now in every request, batching is automatic — any User lookups within
// the same tick of the event loop are merged into a single query.
```

### Generic N+1 Guard

```typescript
// lib/no-n-plus-one.ts
// Drop-in wrapper that deduplicates and batches queries
export function createBatchedFetcher<T, K extends string>(
  fetcher: (keys: K[]) => Promise<T[]>,
) {
  let pendingKeys = new Set<K>();
  let pendingPromise: Promise<T[]> | null = null;

  return async (key: K): Promise<T | undefined> => {
    pendingKeys.add(key);
    if (!pendingPromise) {
      pendingPromise = new Promise((resolve) => {
        setTimeout(async () => {
          const keys = [...pendingKeys];
          pendingKeys = new Set();
          pendingPromise = null;
          const results = await fetcher(keys);
          resolve(results);
        }, 0); // Collect keys for the rest of this tick
      });
    }
    const results = await pendingPromise;
    return results.find(
      (r: unknown) => (r as Record<string, unknown>).id === key,
    );
  };
}
```

---

## 2. Database Indexes

Indexes turn linear scans into logarithmic lookups. Without them, every query reads the entire table.

### Finding Slow Queries

```sql
-- Enable pg_stat_statements (requires extension)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find the slowest queries in your database
SELECT
  queryid,
  LEFT(query, 200) AS query_snippet,
  calls,
  mean_exec_time::numeric(10, 2) AS avg_ms,
  total_exec_time::numeric(10, 2) AS total_ms,
  shared_blks_read AS disk_read_blocks
FROM pg_stat_statements
WHERE calls > 10
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Using EXPLAIN ANALYZE

```sql
-- EXPLAIN = shows the plan. EXPLAIN ANALYZE = runs the query and shows actual timings.
-- ALWAYS use ANALYZE — the planner's estimates can be wildly wrong.

EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = 'usr_abc123'
  AND status = 'pending'
ORDER BY created_at DESC
LIMIT 20;

-- Look for:
-- "Seq Scan" → No index, scanning entire table (BAD)
-- "Index Scan" or "Index Only Scan" → Using an index (GOOD)
-- "Bitmap Heap Scan" → Combining multiple indexes (OK, but single composite is better)
-- Planning time > 5ms → Overly complex query, simplify
-- Rows Removed by Filter → Data is being fetched then discarded
```

### Common EXPLAIN ANALYZE Patterns

```
-- ❌ Sequential scan on a large table
Seq Scan on orders  (cost=0.00..18490.00 rows=342 width=120)
  (actual time=0.023..145.230 rows=342 loops=1)
  Filter: (user_id = 'usr_abc123'::text)
  Rows Removed by Filter: 984658         -- Almost 1M rows read, 342 kept
Planning Time: 0.319 ms
Execution Time: 145.512 ms               -- Slow!

-- ✅ Index scan
Index Scan using idx_orders_user_id on orders
  (cost=0.42..218.34 rows=342 width=120)
  (actual time=0.015..0.852 rows=342 loops=1)
  Index Cond: (user_id = 'usr_abc123'::text)
Planning Time: 0.512 ms
Execution Time: 0.941 ms                 -- 150x faster!
```

### Adding Indexes

```sql
-- Single-column index: for queries filtering by one column
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Composite index (most common): column order matters!
-- Place equality filters first, then range/order columns
CREATE INDEX idx_orders_user_status_created
  ON orders(user_id, status, created_at DESC);

-- This index serves ALL of these queries:
-- WHERE user_id = ? AND status = ? ORDER BY created_at DESC  ✅
-- WHERE user_id = ? ORDER BY created_at DESC                 ✅ (skip scan)
-- WHERE user_id = ? AND status = ?                           ✅

-- But NOT this one (indexes are left-to-right):
-- WHERE status = ? ORDER BY created_at DESC                  ❌ (skips leading column)

-- Partial index: only indexes rows that match a condition
-- 10x smaller than full-table index if 90% of orders are 'completed'
CREATE INDEX idx_pending_orders
  ON orders(user_id, created_at DESC)
  WHERE status = 'pending';

-- Covering index: includes extra columns to avoid heap lookups
CREATE INDEX idx_orders_user_covering
  ON orders(user_id, created_at DESC)
  INCLUDE (total, status);
-- With this, SELECT user_id, total, status, created_at becomes an Index Only Scan
```

### Prisma: Adding Indexes via Schema

```prisma
model Order {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  status    String   @default("pending")
  total     Float
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@index([userId, status, createdAt(sort: Desc)], map: "idx_orders_user_status_created")
  @@index([status], map: "idx_orders_status")
}
```

### What NOT to Index

- **Low-cardinality columns** (boolean, `status` with 3 values): The planner often ignores these — sequential scan is faster than index+heap for 50/50 splits. Exception: partial indexes.
- **Every column individually**: Each index adds write overhead. Every INSERT/UPDATE/DELETE must maintain every index.
- **Unused indexes**: They waste disk and slow writes. Find them:

```sql
-- Find unused indexes (PostgreSQL)
SELECT
  schemaname || '.' || relname AS table,
  indexrelname AS index,
  pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
  idx_scan AS number_of_scans
FROM pg_stat_user_indexes ui
JOIN pg_index i ON ui.indexrelid = i.indexrelid
WHERE NOT indisunique   -- Don't drop unique constraint indexes
  AND idx_scan < 10     -- Used fewer than 10 times
  AND pg_relation_size(i.indexrelid) > 8192  -- Bigger than 8 KB
ORDER BY pg_relation_size(i.indexrelid) DESC;
```

- **Very small tables** (< 1000 rows): Sequential scan is faster. Postgres often ignores indexes on tiny tables anyway.
- **Tables with extreme write volume** (logs, events): Every index doubles write cost. Index only query-critical columns.

### Index Maintenance

```sql
-- Fragmentation: REINDEX rebuilds a bloated index
REINDEX INDEX CONCURRENTLY idx_orders_user_id;

-- Stale statistics: ANALYZE updates the query planner's data
ANALYZE orders;

-- Automatic analysis threshold (default: 10% of rows changed):
SELECT relname, n_live_tup, n_dead_tup, last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > n_live_tup * 0.2  -- >20% dead tuples
ORDER BY n_dead_tup DESC;

-- Vacuum dead tuples (bloat from frequent updates/deletes):
VACUUM ANALYZE orders;
```

---

## 3. Redis Cache-Aside Pattern

Reads check the cache first. On miss, query the database and populate the cache. The database is never queried for data that's fresh in Redis.

### Full Generic Implementation

```typescript
// lib/redis-cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

const DEFAULT_TTL = 300; // 5 minutes

interface CacheOptions {
  ttl?: number;           // Seconds
  staleWhileRevalidate?: boolean;
}

export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const { ttl = DEFAULT_TTL, staleWhileRevalidate = false } = options;

  // 1. Check cache
  try {
    const cached = await redis.get<{
      data: T;
      timestamp: number;
      ttl: number;
    }>(key);

    if (cached) {
      const age = Date.now() - cached.timestamp;
      const isStale = age > cached.ttl * 1000;

      if (!isStale || !staleWhileRevalidate) {
        return cached.data;
      }

      // Stale-while-revalidate: return stale data AND refresh in background
      if (staleWhileRevalidate && isStale) {
        fetcher()
          .then((fresh) => {
            redis.set(
              key,
              { data: fresh, timestamp: Date.now(), ttl },
              { ex: ttl * 2 }, // Store 2x TTL to allow SWR window
            );
          })
          .catch(() => {
            // Silently fail — stale data is better than no data
          });
        return cached.data;
      }
    }
  } catch (err) {
    // Redis is down — fall through to database, don't crash
    console.warn('[cacheAside] Redis unavailable, querying database:', err);
  }

  // 2. Cache miss — query database
  const data = await fetcher();

  // 3. Store in cache (fire-and-forget in background for lower latency)
  redis
    .set(key, { data, timestamp: Date.now(), ttl }, { ex: ttl * 2 })
    .catch(() => {});

  return data;
}

// Invalidate cache on writes
export async function invalidateCache(pattern: string): Promise<void> {
  if (!pattern.includes('*')) {
    await redis.del(pattern);
    return;
  }

  // Scan for keys matching pattern and delete them
  let cursor = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, {
      match: pattern,
      count: 100,
    });
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== 0);
}
```

### Next.js API Route with Redis Cache-Aside

```typescript
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cacheAside, invalidateCache } from '@/lib/redis-cache';

const CACHE_TTL = 3600; // 1 hour for user profiles

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await cacheAside(
    `user:${params.id}`,
    () =>
      prisma.user.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          bio: true,
          _count: { select: { posts: true, followers: true } },
        },
      }),
    {
      ttl: CACHE_TTL,
      staleWhileRevalidate: true,
    },
  );

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'CDN-Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json();

  const user = await prisma.user.update({
    where: { id: params.id },
    data: body,
  });

  // Invalidate cache after mutation
  await invalidateCache(`user:${params.id}`);

  return NextResponse.json(user);
}
```

### Cache Invalidation Strategy

```
┌────────────────────────────────────────────────────────────┐
│                      Write Path                            │
│                                                            │
│  Client ──> API Route ──> Write to DB ──> Invalidate      │
│                                            Redis key       │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                      Read Path                             │
│                                                            │
│  Client ──> API Route ──> Redis.get(key)                   │
│                              │                             │
│                    ┌─────────┴──────────┐                  │
│                    │                    │                  │
│                HIT │               MISS │                  │
│               Return              DB.get(key)              │
│               cached                 │                     │
│               data            Redis.set(key, data)         │
│                                     │                     │
│                                  Return data               │
└────────────────────────────────────────────────────────────┘
```

### Key TTL Guidelines

| Data Type | TTL | Reasoning |
|-----------|-----|-----------|
| User profile | 1 hour | Changes infrequently |
| Product catalog | 5 minutes | Inventory changes, but can tolerate slight staleness |
| Real-time prices | 5-30 seconds | Must stay current, but burst traffic needs protection |
| Static content | 24 hours | Almost never changes |
| AI-generated summaries | 10-30 minutes | Expensive to regenerate |
| Search results | 1-2 minutes | Results change frequently with new data |
| Configuration/settings | 1 hour | Changes rarely, manual invalidation on update |

---

## 4. Pagination That Scales

Never return unbounded results. One `findMany()` without `take` can pull millions of rows into memory and send them over the wire.

### Offset-Based Pagination

```typescript
// app/api/posts/route.ts
// Good for: public feeds, stable data
// Bad for: real-time feeds where new items insert at the top
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_PAGE_SIZE))),
  );
  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        _count: { select: { comments: true, likes: true } },
      },
    }),
    prisma.post.count(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    data: posts,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
}
```

### The Deep Offset Problem

```sql
-- Offset-based pagination gets progressively slower.
-- Page 1 is fast, page 1000 scans and discards 999 pages of data.

-- BAD: PostgreSQL scans 49,980 rows, returns 20
SELECT * FROM posts
ORDER BY created_at DESC
LIMIT 20 OFFSET 49980;

-- Execution time: ~800ms and climbing linearly
```

### Cursor-Based Pagination (Recommended)

```typescript
// app/api/posts/route.ts — Cursor-based
// Good for: infinite scroll, real-time feeds, chat messages
// How: Client sends the cursor (e.g., ID or timestamp of the last seen item)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MAX_LIMIT = 50;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor'); // Last seen post ID
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') ?? '20')),
  );

  // Build the cursor condition
  let cursorCondition = {};
  if (cursor) {
    // Get the cursor post's createdAt to use as the filter
    const cursorPost = await prisma.post.findUnique({
      where: { id: cursor },
      select: { createdAt: true },
    });
    if (cursorPost) {
      cursorCondition = {
        createdAt: { lt: cursorPost.createdAt },
      };
    }
  }

  const posts = await prisma.post.findMany({
    where: cursorCondition,
    orderBy: { createdAt: 'desc' },
    take: limit + 1, // Fetch one extra to determine if there's a next page
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      _count: { select: { comments: true, likes: true } },
    },
  });

  const hasNextPage = posts.length > limit;
  const data = hasNextPage ? posts.slice(0, limit) : posts;
  const nextCursor = data.length > 0 ? data[data.length - 1].id : null;

  return NextResponse.json({
    data,
    pagination: {
      nextCursor,
      hasNextPage,
      limit,
    },
  });
}
```

### Cursor Pagination with Composite Keys

```typescript
// When you need stable cursors where createdAt alone could have duplicates
// Use a tuple: (createdAt, id) — the id breaks ties

interface Cursor {
  createdAt: string; // ISO timestamp
  id: string;
}

function decodeCursor(encoded: string): Cursor {
  return JSON.parse(Buffer.from(encoded, 'base64').toString());
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawCursor = searchParams.get('cursor');
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));

  const whereClause = rawCursor
    ? (() => {
        const { createdAt, id } = decodeCursor(rawCursor);
        return {
          OR: [
            { createdAt: { lt: new Date(createdAt) } },
            {
              createdAt: { equals: new Date(createdAt) },
              id: { lt: id },
            },
          ],
        } as const;
      })()
    : {};

  const posts = await prisma.post.findMany({
    where: whereClause,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });

  const hasNextPage = posts.length > limit;
  const data = posts.slice(0, limit);
  const nextCursor = data.length > 0
    ? encodeCursor({
        createdAt: data[data.length - 1].createdAt.toISOString(),
        id: data[data.length - 1].id,
      })
    : null;

  return NextResponse.json({ data, nextCursor, hasNextPage });
}
```

### Client-Side Cursor Pagination Hook

```typescript
// hooks/useCursorPaginatedFetch.ts
import { useState, useCallback, useRef } from 'react';

interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export function useCursorPaginatedFetch<T>(url: string) {
  const [items, setItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const nextCursorRef = useRef<string | null>(null);

  const fetchNext = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const params = new URLSearchParams();
    if (nextCursorRef.current) params.set('cursor', nextCursorRef.current);

    const res = await fetch(`${url}?${params}`);
    const json: PaginatedResponse<T> = await res.json();

    setItems((prev) => [...prev, ...json.data]);
    nextCursorRef.current = json.nextCursor;
    setHasMore(json.hasNextPage);
    setLoading(false);
  }, [url, loading, hasMore]);

  const reset = useCallback(() => {
    setItems([]);
    nextCursorRef.current = null;
    setHasMore(true);
  }, []);

  return { items, hasMore, loading, fetchNext, reset };
}
```

---

## 5. Connection Pooling

Every database query requires a connection. Connections are expensive to create (TCP handshake, TLS, authentication). A pool keeps connections alive and reuses them, avoiding this overhead.

### The Problem Without Pooling

```
Request → Open connection (50ms) → Query (2ms) → Close connection (10ms) → Response
Total: 62ms, only 2ms was actual work. 97% overhead.

Request → Get from pool (0.1ms) → Query (2ms) → Return to pool (0.1ms) → Response
Total: 2.2ms. 96% faster.
```

### Prisma Connection Pool Configuration

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Set connection pool limits in DATABASE_URL
// postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10
//
// Key parameters:
// connection_limit=20  → Max concurrent connections in pool (default: num CPUs × 2 + 1)
// pool_timeout=10      → Seconds to wait for a connection before erroring (default: 10)
// idle_timeout=300     → Seconds before an idle connection is closed (default: 300)

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### PgBouncer Configuration

For high-traffic applications, use PgBouncer (connection pooler) between your app and PostgreSQL:

```ini
# pgbouncer.ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pooling mode: transaction is safest for web apps
# session = one connection per client (like direct PG)
# transaction = connection released after each transaction (RECOMMENDED)
# statement = connection released after each statement (no multi-statement transactions)
pool_mode = transaction

# Max total connections from clients to PgBouncer
max_client_conn = 1000

# Max actual PG connections PgBouncer maintains
default_pool_size = 20
# Reserve pool = connections always available for important queries
reserve_pool_size = 5

# Pool timeout
server_idle_timeout = 300
server_lifetime = 3600

# Logging
log_connections = 1
log_disconnections = 1
```

### Connection Pool Exhaustion Symptoms

| Symptom | What's Happening |
|---------|-----------------|
| `Timed out waiting for connection` | All connections are in use and none returned within `pool_timeout` |
| Requests queue up under load | Throughput flatlines while latency spikes |
| `too many clients already` | PostgreSQL hit its `max_connections` limit |
| Idle in transaction connections pile up | Query error or crash left a connection open without COMMIT/ROLLBACK |
| Memory grows over time | Connections never released; eventually OOM |

### Fixing Pool Exhaustion

```sql
-- Find idle-in-transaction connections (the most common leak)
SELECT pid, state, age(now(), query_start) AS duration, query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND age(now(), query_start) > interval '30 seconds'
ORDER BY duration DESC;

-- Terminate stuck connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND age(now(), query_start) > interval '5 minutes';
```

```typescript
// Prevent idle-in-transaction in your code
// Prisma: always use the interactive transaction API, never raw .beginTransaction()

// ❌ Raw transaction — if the callback throws before rollback, connection is stuck
const tx = await prisma.$transaction([
  prisma.user.update({ where: { id }, data: { name } }),
  // If this fails mid-way...
  prisma.post.update({ where: { id: postId }, data: { title } }),
]);

// ✅ Interactive transaction — automatic rollback on error
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.update({ where: { id }, data: { name } });
  const post = await tx.post.update({ where: { id: postId }, data: { title } });
  return { user, post };
  // If this throws, tx auto-rolls back and the connection is returned to pool
});
```

---

## 6. HTTP Cache-Control Headers

Cache-Control headers are the single highest-leverage performance change you can make. Correct headers eliminate requests entirely.

### The Four Directives You Need

| Directive | Meaning |
|-----------|---------|
| `max-age=N` | Cache for N seconds from the time of the request |
| `s-maxage=N` | `max-age` but for shared caches (CDNs) only; browser ignores it |
| `stale-while-revalidate=N` | Serve stale cached copy for N seconds while revalidating in the background |
| `immutable` | The resource will never change. Browser skips revalidation entirely. |
| `no-cache` | MUST revalidate with server before using cached copy (does NOT mean "don't cache") |
| `no-store` | Do NOT cache at all. Use for sensitive data (bank balances, PII). |
| `must-revalidate` | Once stale, MUST revalidate. Prevents serving stale data during network errors. |
| `private` | Only browser can cache. CDN/proxy MUST NOT. |
| `public` | Anyone can cache (browser, CDN, proxy). |

### Complete Table by Asset Type

#### Static Assets with Content Hash (fingerprinted)

```nginx
# NGINX — assets with hashes in filename (e.g., main.a1b2c3d4.js)
location ~* \.[a-f0-9]{8}\.(js|css|woff2|png|jpg|webp|avif|svg)$ {
  expires 1y;
  add_header Cache-Control "public, max-age=31536000, immutable";
  add_header Vary "Accept-Encoding";
}

# Immutable means "this URL's content will NEVER change."
# The browser will never even make a conditional request (If-None-Match).
# Net cost for repeat visits: 0ms. Completely free.
```

```typescript
// Next.js — assets in the _next/static directory
// (Next.js sets these headers automatically for hashed assets)
// No manual work needed — but verify in production.
```

#### Static Assets WITHOUT Content Hash

```
# e.g., /logo.png, /favicon.ico, /fonts/custom.woff2
Cache-Control: public, max-age=86400, stale-while-revalidate=604800

# max-age=86400      → Cache for 1 day
# SWR=604800         → For 7 days after that, serve stale instantly,
#                       then fetch fresh in the background.
#
# Result: Return visitors get 0ms responses. New visitors get 0ms responses
#         for a full week after the last time you updated the asset.
```

#### API Responses

```
# Public data that can be slightly stale
# e.g., product listings, search results, leaderboards
Cache-Control: public, max-age=300, stale-while-revalidate=3600

# max-age=300     → 5 minutes fresh
# SWR=3600        → Serve stale for 1 hour while revalidating
```

```
# Personalized data — cached by browser, NOT by CDN
# e.g., user profile, settings, dashboard widgets
Cache-Control: private, max-age=60, stale-while-revalidate=300

# private → CDN skips this. Only the user's browser caches it.
```

#### HTML Pages

```
# HTML is NEVER immutable — must always check for updates
Cache-Control: no-cache, must-revalidate

# no-cache: Cache it, but ALWAYS check with server before using (ETag/Last-Modified)
# must-revalidate: Once stale, never serve without checking (even if network errors)
# This allows 304 Not Modified responses — browser sends request,
# server says "still valid" and returns 0 bytes. Win-win.
```

#### Assets That Should NEVER Be Cached

```
# User-specific sensitive data, banking, auth tokens
Cache-Control: no-store
# Not even the browser stores a copy. Every request goes to origin.
```

### What `immutable` Actually Does

```
Without immutable:
  Browser requests /main.a1b2c3d4.js
  → Server returns 200 OK + file
  → User refreshes page
  → Browser sends conditional request: "If-None-Match: a1b2c3d4"
  → Server returns 304 Not Modified (0 bytes, but still a round-trip)
  → Cost: 1 RTT (~50ms on mobile)

With immutable:
  Browser requests /main.a1b2c3d4.js
  → Server returns 200 OK + Cache-Control: immutable
  → User refreshes page
  → Browser serves from cache. NO request. 0ms. Zero network.
  → This works indefinitely — even after a hard reload in Chrome.
```

### What `stale-while-revalidate` Actually Does

```
Timeline for /api/leaderboard with Cache-Control: max-age=60, SWR=300:

t=0:     Client fetches → Cache MISS → Server responds (100ms)
t=30s:   Client fetches → Cache HIT → Instant (0ms)
t=90s:   Cache is STALE (max-age expired)
         Client fetches → Serves stale copy INSTANTLY (0ms)
         Background: Fetches fresh from server (100ms, user doesn't wait)
         Updates cache with fresh copy
t=120s:  Client fetches → Cache HIT (the fresh copy) → Instant (0ms)
t=400s:  Past SWR window → Cache MISS → Full fetch to server (100ms)

The user NEVER waits for the server after the first fetch within the SWR window.
```

### Next.js Response Helper

```typescript
// lib/cache-headers.ts
export const CacheProfiles = {
  // Hashed static assets — set by Next.js automatically
  assetHashed: 'public, max-age=31536000, immutable',

  // Unhashed static assets (e.g., /images/logo.png)
  asset: 'public, max-age=86400, stale-while-revalidate=604800',

  // Public API responses (product listings, search, etc.)
  api: 'public, max-age=300, stale-while-revalidate=3600',

  // Private API responses (user profile, settings)
  apiPrivate: 'private, max-age=60, stale-while-revalidate=300',

  // HTML pages
  html: 'no-cache, must-revalidate',

  // Never cache
  noCache: 'no-store',
} as const;

export function withCacheHeader(
  response: Response,
  profile: string,
  cdnMaxAge?: number,
): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', profile);

  if (cdnMaxAge !== undefined) {
    headers.set(
      'CDN-Cache-Control',
      `public, max-age=${cdnMaxAge}, stale-while-revalidate=604800`,
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
```

### ETag and Last-Modified (Secondary Caching)

```
Cache-Control is the primary mechanism. But browsers and CDNs also use:
  ETag: "abc123"           → Hash of the response body
  Last-Modified: Mon, ...  → Timestamp of last change

When the browser sends a conditional request:
  If-None-Match: "abc123"
  If-Modified-Since: Mon, ...

Server checks if content changed:
  Changed   → 200 OK (full body)
  Unchanged → 304 Not Modified (0 bytes body — 10x smaller than 200)

ETags are automatic in most frameworks. Verify they're present.
```

---

## 7. Response Compression

Compress text-based responses (HTML, CSS, JS, JSON, SVG, XML, fonts). Never compress images, video, or anything already compressed.

### Brotli vs Gzip

```
Brotli: 15-20% smaller than gzip for text, but slightly slower to compress.
         Use for static assets (compress once at build time).
         Use for dynamic API responses if you have CPU headroom.

Gzip:   ~10% less compression than Brotli, but faster. Good default for dynamic content.

Choose: Brotli for static assets, Gzip for dynamic unless you pre-compress.
        If your CDN supports it, serve Brotli at the edge.
```

### Express Middleware

```javascript
// server.js
const express = require('express');
const compression = require('compression');
const shrinkRay = require('shrink-ray-current'); // Brotli support

const app = express();

// Gzip (built into Express compression)
app.use(
  compression({
    level: 6,              // 1-9: 9 is smallest but slowest. 6 is sweet spot.
    threshold: 1024,       // Only compress responses > 1 KB
    filter: (req, res) => {
      // Don't compress images, video, or already-compressed formats
      const ct = res.getHeader('Content-Type');
      if (/image|video|audio|zip|pdf/.test(ct)) return false;
      return compression.filter(req, res);
    },
  }),
);

// Brotli (better compression, supported by all modern browsers)
// Use shrink-ray for Brotli support with gzip fallback
app.use(
  shrinkRay({
    brotli: { quality: 11 },    // 11 = maximum Brotli compression
    zlib: { level: 6 },          // gzip fallback
    threshold: 1024,
    filter: (req, res) => {
      const ct = res.getHeader('Content-Type');
      if (/image|video|audio|zip|pdf/.test(ct)) return false;
      return true;
    },
  }),
);

app.listen(3000);
```

### Next.js (Built-in)

```javascript
// next.config.js — Next.js doesn't compress API routes by default
// Add a custom middleware or use a reverse proxy (NGINX, Cloudflare)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: Next.js automatically compresses static files with gzip and brotli
  // during build. API routes need external compression (NGINX, Cloudflare, etc.)

  // Vercel: compression is handled automatically at the edge.
  // Self-hosted: configure your reverse proxy:

  // Option 1: NGINX proxy in front of Next.js
  // Option 2: Express wrapper (see above)
  // Option 3: Cloudflare/CDN with Brotli enabled
};

module.exports = nextConfig;
```

### NGINX Compression Configuration

```nginx
# /etc/nginx/conf.d/compression.conf
# Brotli requires the ngx_brotli module

brotli on;
brotli_comp_level 6;       # 1-11: 6 is production sweet spot
brotli_types
  text/plain
  text/css
  text/javascript
  application/javascript
  application/json
  application/xml
  application/rss+xml
  image/svg+xml
  font/ttf
  font/otf
  font/woff
  font/woff2;

gzip on;
gzip_comp_level 6;
gzip_min_length 1024;
gzip_vary on;               # Add Vary: Accept-Encoding header
gzip_proxied any;
gzip_types
  text/plain
  text/css
  text/javascript
  application/javascript
  application/json
  application/xml
  application/rss+xml
  image/svg+xml;
```

### What to Compress

```
✅ Compress these:
  - HTML                    (text/html)
  - CSS                     (text/css)
  - JavaScript              (text/javascript, application/javascript)
  - JSON                    (application/json)
  - SVG                     (image/svg+xml) ← This is XML/text!
  - Fonts                   (font/ttf, font/otf, font/woff, font/woff2)
  - XML, RSS, Atom          (application/xml, application/rss+xml, ...)

❌ DO NOT compress these:
  - Images                  (image/png, image/jpeg, image/webp, image/avif)
                            ← Already compressed. Compressing again adds CPU
                               and often INCREASES size.
  - Video/Audio             (video/mp4, audio/mpeg, ...)
  - PDFs, ZIPs              (application/pdf, application/zip, ...)
  - Already-compressed      (application/gzip, ...)
```

### Verify Compression is Working

```bash
# Check if a URL returns compressed content
curl -H "Accept-Encoding: br, gzip" -I https://example.com/api/data \
  | grep -i content-encoding

# Expected: content-encoding: br  (or gzip)

# Measure the savings
curl -s https://example.com/api/data \
  | wc -c  # Uncompressed size
curl -s -H "Accept-Encoding: br" https://example.com/api/data \
  | wc -c  # Brotli size — should be 70-80% smaller for text
```

---

## 8. Database Query Optimization Checklist

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| API response > 500ms | N+1 queries | Use `include` (Prisma) or `JOIN` (raw SQL). Enable query logging to detect. |
| Query gets slower over time (days) | Missing index on filtered/sorted column | Run `EXPLAIN ANALYZE`. Look for "Seq Scan". Add `CREATE INDEX`. |
| Query fast on dev, slow in production | Index exists but statistics are stale | `ANALYZE table_name;` |
| Query fast for first few pages, slow for deep pages | OFFSET scanning all previous rows | Switch to cursor-based pagination. |
| Random spikes in latency | Connection pool exhaustion or lock contention | Check `pg_stat_activity` for waiting queries. Increase `connection_limit` or add PgBouncer. |
| Memory grows until crash | No connection pool. Each request opens a new connection. | Configure Prisma connection pool. Add PgBouncer. |
| "too many clients already" error | `max_connections` hit | Use PgBouncer transaction pooling. Check for connection leaks. |
| Write-heavy table reads are slow | Index bloat; dead tuples from updates/deletes | `VACUUM ANALYZE table_name;`. Consider `REINDEX`. |
| COUNT(*) on large tables is slow | Full table scan; no index covering the count | Use estimate: `SELECT reltuples::bigint FROM pg_class WHERE relname = 'table_name';` For exact: partial index + `WHERE` clause to narrow. |
| Query works in dev, timeout in production | Different data volume; query plan changed | `EXPLAIN ANALYZE` in production. Bind parameter sniffing can cause bad plans. |
| Full-text search is slow | No GIN index on the search column | `CREATE INDEX idx_search ON posts USING GIN(to_tsvector('english', content));` |
| Sorting by unfiltered column is slow | Index doesn't cover the ORDER BY column | Add composite index with the ORDER BY column as the last column. |
| JOINs are slow | No index on the foreign key column | Index every foreign key column. Always. |
| `WHERE ... IN (...)` with large array is slow | Array is too large; ORM generates inefficient query | Limit to 1000 values. Batch or use `WHERE column = ANY($1::type[])` |
| JSON/JSONB query is slow | Indexing JSON without GIN | `CREATE INDEX idx_data ON table USING GIN(data jsonb_path_ops);` |
| Transaction blocks for seconds | Long-running transaction holding locks | Keep transactions as short as possible. Never do I/O inside a transaction. |
| Same query run repeatedly | No caching layer | Add Redis cache-aside for expensive queries. Set HTTP `Cache-Control` headers for stable data. |

---

## 9. What NOT to Do

### ❌ SELECT * (Star Select)

```typescript
// ❌ Pulls every column — including large TEXT/BLOB fields, timestamps you don't need
const user = await prisma.user.findMany();
// Returns: id, name, email, password_hash, bio, avatar, settings_json, updated_at, ...

// ✅ Select only what the frontend actually needs
const user = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    avatar: true,
  },
});
// Returns: id, name, avatar — 10x smaller, 10x faster, no risk of leaking password_hash
```

### ❌ Missing WHERE on UPDATE / DELETE

```typescript
// ❌ If condition is empty/falsy, this updates EVERY ROW
await prisma.product.updateMany({
  data: { price: 9.99 },
  // where: { category: 'clearance' }, ← Forgot this? Devastating.
});

// ✅ Guard clause — refuse to run without a WHERE
function safeUpdateMany<T extends Record<string, unknown>>(
  model: { updateMany: (args: { where: T; data: T }) => Promise<unknown> },
  where: T | undefined,
  data: T,
) {
  if (!where || Object.keys(where).length === 0) {
    throw new Error('updateMany requires a non-empty WHERE clause');
  }
  return model.updateMany({ where, data });
}

// Prisma also provides the $queryRawUnsafe escape hatch — NEVER use
// template literals with user input. Always use parameterized queries:
// ❌ prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`)
// ✅ prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`
```

### ❌ No Connection Pool Limits

```typescript
// ❌ New PrismaClient per request (serverless)
export async function handler(req: Request) {
  const prisma = new PrismaClient(); // Opens a NEW connection every request
  const users = await prisma.user.findMany();
  // Connection is never closed or returned to pool
  return Response.json(users);
}
// Each cold start opens a connection. 1000 concurrent requests = 1000 connections.
// PostgreSQL max_connections defaults to 100. Crash.

// ✅ Singleton PrismaClient with connection limit
// (shown in section 5 above — use globalForPrisma pattern)

// ✅ For serverless (Lambda, Vercel Serverless):
// Prisma Data Proxy (managed connection pooling):
// DATABASE_URL="prisma://aws-us-east-1.prisma-data.com/?api_key=..."
// Alternatives: PgBouncer at the network layer, or use HTTP-based DB (Neon, PlanetScale)
```

### ❌ Caching Without Invalidation Strategy

```typescript
// ❌ Cache-first without invalidation = stale data forever
let cachedPosts: Post[] | null = null;

async function getPosts() {
  if (cachedPosts) return cachedPosts; // Returns stale data FOREVER
  const posts = await db.post.findMany();
  cachedPosts = posts;
  return posts;
}
// When a new post is created, cachedPosts is never updated. Users see old data.

// ✅ TTL-based cache with invalidation hooks
const CACHE = new Map<string, { data: unknown; expires: number }>();

async function cachedFetch<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const entry = CACHE.get(key);
  if (entry && Date.now() < entry.expires) {
    return entry.data as T;
  }
  const data = await fetcher();
  CACHE.set(key, { data, expires: Date.now() + ttl * 1000 });
  return data;
}

function invalidate(key: string) {
  CACHE.delete(key);
}

// Usage:
// getPosts:     cachedFetch('posts', 300, () => db.post.findMany())
// createPost:   ...db insert... + invalidate('posts')
```

### ❌ No Timeouts on Database Operations

```typescript
// ❌ No timeout — a hung query blocks the request forever
const user = await prisma.user.findUnique({ where: { id } });

// ✅ Timeout wrapper — fail fast instead of hanging
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms),
  );
  return Promise.race([promise, timeout]);
}

const user = await withTimeout(
  prisma.user.findUnique({ where: { id } }),
  3000,
  'user lookup',
).catch((err) => {
  console.error('Database timeout:', err);
  return null; // Graceful degradation
});
```

### ❌ Synchronous/Blocking I/O in Node.js API Routes

```typescript
// ❌ Blocking the entire event loop
import { readFileSync, writeFileSync } from 'fs';

export async function GET() {
  const config = readFileSync('/etc/config.json', 'utf-8'); // Blocks ALL requests
  return Response.json(JSON.parse(config));
}

// ✅ Async everything
import { readFile, writeFile } from 'fs/promises';

export async function GET() {
  const config = await readFile('/etc/config.json', 'utf-8'); // Non-blocking
  return Response.json(JSON.parse(config));
}

// ❌ CPU-heavy sync work
function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2); // Blocks event loop
}

// ✅ Offload to worker thread
// worker.ts
import { parentPort } from 'worker_threads';
parentPort?.on('message', (n: number) => {
  function fib(n: number): number {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
  }
  parentPort?.postMessage(fib(n));
});

// route.ts
import { Worker } from 'worker_threads';
function fibAsync(n: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.ts');
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.postMessage(n);
  });
}
```

### ❌ Premature Optimization

```
Before you add Redis, rewrite SQL, or add indexes:
1. Measure: Is the query actually slow? (> 50ms? > 200ms?)
2. Identify: Is it the database, network, or serialization?
3. Fix: Apply ONE fix. Measure again.
4. Guard: Add a regression test or monitoring alert.

Don't build a caching layer for a query that takes 3ms.
Don't add indexes you haven't verified with EXPLAIN ANALYZE.
Don't introduce infrastructure (Redis, PgBouncer) until you've maxed out the simpler fixes.
```

---

## Quick Reference: Decision Tree

```
Is your API slow?
│
├─> TTFB > 500ms?
│   ├─> Database queries summing to > 200ms?
│   │   ├─> N+1 problem? → Add eager loading with include
│   │   ├─> Seq Scan in EXPLAIN? → Add indexes
│   │   ├─> Same query repeated? → Add Redis cache-aside
│   │   └─> Returning too much data? → Paginate + select only needed fields
│   │
│   ├─> Connection pool exhausted?
│   │   └─> pg_stat_activity shows 20+ idle-in-transaction?
│   │       → Fix transaction leaks. Add PgBouncer. Increase pool.
│   │
│   └─> Serialization overhead?
│       └─> Large JSON payloads? → Enable Brotli. Select fewer fields.
│
├─> Transfer phase slow (content downloading)?
│   ├─> Large response body? → Enable Brotli/gzip. Paginate. Select fewer fields.
│   └─> Slow network? → Set Cache-Control headers. Use CDN.
│
└─> Client-side processing slow?
    └─> Large JSON parse? → Stream the response. Use smaller payloads.
```

---

## Monitoring Queries

### Performance Budgets for Backend

| Metric | Budget | Alert at |
|--------|--------|----------|
| API response p50 | < 50ms | > 100ms |
| API response p95 | < 200ms | > 500ms |
| API response p99 | < 500ms | > 1000ms |
| Database query p50 | < 5ms | > 20ms |
| Database query p95 | < 50ms | > 200ms |
| Connection pool utilization | < 60% | > 80% |
| Cache hit rate | > 80% | < 50% |
| Error rate | < 0.1% | > 1% |

### Quick Monitoring Setup

```typescript
// lib/monitoring.ts
import { prisma } from '@/lib/prisma';

type Metric = {
  totalMs: number;
  count: number;
  p50: number;
  p95: number;
};

const metrics = new Map<string, Metric>();

export function trackQuery(name: string, durationMs: number) {
  let m = metrics.get(name);
  if (!m) {
    m = { totalMs: 0, count: 0, p50: 0, p95: 0 };
    metrics.set(name, m);
  }
  m.totalMs += durationMs;
  m.count += 1;
  m.p50 = m.totalMs / m.count;

  // Log slow queries in development
  if (durationMs > 50) {
    console.warn(`[SLOW QUERY] ${name}: ${durationMs.toFixed(1)}ms`);
  }
}

// Wrap Prisma with query timing via Prisma client extensions (v5+)
// NOTE: prisma.$use() was deprecated in Prisma v5. Use $extends instead.
const prismaWithTiming = prisma.$extends({
  query: {
    $allOperations: async ({ model, operation, args, query }) => {
      const start = performance.now();
      const result = await query(args);
      const duration = performance.now() - start;
      trackQuery(`${model}.${operation}`, duration);
      return result;
    },
  },
});

// Dump stats on interval in dev
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats: Record<string, { avg: number; count: number }> = {};
    for (const [name, m] of metrics.entries()) {
      stats[name] = { avg: m.totalMs / m.count, count: m.count };
    }
    if (Object.keys(stats).length > 0) {
      console.table(stats);
    }
  }, 60000);
}
```
