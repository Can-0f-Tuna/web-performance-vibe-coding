# Shared WebSocket Architecture

Handle real-time updates efficiently with a single, intelligent WebSocket connection.

## Core Principle

One shared WebSocket instance across the entire application eliminates overhead while maintaining live data.

## Architecture

```
┌─────────────────────────────────────────┐
│         WebSocket Context               │
│  • Single connection instance            │
│  • Smart reconnect logic                 │
│  • Message routing                       │
│  • Subscription management               │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐      │
│  │ Price Feed  │  │ Chat        │      │
│  │ Component   │  │ Component   │      │
│  └─────────────┘  └─────────────┘      │
│  ┌─────────────┐  ┌─────────────┐      │
│  │ Portfolio   │  │ Notifications│      │
│  │ Component   │  │ Component    │      │
│  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────┘
                    │
            ┌───────▼───────┐
            │  WebSocket    │
            │  Server       │
            └───────────────┘
```

## WebSocket State Machine

A WebSocket connection goes through four rigid states. Every piece of socket code must account for which state it's in:

```
CONNECTING (0) ──→ OPEN (1) ──→ CLOSING (2) ──→ CLOSED (3)
     │                                      ↑
     └──────────────────────────────────────┘
              (error during connect)
```

```javascript
const WS_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

class WebSocketManager {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.state = WS_STATE.CLOSED;
  }

  connect() {
    if (this.state === WS_STATE.OPEN || this.state === WS_STATE.CONNECTING) {
      return; // Already connected or connecting
    }

    this.state = WS_STATE.CONNECTING;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.state = WS_STATE.OPEN;
      this.onConnected();
    };

    this.ws.onclose = (event) => {
      const prevState = this.state;
      this.state = WS_STATE.CLOSED;

      if (event.wasClean) {
        console.log(`Closed cleanly: code=${event.code}, reason=${event.reason}`);
      } else {
        console.error(`Connection died: code=${event.code}`);
        this.onDisconnected(prevState);
      }
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      // onclose always fires after onerror
    };
  }

  disconnect() {
    if (this.state === WS_STATE.OPEN) {
      this.state = WS_STATE.CLOSING;
      this.ws.close(1000, 'Client disconnecting');
    }
  }

  send(data) {
    if (this.state !== WS_STATE.OPEN) {
      // Queue the message — see "Message Queue During Disconnect" below
      this.messageQueue.push(data);
      return;
    }
    this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
  }
}
```

## Heartbeat / Ping-Pong

TCP connections can die silently (proxies, NAT timeouts, network flaps). Without a heartbeat, you won't know the socket is dead until you try to send.

```javascript
const HEARTBEAT_INTERVAL = 30000;  // 30s
const PONG_TIMEOUT = 10000;         // 10s to respond

function setupHeartbeat(ws, onDeadConnection) {
  let heartbeatTimer;
  let pongTimer;
  let missedPongs = 0;
  const MAX_MISSED_PONGS = 2;

  const sendPing = () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));

      // If server doesn't pong back within PONG_TIMEOUT, consider it dead
      clearTimeout(pongTimer);
      pongTimer = setTimeout(() => {
        missedPongs++;
        if (missedPongs >= MAX_MISSED_PONGS) {
          console.warn('Heartbeat failed — connection dead');
          clearInterval(heartbeatTimer);
          ws.close(1006, 'Heartbeat timeout');
          onDeadConnection?.();
        }
      }, PONG_TIMEOUT);
    }
  };

  ws.onopen = () => {
    heartbeatTimer = setInterval(sendPing, HEARTBEAT_INTERVAL);
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'pong') {
      missedPongs = 0;
      clearTimeout(pongTimer);
    }
  };

  ws.onclose = () => {
    clearInterval(heartbeatTimer);
    clearTimeout(pongTimer);
  };
}
```

**Server-side pong response:**

```javascript
// On the server, respond to pings immediately
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong' }));
    return;
  }
  // ... handle other message types
});
```

## Reconnection with Exponential Backoff + Jitter

Blind fixed-interval reconnection creates thundering-herd problems. Use exponential backoff with random jitter to spread reconnection attempts.

```javascript
function createReconnectingWebSocket(url, options = {}) {
  const {
    maxRetries = 10,
    minDelay = 1000,
    maxDelay = 30000,
  } = options;

  let ws;
  let retries = 0;
  let intentionalClose = false;
  const listeners = new Map();

  function connect() {
    if (retries >= maxRetries) {
      console.error(`Max retries (${maxRetries}) reached. Giving up.`);
      dispatch('failed');
      return;
    }

    ws = new WebSocket(url);

    ws.onopen = () => {
      retries = 0;
      dispatch('open');
    };

    ws.onmessage = (event) => {
      dispatch('message', JSON.parse(event.data));
    };

    ws.onerror = () => {
      dispatch('error');
    };

    ws.onclose = (event) => {
      dispatch('close', event);

      if (intentionalClose) return;

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 30s...
      const delay = Math.min(minDelay * Math.pow(2, retries), maxDelay);
      // Standard jitter: delay/2 + random * delay/2 → range [50%–100% of delay]
      const jittered = delay / 2 + (delay / 2) * Math.random();

      console.log(`Reconnecting in ${Math.round(jittered / 1000)}s... (attempt ${retries + 1})`);
      setTimeout(connect, jittered);
      retries++;
    };
  }

  function dispatch(type, data) {
    const handlers = listeners.get(type) || [];
    handlers.forEach(fn => fn(data));
  }

  return {
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
    },
    send(data) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    },
    connect,
    disconnect() {
      intentionalClose = true;
      retries = maxRetries; // Prevent reconnection
      ws?.close(1000, 'Client disconnect');
    }
  };
}

// Usage
const ws = createReconnectingWebSocket('wss://api.example.com');
ws.on('message', (data) => updateUI(data));
ws.connect();
```

## Message Queue During Disconnect

While reconnecting, outgoing messages are lost. Queue them and flush once reconnected.

```javascript
function createQueuedWebSocket(url) {
  let ws;
  let isOpen = false;
  const messageQueue = [];
  const MAX_QUEUE_SIZE = 100;

  function connect() {
    ws = new WebSocket(url);

    ws.onopen = () => {
      isOpen = true;

      // Flush queued messages
      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        ws.send(JSON.stringify(msg));
      }
    };

    ws.onclose = () => {
      isOpen = false;
      // Reconnect with backoff (see above section)
      setTimeout(connect, exponentialBackoff());
    };
  }

  function send(data) {
    if (isOpen) {
      ws.send(JSON.stringify(data));
    } else if (messageQueue.length < MAX_QUEUE_SIZE) {
      messageQueue.push(data);
    } else {
      console.warn('Message queue full — dropping oldest message');
      messageQueue.shift();
      messageQueue.push(data);
    }
  }

  function exponentialBackoff() {
    // See reconnection section above
    return 1000;
  }

  return { connect, send };
}
```

## Backpressure

`ws.bufferedAmount` indicates how much data is queued in the browser's send buffer. If the network can't keep up, blasting more data only makes it worse.

```javascript
const BACKPRESSURE_THRESHOLD = 16 * 1024; // 16 KB

function sendWithBackpressure(ws, data) {
  if (ws.readyState !== WebSocket.OPEN) return;

  // If buffer is backed up, defer the send
  if (ws.bufferedAmount > BACKPRESSURE_THRESHOLD) {
    // Wait for the buffer to drain before sending again
    const checkBuffer = () => {
      if (ws.bufferedAmount === 0) {
        ws.removeEventListener('bufferedamountlow', checkBuffer);
        ws.send(JSON.stringify(data));
      }
    };

    ws.addEventListener('bufferedamountlow', checkBuffer, { once: false });
    return;
  }

  ws.send(JSON.stringify(data));
}

// Batch multiple rapid updates into a single send
function createThrottledSender(ws, intervalMs = 50) {
  let pending = [];
  let timer = null;

  return function send(data) {
    pending.push(data);

    if (!timer) {
      timer = setTimeout(() => {
        const batch = pending;
        pending = [];

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(batch.length === 1 ? batch[0] : batch));
        }

        timer = null;
      }, intervalMs);
    }
  };
}
```

## Shared Singleton Pattern

### Module-Level Singleton

```javascript
// shared-socket.js — import from anywhere, same instance
let instance = null;

export function getWebSocket() {
  if (!instance) {
    instance = createReconnectingWebSocket('wss://api.example.com');
    instance.connect();
  }
  return instance;
}
```

### React Context Singleton

```jsx
// WebSocketContext.jsx
const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const ws = useRef(null);
  const subscriptions = useRef(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const messageQueue = useRef([]);

  const connect = () => {
    ws.current = new WebSocket('wss://api.yourapp.com');

    ws.current.onopen = () => {
      setIsConnected(true);

      // Resubscribe to all active channels
      subscriptions.current.forEach((callback, channel) => {
        ws.current.send(JSON.stringify({ action: 'subscribe', channel }));
      });

      // Flush queued messages
      while (messageQueue.current.length > 0) {
        ws.current.send(JSON.stringify(messageQueue.current.shift()));
      }

      // Prefetch data immediately
      prefetchOnConnect();
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const callback = subscriptions.current.get(message.channel);
      if (callback) {
        callback(message.data);
      }
    };
  };

  const subscribe = (channel, callback) => {
    subscriptions.current.set(channel, callback);

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: 'subscribe', channel }));
    } else {
      // Queue subscription for when we reconnect
      messageQueue.current.push({ action: 'subscribe', channel });
    }
  };

  const unsubscribe = (channel) => {
    subscriptions.current.delete(channel);

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: 'unsubscribe', channel }));
    }
  };

  const send = (data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      // Check backpressure before sending
      if (ws.current.bufferedAmount < 16 * 1024) {
        ws.current.send(JSON.stringify(data));
      }
    } else {
      messageQueue.current.push(data);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    connect();
    return () => {
      ws.current?.close(1000, 'Component unmounting');
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{
      subscribe,
      unsubscribe,
      send,
      isConnected
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Custom hook
export function useWebSocket(channel, callback) {
  const context = useContext(WebSocketContext);

  useEffect(() => {
    if (!channel || !callback) return;
    context.subscribe(channel, callback);
    return () => context.unsubscribe(channel);
  }, [channel, callback]);

  return context;
}
```

## Smart Reconnect Gated by Visibility

Only reconnect when the user is actually looking at the page.

```jsx
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      if (!isConnected && reconnectAttempts.current < 5) {
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttempts.current),
          30000
        );
        // Standard jitter: delay/2 + random * delay/2 → range [50%–100% of delay]
        const jittered = delay / 2 + (delay / 2) * Math.random();
        setTimeout(() => connect(), jittered);
        reconnectAttempts.current++;
      }
    } else {
      // Optionally disconnect when hidden to save battery
      ws.current?.close();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

## Prefetch on Connection

```javascript
const prefetchOnConnect = () => {
  // Request all data immediately upon connection
  ws.current.send(JSON.stringify({
    action: 'batch_subscribe',
    channels: ['prices', 'portfolio', 'notifications']
  }));
};
```

## Putting It All Together

```javascript
// Complete production-ready WebSocket manager
class ProductionWebSocket {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.state = 'CLOSED';
    this.retries = 0;
    this.maxRetries = 10;
    this.messageQueue = [];
    this.listeners = new Map();
    this.heartbeatTimer = null;
    this.pongTimer = null;
    this.intentionalClose = false;
  }

  connect() {
    if (this.state === 'CONNECTING' || this.state === 'OPEN') return;

    this.state = 'CONNECTING';
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.state = 'OPEN';
      this.retries = 0;
      this.startHeartbeat();
      this.flushQueue();
      this.emit('open');
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'pong') {
        clearTimeout(this.pongTimer);
        return;
      }

      this.emit('message', msg);
    };

    this.ws.onclose = (event) => {
      this.state = 'CLOSED';
      this.stopHeartbeat();

      if (this.intentionalClose) {
        this.emit('closed');
        return;
      }

      this.emit('disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.emit('error');
    };
  }

  send(data) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);

    if (this.state === 'OPEN' && this.ws.bufferedAmount < 16384) {
      this.ws.send(payload);
    } else {
      this.messageQueue.push(payload);
    }
  }

  disconnect() {
    this.intentionalClose = true;
    this.state = 'CLOSING';
    this.ws?.close(1000, 'Client disconnect');
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
  }

  off(event, fn) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      this.listeners.set(event, handlers.filter(h => h !== fn));
    }
  }

  // --- Private ---

  emit(event, data) {
    (this.listeners.get(event) || []).forEach(fn => fn(data));
  }

  flushQueue() {
    while (this.messageQueue.length > 0) {
      this.ws.send(this.messageQueue.shift());
    }
  }

  scheduleReconnect() {
    if (this.retries >= this.maxRetries) {
      this.emit('failed');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.retries), 30000);
    // Standard jitter: delay/2 + random * delay/2 → range [50%–100% of delay]
    const jittered = delay / 2 + (delay / 2) * Math.random();

    setTimeout(() => {
      this.retries++;
      this.connect();
    }, jittered);
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));

        this.pongTimer = setTimeout(() => {
          console.warn('Pong timeout — closing connection');
          this.ws.close(1006, 'Heartbeat timeout');
        }, 10000);
      }
    }, 30000);
  }

  stopHeartbeat() {
    clearInterval(this.heartbeatTimer);
    clearTimeout(this.pongTimer);
  }
}

// Usage — single instance across entire app
const socket = new ProductionWebSocket('wss://api.example.com');

socket.on('open', () => console.log('Connected'));
socket.on('message', (data) => updateUI(data));
socket.on('disconnected', () => showDisconnectedBanner());
socket.on('failed', () => showPermanentError());

socket.connect();
```

## Checklist

- [ ] Implement single shared WebSocket instance
- [ ] Add subscription management system
- [ ] Implement WebSocket state machine (CONNECTING → OPEN → CLOSING → CLOSED)
- [ ] Add heartbeat/ping-pong for dead connection detection
- [ ] Implement reconnection with exponential backoff + jitter
- [ ] Queue outgoing messages during disconnect, flush on reconnect
- [ ] Check `ws.bufferedAmount` before sending (backpressure)
- [ ] Gate reconnect on page visibility
- [ ] Prefetch data immediately on connection
- [ ] Handle reconnection resubscription
- [ ] Monitor connection health
- [ ] Implement connection status UI
- [ ] Enforce max queue size to prevent memory leaks

## Key Metrics

- **Connection time:** Under 500ms
- **Reconnect time:** Under 1s (with backoff, initial attempts are fast)
- **Heartbeat interval:** 30s (detect dead connections within 40s)
- **Active subscriptions:** Track count
- **Message latency:** Under 100ms
- **Connection uptime:** 99.9%
- **Max queue depth:** 100 messages (prevent memory leaks)
