# Perceived Performance: The Psychology of Speed

User perception of speed is shaped by neuroscience, not stopwatch timing. A 3-second operation that
_feels_ like 300ms beats a 500ms operation that feels like 2 seconds. This reference covers the
psychological principles and implementation patterns that make interfaces feel instantaneous.

---

## 1. The 80ms Neural Threshold

Our brains buffer sensory input for roughly 80ms before conscious awareness. Any operation that
completes within this window is perceived as _instantaneous_ — zero delay, zero friction. This is
your gold target for micro-interactions.

### What This Means in Practice

| Duration | Perception | Appropriate For |
|----------|------------|-----------------|
| 0–80ms | Instant | Hover feedback, button press, toggle, ripple |
| 80–200ms | Snappy | Dropdown open, tooltip, swipe reveal |
| 200–500ms | Noticeable but acceptable | Panel open, light navigation |
| 500ms–1s | Starting to feel slow | Page transitions, heavy modals |
| 1s+ | Risk of user abandonment | Full page loads, complex reports |

### The Neuroscience

The brain buffers sensory information for 70–100ms to construct a coherent temporal "window" of
experience. When system response lands inside this buffer, the brain cannot distinguish it from zero
latency. This is why a button press with 60ms visual feedback feels like a physical reaction.

### 80ms Budget Examples

```javascript
// 80ms window is tight but enough for:
// - CSS toggle class (browser handles in ~1ms)
// - DOM classList.add/remove (sub-millisecond)
// - Setting a React state that causes a CSS transition (under 10ms)
// - requestAnimationFrame callbacks (16ms at most)
// - A single localStorage read (~1ms)
// - IndexedDB read of a single key (~5–15ms)

// ✅ Hover feedback: ~1ms, well inside the 80ms window
button.addEventListener('pointerenter', () => {
  button.classList.add('hover'); // <1ms — instant
});

// ✅ Toggle switch: rendered by the next frame (16ms at most)
function Toggle() {
  const [on, setOn] = useState(false);
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => setOn(!on)}   // React batches this, renders by next RAF
      className={on ? 'on' : 'off'}
    />
  );
}

// ✅ Optimistic counter — update state in 1ms, sync to server in background
function LikeButton({ postId }) {
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(post.liked);

  const handleLike = () => {
    const nextLiked = !liked;
    setLiked(nextLiked);                    // Instant — 1ms
    setLikes(prev => prev + (nextLiked ? 1 : -1)); // Instant — 1ms

    // API call happens AFTER the UI update
    fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      body: JSON.stringify({ liked: nextLiked }),
    }).catch(() => {
      // Only revert if the API call failed
      setLiked(!nextLiked);
      setLikes(prev => prev + (nextLiked ? -1 : 1));
    });
  };

  return (
    <button onClick={handleLike} className={liked ? 'active' : ''}>
      {liked ? '❤️' : '🤍'} {likes}
    </button>
  );
}

// ❌ Waiting for the server before updating: 200ms+ — feels sluggish
async function slowLike() {
  await fetch('/api/like');     // 200ms network round-trip
  setLikes(prev => prev + 1);  // UI updates AFTER the wait
}
```

### The 100ms Rule (from Nielsen Norman Group)

A related finding: responses within 100ms feel the system is reacting _causally_ to the user's action.
Between 100ms and 1 second, the user still feels in control but notices the delay. Beyond 1 second,
the user's attention begins to wander. Target 80ms for micro-interactions, 100ms as your hard ceiling.

---

## 2. Optimistic UI

Optimistic UI means updating the interface _immediately_ as if the operation succeeded, then
reconciling with the server. When it works, the user perceives zero latency. When it fails, you
must roll back gracefully.

### Core Pattern

```jsx
function useOptimistic(apiCall) {
  const [state, setState] = useState({ data: null, error: null, loading: false });

  const execute = async (optimisticUpdate) => {
    // 1. Save previous state for rollback
    const previous = state.data;

    // 2. Apply optimistic update immediately
    setState({ data: optimisticUpdate(state.data), error: null, loading: true });

    try {
      // 3. Send to server
      const result = await apiCall(optimisticUpdate(state.data));
      setState({ data: result, error: null, loading: false });
    } catch (err) {
      // 4. Rollback on failure
      setState({ data: previous, error: err.message, loading: false });
    }
  };

  return [state, execute];
}

// Usage: Todo list with optimistic add
function TodoList() {
  const [state, execute] = useOptimistic(addTodoToServer);

  const addTodo = (text) => {
    execute((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, text, completed: false, _pending: true }
    ]);
  };

  return (
    <ul>
      {state.data?.map((todo) => (
        <li key={todo.id} className={todo._pending ? 'opacity-50' : ''}>
          {todo.text}
          {todo._pending && <span className="spinner-sm" />}
        </li>
      ))}
    </ul>
  );
}
```

### Like / Favorite Toggle — Full React Example

```jsx
import { useState, useRef } from 'react';

function OptimisticLike({ postId, initialLiked, initialCount }) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const retryId = useRef(`like-${postId}-${Date.now()}`);
  const abortRef = useRef(null);

  const toggle = async () => {
    // Cancel any in-flight request
    abortRef.current?.abort();

    const prevLiked = liked;
    const prevCount = count;
    const nextLiked = !liked;

    // Instant UI update
    setLiked(nextLiked);
    setCount(prev => prev + (nextLiked ? 1 : -1));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: nextLiked, retryId: retryId.current }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error('Server rejected');

      const { count: serverCount } = await res.json();
      setCount(serverCount); // Reconcile with ground truth
    } catch (err) {
      if (err.name === 'AbortError') return;
      // Rollback to previous state
      setLiked(prevLiked);
      setCount(prevCount);
    }
  };

  return (
    <button
      onClick={toggle}
      className={`like-btn ${liked ? 'liked' : ''}`}
      aria-label={liked ? 'Unlike' : 'Like'}
      aria-pressed={liked}
    >
      <HeartIcon filled={liked} />
      <span className="count">{count}</span>
    </button>
  );
}
```

### When NOT to Use Optimistic UI

Some operations should never be optimistic due to the severity of a potential rollback:

```jsx
// ❌ NEVER optimistic for destructive actions
async function deleteAccount() {
  // Do NOT show "Account deleted" then revert — user may close tab
  // Do NOT optimistically deduct balance for a payment
  // Do NOT optimistically remove admin access
  // Do NOT optimistically publish content
}

// ❌ NEVER optimistic for financial transactions
async function processPayment(amount) {
  // A failed optimistic deduction could let users spend money twice
  // Always confirm server-side before showing success
}

// ✅ Use a "processing" state with optimistic lock instead
function PaymentButton({ amount }) {
  const [status, setStatus] = useState('idle'); // idle | processing | success | error

  const pay = async () => {
    setStatus('processing'); // Block double-click, don't show success yet
    try {
      await api.processPayment(amount);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <button disabled={status !== 'idle'} onClick={pay}>
      {status === 'idle' && `Pay $${amount}`}
      {status === 'processing' && 'Processing...'}
      {status === 'success' && 'Paid!'}
      {status === 'error' && 'Failed — Try Again'}
    </button>
  );
}

// ✅ Good candidates for optimistic UI:
// - Toggle states (like, bookmark, pin, subscribe)
// - Reorder items (drag-and-drop lists)
// - Inline edits (editing a title inline)
// - Checkbox status (mark task complete)
// - Read/unread state
```

### Rollback UX — Making Failure Feel Graceful

```jsx
function OptimisticInput({ value: initialValue, onSave }) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState('saved'); // saved | saving | error

  const save = async (newValue) => {
    setStatus('saving');
    setValue(newValue);
    try {
      await onSave(newValue);
      setStatus('saved');
    } catch {
      setStatus('error');
      // Auto-revert after 3 seconds if no user action
      setTimeout(() => {
        setValue(initialValue);
        setStatus('saved');
      }, 3000);
    }
  };

  return (
    <div className="optimistic-input">
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setStatus('saving');
        }}
        onBlur={() => save(value)}
      />
      <span className={`status-${status}`}>
        {status === 'saving' && 'Saving...'}
        {status === 'saved' && '✓'}
        {status === 'error' && 'Reverting...'}
      </span>
    </div>
  );
}
```

---

## 3. Skeleton Screens vs Spinners

A single spinning circle tells the user "wait." A skeleton screen says "here is the shape of what's
coming — it's already loading." Skeletons shift the mental model from _waiting_ to _loading_,
which feels faster even when it takes the same amount of time.

### Why Spinners Feel Slower

- Spinners are generic — no information about what's loading
- They signal "the system is busy" rather than "content is arriving"
- A blank screen with a spinner makes the wait feel longer than it is
- Spinners create a "loading gap" — dead time with no visual progress

### CSS Shimmer Animation

```css
.skeleton {
  background: linear-gradient(
    90deg,
    #e0e0e0 25%,
    #f0f0f0 50%,
    #e0e0e0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Skeleton shapes that preview the layout */
.skeleton--text      { height: 16px; width: 80%; margin-bottom: 8px; }
.skeleton--text-short{ height: 16px; width: 50%; margin-bottom: 8px; }
.skeleton--title     { height: 24px; width: 60%; margin-bottom: 16px; }
.skeleton--avatar    { height: 48px; width: 48px; border-radius: 50%; }
.skeleton--thumbnail { height: 200px; width: 100%; margin-bottom: 16px; }
.skeleton--button    { height: 40px; width: 120px; border-radius: 8px; }

/* Reduced-motion: static skeleton, no shimmer */
@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
    background: #e0e0e0;
  }
}
```

### React Suspense with Skeleton Fallback

```jsx
import { Suspense } from 'react';

function ProfileSkeleton() {
  return (
    <div className="profile" aria-busy="true" aria-label="Loading profile">
      <div className="skeleton skeleton--avatar" />
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--text" />
      <div className="skeleton skeleton--text-short" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="card skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton--thumbnail" />
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--text" />
      <div className="skeleton skeleton--text-short" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <div className="skeleton skeleton--title" style={{ width: '40%' }} />
      <div className="grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// Usage with React.lazy and Suspense
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));

function App() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AnalyticsDashboard />
    </Suspense>
  );
}
```

### Hybrid Approach: Skeleton First, Spinner for Updates

```jsx
function DataList() {
  const { data, isValidating } = useSWR('/api/items', fetcher);

  // First load: show skeleton
  if (!data) return <ListSkeleton />;

  return (
    <div className="data-list">
      {/* While revalidating, keep data visible + subtle indicator */}
      {isValidating && <div className="revalidating-bar" />}
      {data.map(item => <ItemCard key={item.id} item={item} />)}
    </div>
  );
}

// Subtle refresh indicator — doesn't hide content
.revalidating-bar {
  height: 3px;
  background: linear-gradient(90deg, transparent, #3b82f6, transparent);
  animation: refreshing-bar 1s ease-in-out infinite;
}

@keyframes refreshing-bar {
  0%, 100% { opacity: 0; }
  50%      { opacity: 1; }
}
```

### Choosing Between Skeleton and Spinner

| Scenario | Use |
|----------|-----|
| First paint / cold load | Skeleton screen |
| Navigate to a new page | Skeleton screen |
| Initial data fetch for a section | Skeleton screen |
| Refreshing existing data | Progress bar or subtle indicator |
| Submitting a form | Button loading state |
| Processing payment | Spinner on button (blocks double-submit) |
| Searching with debounce | Small inline spinner |
| Loading more (infinite scroll) | Skeleton below existing content |

---

## 4. Active vs Passive Time

When users are _passively_ waiting, time drags. When they are _actively_ engaged — watching content
arrive, seeing progress, or anticipating a result — time compresses. Three strategies convert passive
waiting into active engagement.

### Strategy 1: Preemptive Start

Begin visual transitions _immediately_ on interaction, not when the next view is ready. The
transition itself becomes the loading indicator.

```jsx
// ❌ Passive: wait until route is ready, then switch
async function slowNavigate(path) {
  const data = await fetchRouteData(path); // Wait
  setRoute(path);                          // Then show
  setContent(data);                        // Too late
}

// ✅ Preemptive: start transition immediately, resolve during animation
function fastNavigate(path) {
  // Step 1: Start transition animation instantly (300ms)
  setTransition('exiting');

  // Step 2: Fetch data while animating (overlaps with step 1)
  fetchRouteData(path).then(data => {
    setRoute(path);
    setContent(data);
    setTransition('entering'); // Enter animation while content renders
  });
}
```

```jsx
// iOS-style "zoom from cell" transition
import { useCallback } from 'react';

function usePreemptiveTransition() {
  const startTransition = useCallback((sourceRect, onDataReady) => {
    // 1. Immediately set the morph animation from the source element
    const overlay = document.createElement('div');
    overlay.className = 'transition-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: ${sourceRect.top}px;
      left: ${sourceRect.left}px;
      width: ${sourceRect.width}px;
      height: ${sourceRect.height}px;
      background: white;
      z-index: 1000;
      transition: all 300ms cubic-bezier(0.25, 1, 0.5, 1);
    `;
    document.body.appendChild(overlay);

    // 2. Force layout, then animate to full screen
    overlay.getBoundingClientRect();
    requestAnimationFrame(() => {
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.borderRadius = '0';
    });

    // 3. Data loads during the animation
    onDataReady().then(content => {
      overlay.remove();
      return content;
    });
  }, []);

  return startTransition;
}
```

### Strategy 2: Early Completion — Show Content Progressively

Don't wait for every resource before showing anything. Ship the shell, then the structure, then
the data, then the images — in that order. Each arrival gives the user a hit of progress.

```jsx
function ProgressiveArticle({ articleId }) {
  // Tier 1: Structure (HTML shell — instant from SSR/cache)
  // Tier 2: Text (fast JSON payload)
  // Tier 3: Images (progressive JPEGs or low-res placeholders)
  // Tier 4: Comments (lazy loaded, lowest priority)

  const { data, error } = useSWR(`/api/articles/${articleId}`, fetcher, {
    revalidateOnFocus: false,
  });

  if (!data) return <ArticleSkeleton />;

  return (
    <article>
      <h1>{data.title}</h1>
      <div className="prose" dangerouslySetInnerHTML={{ __html: data.html }} />

      {/* Images load progressively — blur-up pattern */}
      <ProgressiveImage
        src={data.hero.large}
        placeholder={data.hero.blurhash}
        alt={data.title}
      />

      {/* Comments load last, lowest priority */}
      <Suspense fallback={null}>
        <CommentsSection articleId={articleId} />
      </Suspense>
    </article>
  );
}

// ProgressiveImage: tiny preview instantly → large loads when ready
function ProgressiveImage({ src, placeholder, alt }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="progressive-img">
      <img
        src={placeholder}
        alt=""
        aria-hidden="true"
        className={loaded ? 'hidden' : 'blurred'}
      />
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={loaded ? 'visible' : 'hidden'}
      />
    </div>
  );
}

.blurred { filter: blur(20px) scale(1.1); transition: opacity 300ms; }
.hidden  { opacity: 0; }
.visible { opacity: 1; transition: opacity 300ms; }
```

### Strategy 3: Token Streaming

Token-by-token output feels faster than waiting for the full response, even when total latency
is identical. Users read the first tokens while the rest arrive — time they would have spent
passively waiting.

```jsx
function StreamingChatMessage({ prompt }) {
  const [tokens, setTokens] = useState([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function stream() {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone || cancelled) break;

        const chunk = decoder.decode(value, { stream: true });
        if (!cancelled) {
          setTokens(prev => [...prev, chunk]);
        }
      }

      if (!cancelled) setDone(true);
    }

    stream();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [prompt]);

  return (
    <div className="streaming-message">
      <p>{tokens.join('')}</p>
      {!done && <span className="blinking-cursor">▌</span>}
    </div>
  );
}
```

### The Psychology

Studies by Doherty and Sarter (1986) showed that response times under 400ms maintain user flow.
But the _perception_ of that 400ms matters: 400ms of passive blank screen feels slow; 400ms of
animation + progressive content arrival feels fast. Each incremental reveal — a skeleton, then a
title, then body text, then an image — gives the brain a micro-dopamine hit of completion, making
the total wait feel shorter than a monolithic load.

---

## 5. Animation Duration Rules

Animation has a physiological purpose: it bridges the gap between system response and human
perception. If a change happens in 1 frame (16ms), the user may not register it. Animation
gives the brain time to track _what changed_ and _where it went_.

### The 100/300/500 Rule

| Duration | Use Case | Why |
|----------|----------|-----|
| **100–150ms** | Button press, checkbox toggle, switch, radio select | Must feel instant — any slower and the element feels "sticky" |
| **200–300ms** | Dropdown open/close, tooltip appear, hover card, drag feedback | Fast enough to feel responsive, slow enough to track |
| **300–500ms** | Modal open, accordion expand, page transition, panel slide | Layout changes need time for the eye to follow |
| **500–800ms** | Page entrance, hero animation, staged content reveal | Entrance can be more dramatic — user expects a new context |
| **Exit = ~75%** | Exit is always faster than entrance — the user has already moved on | Shorten exit duration to 75% of enter duration |

### Exit Duration = 75% of Enter Duration

The user has already decided to leave. The exit animation should acknowledge the action without
holding them hostage. At 75% of enter time, it's fast enough to feel responsive but long enough
to provide spatial continuity.

```css
/* Enter: 400ms */
.modal-enter {
  animation: modal-in 400ms cubic-bezier(0.25, 1, 0.5, 1) both;
}

/* Exit: 300ms (75% of 400ms) */
.modal-exit {
  animation: modal-out 300ms cubic-bezier(0.7, 0, 0.84, 0) both;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes modal-out {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
}
```

### The Exit Linger Problem

If an exit animation takes too long, the user tries to interact with the new view while the old view
is still departing. This causes rage-clicks. Keep exits tight.

```jsx
// ✅ Fast exit, smooth enter
function AnimatedPanel({ open, children }) {
  // Enter: 300ms | Exit: 225ms
  return (
    <CSSTransition
      in={open}
      timeout={{ enter: 300, exit: 225 }}
      classNames="panel"
      unmountOnExit
    >
      <div className="panel">{children}</div>
    </CSSTransition>
  );
}

// ❌ Equal enter/exit durations — exit feels sluggish
// timeout={{ enter: 300, exit: 300 }}
```

### Staggered Children

When a container enters with multiple children, stagger each child by 30–60ms. This creates a
"cascade" that leads the eye and feels more alive.

```css
.stagger-item {
  opacity: 0;
  transform: translateY(8px);
  animation: stagger-in 300ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
}

.stagger-item:nth-child(1) { animation-delay: 0ms;   }
.stagger-item:nth-child(2) { animation-delay: 40ms;  }
.stagger-item:nth-child(3) { animation-delay: 80ms;  }
.stagger-item:nth-child(4) { animation-delay: 120ms; }
.stagger-item:nth-child(5) { animation-delay: 160ms; }
.stagger-item:nth-child(6) { animation-delay: 200ms; }

/* Dynamic stagger via CSS custom property */
.stagger-item {
  animation-delay: calc(var(--i, 0) * 40ms);
}
```

```jsx
// React: dynamic stagger with inline custom property
function StaggeredList({ items }) {
  return (
    <ul>
      {items.map((item, i) => (
        <li
          key={item.id}
          className="stagger-item"
          style={{ '--i': i }}
        >
          {item.content}
        </li>
      ))}
    </ul>
  );
}
```

---

## 6. Easing Curves That Feel Right

The default CSS `ease` keyword is mathematically naive — it accelerates and decelerates
symmetrically. Real objects don't move this way. Use custom bezier curves that mimic physical
properties.

### Core Easing Variables

```css
:root {
  /* Smooth deceleration — the universal "feels good" ease */
  --ease-out: cubic-bezier(0.25, 1, 0.5, 1);

  /* Snappy, confident deceleration — for buttons and micro-interactions */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);

  /* For exits — objects leaving the screen */
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);

  /* Balanced acceleration + deceleration — for toggles and loops */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);

  /* Overshoot bounce — playful, for delight moments */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### When to Use Each Curve

```css
/* Buttons, hover states, instant feedback: ease-out-expo */
.btn {
  transition: transform 150ms var(--ease-out-expo),
              background 150ms var(--ease-out-expo);
}
.btn:active {
  transform: scale(0.96);
}

/* Modal entry: ease-out — graceful, not bouncy */
.modal {
  animation: modal-in 400ms var(--ease-out) both;
}

/* Modal exit: ease-in — object is leaving, accelerates away */
.modal.exiting {
  animation: modal-out 300ms var(--ease-in) both;
}

/* Toggle switch, checkbox: ease-in-out — symmetric operation */
.toggle-thumb {
  transition: transform 200ms var(--ease-in-out);
}

/* Notification badge pop-in: spring overshoot for delight */
.badge-pop {
  animation: badge-in 300ms var(--ease-spring) both;
}
```

### The Peak-End Effect and Ease-In

The peak-end rule (Kahneman, 1999) states that people judge experiences by their _peak intensity_
and their _end_, not the average. When a task animation eases _in_ toward completion — accelerating
as it finishes — the brain registers the fast finish as the defining moment, making the entire task
feel shorter.

```css
/* ✅ Peak-end trick: ease-in toward completion */
.progress-fill {
  transition: width 800ms cubic-bezier(0.7, 0, 0.84, 0);
  /* Speeds up at the end — user remembers the fast finish */
}

/* ❌ Linear — user remembers the long middle */
.progress-fill {
  transition: width 800ms linear;
}
```

### Visual Comparison of Easing Curves

```
ease              = cubic-bezier(0.25, 0.1, 0.25, 1)
ease-out          = cubic-bezier(0.25, 1, 0.5, 1)    ← prefer this
ease-out-expo     = cubic-bezier(0.16, 1, 0.3, 1)    ← or this
ease-in           = cubic-bezier(0.7, 0, 0.84, 0)    ← exits only
ease-in-out       = cubic-bezier(0.65, 0, 0.35, 1)   ← toggle switches
```

### Framework Animation Libraries

When CSS isn't enough, use Framer Motion or GSAP with the same curves:

```jsx
import { motion } from 'framer-motion';

// Same core curves expressed as Framer Motion variants
const easeOut = [0.25, 1, 0.5, 1];
const easeOutExpo = [0.16, 1, 0.3, 1];
const easeIn = [0.7, 0, 0.84, 0];

function AnimatedModal({ children, open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
            onClick={onClose}
          />
          <motion.div
            className="modal"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{
              duration: 0.4,
              ease: easeOut, // Note: exit transitions inherit unless overridden
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

---

## 7. GPU-Accelerated Animations

The browser's rendering pipeline has four stages: **Style → Layout → Paint → Composite**. The first
three are expensive. Composite-only animations run entirely on the GPU and never touch the CPU's
main thread — meaning they stay at 60fps even during heavy JavaScript execution.

### The Only Two Safe Properties

Only `transform` and `opacity` skip layout and paint, going straight to composite:

```css
/* ✅ Composite-only — always 60fps on GPU */
.animate-good {
  transform: translateX(100px) scale(1.1) rotate(5deg);
  opacity: 0.8;
}

/* ❌ Triggers layout — CPU recalculates geometry */
.animate-bad-layout {
  width: 200px;
  height: 200px;
  top: 20px;
  left: 20px;
  margin: 10px;
  padding: 10px;
  border-width: 2px;
}

/* ❌ Triggers paint — CPU repaints pixels */
.animate-bad-paint {
  background-color: red;
  color: blue;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

/* ⚠️ border-radius triggers layout in some browsers, paint in others — avoid */
```

### The Full Rendering Pipeline Cost Table

| Property Changes | Triggers Layout | Triggers Paint | Triggers Composite | Performance |
|-----------------|:---:|:---:|:---:|-------------|
| `transform`, `opacity` | | | ✓ | **Optimal** |
| `background-color`, `color`, `box-shadow`, `outline`, `visibility` | | ✓ | ✓ | Good (paint only) |
| `width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, `padding`, `border`, `display`, `position`, `font-size`, `text-align`, `overflow`, `float`, `clear`, `white-space` | ✓ | ✓ | ✓ | **Expensive** |

[CSS Triggers](https://csstriggers.com/) tracks which properties trigger which pipeline stages.

### Animating "Width-Like" Effects with Transform

```css
/* ❌ Expands from center — triggers layout every frame */
.expand-bad {
  transition: width 300ms, height 300ms;
}
.expand-bad:hover {
  width: 300px;
  height: 200px;
}

/* ✅ Same visual effect — composite only, 60fps */
.expand-good {
  transition: transform 300ms var(--ease-out);
}
.expand-good:hover {
  transform: scaleX(1.5) scaleY(1.3);
}

/* ❌ Slide from top — animates 'top', triggers layout */
.slide-bad {
  position: relative;
  top: -100%;
  transition: top 300ms;
}
.slide-bad.open {
  top: 0;
}

/* ✅ Slide with transform — composite only */
.slide-good {
  transform: translateY(-100%);
  transition: transform 300ms var(--ease-out);
}
.slide-good.open {
  transform: translateY(0);
}
```

### The `will-change` Rule

`will-change` tells the browser to promote an element to its own GPU layer _before_ it animates.
This avoids a one-frame flash during promotion. But it consumes GPU memory, so use it surgically.

```css
/* ✅ Correct: apply ONLY when we know animation is coming */
.btn {
  transform: scale(1);
  transition: transform 150ms var(--ease-out-expo);
}
.btn:hover {
  will-change: transform; /* Promote just before animation */
  transform: scale(0.96);
}
.btn:active {
  will-change: transform;
  transform: scale(0.92);
}

/* ✅ Correct: add via JS class, remove after animation ends */
.element.animating {
  will-change: transform, opacity;
}

/* ❌ Wrong: applying globally wastes GPU memory */
* {
  will-change: transform; /* This allocates GPU layers for EVERY element */
}

/* ❌ Wrong: leaving will-change on after animation ends
   — GPU memory is never freed */
.sticky-header {
  will-change: transform; /* If always present, never freed */
}
```

```jsx
// ✅ JavaScript pattern: add will-change, animate, then remove
function animateWithWillChange(element, transformValue, duration = 300) {
  element.style.willChange = 'transform';

  // Start animation in next frame (so will-change promotion takes effect)
  requestAnimationFrame(() => {
    element.style.transition = `transform ${duration}ms cubic-bezier(0.25, 1, 0.5, 1)`;
    element.style.transform = transformValue;
  });

  // Clean up after animation completes
  setTimeout(() => {
    element.style.willChange = 'auto';
  }, duration + 50);
}
```

### Staggered Animations with CSS Custom Properties

```css
/* Base animation */
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Each item uses its --i to calculate delay */
.stagger-up {
  opacity: 0;
  animation: slide-up 350ms var(--ease-out) forwards;
  animation-delay: calc(var(--i, 0) * 45ms + 50ms);
  /* Item 0: 50ms delay  → appears first
     Item 1: 95ms
     Item 2: 140ms
     Item 3: 185ms
     Item 4: 230ms */
}
```

```jsx
function StaggeredGrid({ items }) {
  return (
    <div className="grid">
      {items.map((item, i) => (
        <div
          key={item.id}
          className="stagger-up"
          style={{ '--i': i }}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
```

---

## 8. Facade Pattern for Heavy Embeds

Third-party embeds (YouTube, Google Maps, social widgets) are performance killers. A single YouTube
embed can download 500KB–2MB of JavaScript before the user even clicks play. The facade pattern
shows a lightweight static preview and only loads the heavy embed on interaction.

### The Pattern

1. Render a static image + play button that looks exactly like the embed
2. On click, replace the static preview with the real embed via `iframe`

### YouTube Facade — Full Implementation

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    .video-facade {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
    }

    .video-facade img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 300ms cubic-bezier(0.25, 1, 0.5, 1);
    }

    .video-facade:hover img {
      transform: scale(1.03);
    }

    .video-facade .play-btn {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.2);
    }

    .video-facade .play-icon {
      width: 68px;
      height: 48px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 150ms cubic-bezier(0.16, 1, 0.3, 1),
                  background 150ms;
    }

    .video-facade:hover .play-icon {
      transform: scale(1.1);
      background: #f00;
    }

    .video-facade .play-icon::after {
      content: '';
      width: 0;
      height: 0;
      border-left: 20px solid white;
      border-top: 12px solid transparent;
      border-bottom: 12px solid transparent;
      margin-left: 4px;
    }

    .video-facade iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: none;
    }
  </style>
</head>
<body>

<figure class="video-facade" data-video-id="dQw4w9WgXcQ">
  <img
    src="https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
    alt="Video thumbnail"
    loading="lazy"
  />
  <div class="play-btn">
    <div class="play-icon" aria-hidden="true"></div>
  </div>
  <figcaption style="display:none">Never Gonna Give You Up</figcaption>
</figure>

<script>
  document.querySelectorAll('.video-facade').forEach((facade) => {
    const videoId = facade.dataset.videoId;
    const thumbnailImg = facade.querySelector('img');

    facade.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
      iframe.setAttribute('allow', 'autoplay; encrypted-media');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('title', facade.querySelector('figcaption')?.textContent || 'Video');
      iframe.setAttribute('loading', 'lazy');

      // Replace thumbnail with real player
      facade.innerHTML = '';
      facade.appendChild(iframe);
      facade.style.cursor = 'default';
    });

    // Preconnect to YouTube on hover/pointer — warm the connection
    facade.addEventListener('pointerenter', () => {
      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = 'https://www.youtube-nocookie.com';
      document.head.appendChild(preconnect);
    }, { once: true });
  });
</script>

</body>
</html>
```

### Google Maps Facade

```html
<div class="map-facade" data-lat="37.7749" data-lng="-122.4194" data-zoom="12">
  <img
    src="https://maps.googleapis.com/maps/api/staticmap?center=37.7749,-122.4194&zoom=12&size=600x400&key=YOUR_KEY"
    alt="Map showing location"
    loading="lazy"
    width="600"
    height="400"
  />
  <button class="map-interact-btn">
    Click to interact with map
  </button>
</div>

<script>
  document.querySelectorAll('.map-facade').forEach(facade => {
    btn.addEventListener('click', () => {
      const { lat, lng, zoom } = facade.dataset;
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.google.com/maps/embed/v1/view?key=YOUR_KEY&center=${lat},${lng}&zoom=${zoom}`;
      iframe.width = '600';
      iframe.height = '400';
      iframe.style.border = 'none';
      iframe.loading = 'lazy';

      facade.innerHTML = '';
      facade.appendChild(iframe);
    });
  });
</script>
```

### React Facade Component

```jsx
import { useState, useRef } from 'react';

function YouTubeFacade({ videoId, title }) {
  const [playing, setPlaying] = useState(false);
  const facadeRef = useRef(null);

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const fallbackUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  const activate = () => {
    setPlaying(true);
    // Loading state: skeleton for the iframe while it loads
  };

  if (playing) {
    return (
      <div className="video-container">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
          title={title}
          allow="autoplay; encrypted-media"
          allowFullScreen
          className="video-iframe"
        />
      </div>
    );
  }

  return (
    <figure
      ref={facadeRef}
      className="video-facade"
      onClick={activate}
      role="button"
      tabIndex={0}
      aria-label={`Play ${title}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') activate(); }}
    >
      <img
        src={thumbnailUrl}
        alt={title}
        loading="lazy"
        onError={(e) => { e.target.src = fallbackUrl; }}
      />
      <div className="play-overlay">
        <div className="play-button" />
      </div>
    </figure>
  );
}
```

### Performance Savings

| Embed Type | Without Facade | With Facade | Savings |
|------------|:---:|:---:|:---:|
| YouTube (single) | 1.2MB JS + iframe | 30KB thumbnail | **97%** |
| Google Maps | 800KB JS + tiles | 40KB static map | **95%** |
| Twitter embed | 300KB JS | 0KB (until interaction) | **100% initially** |
| Instagram embed | 500KB JS | 0KB (until interaction) | **100% initially** |
| Disqus comments | 450KB JS | 0KB (until interaction) | **100% initially** |

---

## 9. Connection-Aware Adaptation

Not all users have fiber connections. The `navigator.connection` API (available in Chromium browsers,
part of the Network Information API) lets you detect connection quality and adapt the experience.

### Progressive Enhancement by Connection Type

```javascript
function getConnectionInfo() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return { type: 'unknown', slow: false, saveData: false };

  return {
    type: conn.effectiveType,          // 'slow-2g' | '2g' | '3g' | '4g'
    downlink: conn.downlink,           // Mbps estimate
    rtt: conn.rtt,                     // Round-trip time in ms
    slow: conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g',
    saveData: conn.saveData,           // User has "data saver" enabled
  };
}

// Adaptive image loading
function getImageQuality(connection) {
  switch (connection.type) {
    case 'slow-2g':
    case '2g':
      return 'low';       // 320px wide, heavily compressed
    case '3g':
      return 'medium';    // 640px wide, moderate compression
    case '4g':
    default:
      return 'high';      // Full resolution
  }
}
```

### Connection-Aware Data Fetching

```javascript
function ConnectionAwareDashboard() {
  const [connection, setConnection] = useState(getConnectionInfo);

  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return;

    const handleChange = () => setConnection(getConnectionInfo());
    conn.addEventListener('change', handleChange);
    return () => conn.removeEventListener('change', handleChange);
  }, []);

  // On slow connections: fetch less, show more skeleton, defer images
  const pageSize = connection.slow ? 5 : 20;
  const { data, isLoading } = useSWR(`/api/dashboard?limit=${pageSize}`, fetcher);

  // On data-saver mode: skip video autoplay, skip animations, skip prefetching
  const enableAnimations = !connection.saveData && !connection.slow;
  const enablePreloading = connection.type === '4g' && !connection.saveData;

  return (
    <div className={`dashboard ${connection.slow ? 'low-data' : ''}`}>
      {isLoading ? (
        <DashboardSkeleton count={pageSize} animate={enableAnimations} />
      ) : (
        <DashboardContent
          data={data}
          enableAnimations={enableAnimations}
          imageQuality={getImageQuality(connection)}
        />
      )}
    </div>
  );
}
```

### Connection-Aware Preloading

```jsx
function SmartPreloader({ links }) {
  const shouldPreload = useMemo(() => {
    const conn = navigator.connection;
    if (!conn) return true; // Unknown — default to preload
    if (conn.saveData) return false; // User is data-conscious, don't preload
    if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') return false;
    return true;
  }, []);

  if (!shouldPreload) return null;

  return (
    <>
      {links.map(link => (
        <link key={link} rel="prefetch" href={link} as="document" />
      ))}
    </>
  );
}
```

### The `saveData` Hint

When the user has Data Saver mode on, respect it aggressively:

```javascript
// Respect Save-Data header or navigator.connection.saveData
function shouldOptimize() {
  // Check client-side
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn?.saveData) return true;

  // Check server-side header (passed as a data attribute from SSR)
  if (document.documentElement.dataset.saveData === 'true') return true;

  return false;
}

const optimize = shouldOptimize();

const config = {
  enableLazyImages: true,
  enableWebP: true,                 // Always good
  enableAnimations: !optimize,
  enablePreload: !optimize,
  enableVideoAutoplay: !optimize,
  imageQuality: optimize ? 60 : 85,
  maxConcurrentRequests: optimize ? 2 : 6,
};
```

### Server-Side Save-Data Detection

```javascript
// Express middleware to detect Save-Data preference and pass to client
app.use((req, res, next) => {
  const saveData = req.headers['save-data'] === 'on';
  res.locals.saveData = saveData;

  // Reduce payload size for data-conscious users
  if (saveData) {
    res.setHeader('Vary', 'Save-Data');
  }

  next();
});

// Inject into HTML template
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html data-save-data="${res.locals.saveData}">
    ...
  `);
});
```

---

## 10. Caution: Too-Fast Responses

Paradoxically, responses that complete _too quickly_ can decrease perceived value. When a user
performs an operation they believe is complex (searching a large dataset, processing a payment,
generating a report) and the result appears in 50ms, they may distrust the output.

### The Trust-Through-Latency Effect

- **Financial transactions**: A payment that completes in 0ms feels like a bug. The user expects
  verification delay — a brief pause signals that fraud checks and ledgers were consulted.
- **Search results**: Instant results for a complex query can feel like the system didn't really
  "search" — just returned cached or incomplete data.
- **AI-generated content**: Instant AI output feels low-quality. A brief generation delay signals
  "the model is thinking."
- **Report generation**: A 50-page report in 100ms feels fake. A 500ms delay with a progress
  indicator feels like genuine computation.

### The Minimum Viable Delay

For operations users expect to be "real work," consider a minimum visible processing time:

```jsx
function ArtificialDelayButton({ onExecute, children, minDelay = 600 }) {
  const [status, setStatus] = useState('idle'); // idle | processing | done

  const execute = async () => {
    setStatus('processing');
    const start = performance.now();

    try {
      const result = await onExecute();

      // Ensure at least minDelay has elapsed
      const elapsed = performance.now() - start;
      const remaining = Math.max(0, minDelay - elapsed);

      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }

      setStatus('done');
      setTimeout(() => setStatus('idle'), 2000);
      return result;
    } catch (error) {
      setStatus('idle');
      throw error;
    }
  };

  return (
    <button onClick={execute} disabled={status === 'processing'}>
      {status === 'idle' && children}
      {status === 'processing' && <span>Processing... <Dots /></span>}
      {status === 'done' && <span>Done ✓</span>}
    </button>
  );
}
```

### When to Apply This

| Operation | Minimum Delay | Rationale |
|-----------|:---:|-----------|
| Payment processing | 400–800ms | Signals fraud/verification checks happened |
| Large file upload | Progress bar, even if near-instant | Shows "bytes transferred" |
| Report download | 300–500ms | Signals "generation" occurred |
| AI text generation | Stream tokens, min 200ms before start | Signals model inference |
| Complex search | 200–400ms first result | Signals deep search occurred |
| Data export (CSV/PDF) | 500–1000ms | Signals compilation/sanitization |
| Deletion confirmation | 300–500ms fade animation | Signals permanence of action |
| Simple toggle (like) | **No delay** — 0ms | Should feel instant |

### The Counterargument (Know Your Audience)

Not every audience benefits from artificial delay. For dashboards, trading UIs, and developer tools,
real speed beats perceived thoroughness. Gauge your audience:

- **Trading desk**: Every microsecond counts — never add delay
- **SaaS admin panel**: Brief progress for heavy ops, instant for CRUD
- **Consumer app**: Favor delight — brief animations and staggered reveals
- **Enterprise report tool**: Show computation steps, minimum 300ms for bulk ops

---

## 11. `prefers-reduced-motion`

Some users experience dizziness, nausea, or distraction from animated interfaces due to vestibular
disorders, migraines, or cognitive preferences. Respecting `prefers-reduced-motion` is both an
accessibility requirement and a performance optimization — fewer animations mean less GPU work.

### The CSS Foundation

```css
@media (prefers-reduced-motion: reduce) {
  /* Disable all non-essential animations */
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Functional vs. Decorative Animation

```css
/* Decorative: disable completely */
.hero-animation {
  animation: float-up 600ms var(--ease-out) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

.stagger-item {
  animation: slide-up 350ms var(--ease-out) forwards;
  animation-delay: calc(var(--i) * 45ms);

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

/* Functional: simplify, don't remove */
.progress-bar {
  transition: width 300ms var(--ease-out-expo);

  @media (prefers-reduced-motion: reduce) {
    /* Keep the width change but remove easing — instant step */
    transition: none;
  }
}

/* Loading states: use opacity instead of animation */
.skeleton {
  animation: shimmer 1.5s infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.5; /* Static dim loading indicator */
  }
}

/* Carousels: remove autoplay, keep manual navigation */
.carousel-track {
  transition: transform 400ms var(--ease-out);

  @media (prefers-reduced-motion: reduce) {
    transition: none; /* Instant slide to next item */
  }
}
```

### JavaScript Detection

```javascript
function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    // Server-safe check
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

// Usage in animation libraries
function AnimatedEntrance({ children }) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <>{children}</>; // No animation wrapper
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

### Framer Motion `useReducedMotion` Hook

```jsx
import { useReducedMotion, motion } from 'framer-motion';

function ResponsiveAnimation({ children }) {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduce ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduce ? { duration: 0 } : { duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

### What Should Always Work (Functional Animations)

```css
/* These convey information and must still function */
@media (prefers-reduced-motion: reduce) {
  /* Progress bars — show completion, just without easing */
  .progress-fill {
    transition: width 0s; /* Instant step to new value */
  }

  /* Loading spinners — indicate activity */
  .spinner {
    animation: none;
    /* Fallback: static spinner icon */
    background: url('spinner-static.svg');
  }

  /* Scroll position indicator — still shows location */
  .scroll-indicator {
    transition: none;
  }

  /* Live timers, counters, and stock tickers — essential data */
  .ticker {
    animation: none;
  }
}
```

### Testing Your Motion Preferences

```bash
# Chrome DevTools:
#   Rendering tab → "Emulate prefers-reduced-motion"
#
# Windows:
#   Settings → Accessibility → Visual Effects → "Show animations in Windows" → Off
#
# macOS:
#   Settings → Accessibility → Display → "Reduce motion"
#
# Firefox:
#   about:config → ui.prefersReducedMotion = 1
```

---

## Summary: Perceived Performance Checklist

- [ ] Micro-interactions complete within 80ms (CSS toggle, state change, hover)
- [ ] Optimistic UI used for non-destructive operations (likes, toggles, reorder)
- [ ] Skeleton screens replace generic spinners for initial loads
- [ ] Preemptive transitions start immediately on interaction
- [ ] Progressive content loading: shell → text → images → comments
- [ ] Token streaming for AI/chat responses
- [ ] Animation durations follow the 100/300/500 rule
- [ ] Exit animations at 75% of enter duration
- [ ] Easing uses custom cubic-bezier curves — never `ease`
- [ ] Only `transform` and `opacity` animated for 60fps
- [ ] `will-change` used surgically and cleaned up after animation
- [ ] Facade pattern for third-party embeds (YouTube, Maps, widgets)
- [ ] Connection-aware adaptation on slow/2G networks
- [ ] Artificial delay where user trust requires it (payments, reports)
- [ ] `prefers-reduced-motion` respected — decorative animations disabled
- [ ] Functional animations (progress bars, spinners) still work in reduced motion

---

## References

- Doherty & Sarter (1986) — "Response time: The overlooked variable in human-computer interaction"
- Kahneman (1999) — "The Peak-End Rule" — Well-Being: Foundations of Hedonic Psychology
- Nielsen Norman Group — "Response Times: The 3 Important Limits"
- CSS Triggers — [csstriggers.com](https://csstriggers.com)
- WCAG 2.1 — "Success Criterion 2.3.3: Animation from Interactions" (prefers-reduced-motion)
- WebKit Blog — "The 2018 Web Developer's Guide to Animation Performance"
