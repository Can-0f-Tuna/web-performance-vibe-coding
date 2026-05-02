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

## Key Features

### 1. Single Shared Connection

```jsx
// WebSocketContext.jsx
const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const ws = useRef(null);
  const subscriptions = useRef(new Map());
  const reconnectAttempts = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  
  const connect = () => {
    ws.current = new WebSocket('wss://api.yourapp.com');
    
    ws.current.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      
      // Resubscribe to all active channels
      subscriptions.current.forEach((callback, channel) => {
        ws.current.send(JSON.stringify({ action: 'subscribe', channel }));
      });
      
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
    if (isConnected) {
      ws.current.send(JSON.stringify({ action: 'subscribe', channel }));
    }
  };
  
  return (
    <WebSocketContext.Provider value={{ subscribe, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}
```

### 2. Smart Reconnect Gated by Visibility

```jsx
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      if (!isConnected && reconnectAttempts.current < 5) {
        setTimeout(() => connect(), Math.pow(2, reconnectAttempts.current) * 1000);
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

### 3. Prefetch on Connection

```javascript
const prefetchOnConnect = () => {
  // Request all data immediately upon connection
  ws.current.send(JSON.stringify({
    action: 'batch_subscribe',
    channels: ['prices', 'portfolio', 'notifications']
  }));
};
```

## Checklist

- [ ] Implement single shared WebSocket instance
- [ ] Add subscription management system
- [ ] Implement smart reconnect with backoff
- [ ] Gate reconnect on page visibility
- [ ] Prefetch data immediately on connection
- [ ] Handle reconnection resubscription
- [ ] Monitor connection health
- [ ] Implement connection status UI

## Key Metrics

- **Connection time:** Under 500ms
- **Reconnect time:** Under 1s
- **Active subscriptions:** Track count
- **Message latency:** Under 100ms
- **Connection uptime:** 99.9%

→ See implementation details in [streaming-optimization.md](./streaming-optimization.md) for real-time data handling
