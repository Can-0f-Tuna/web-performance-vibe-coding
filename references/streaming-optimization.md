# True Streaming and Parallel Execution

Make AI interactions and data-heavy operations feel snappy and uninterrupted.

## Streaming Strategies

### 1. Real Token Streaming (Not Fake Chunking)

```javascript
// Real streaming implementation
async function* streamTokens(prompt) {
  const response = await fetch('/api/ai/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Stream-Format': 'token' // Signal real streaming
    },
    body: JSON.stringify({ prompt })
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const tokens = chunk.split('\n').filter(line => line.startsWith('data: '));
    
    for (const token of tokens) {
      const data = token.replace('data: ', '');
      if (data === '[DONE]') return;
      
      try {
        const parsed = JSON.parse(data);
        yield parsed.token; // Yield individual tokens
      } catch (e) {
        yield data;
      }
    }
  }
}

// React component for streaming display
function StreamingChat({ prompt }) {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  const sendMessage = async () => {
    setIsStreaming(true);
    setContent('');
    
    const stream = streamTokens(prompt);
    
    for await (const token of stream) {
      setContent(prev => prev + token);
    }
    
    setIsStreaming(false);
  };
  
  return (
    <div className="chat-message">
      <div className="content">{content}</div>
      {isStreaming && <span className="cursor">▌</span>}
    </div>
  );
}
```

### Anti-Buffering Headers

```javascript
// Server-side streaming with anti-buffering
export async function POST(request) {
  const { prompt } = await request.json();
  
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Stream tokens as they're generated
      for await (const token of generateTokens(prompt)) {
        const data = `data: ${JSON.stringify({ token })}\n\n`;
        controller.enqueue(encoder.encode(data));
      }
      
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'X-Content-Type-Options': 'nosniff',
      'Transfer-Encoding': 'chunked',
      'Connection': 'keep-alive'
    }
  });
}
```

## Parallel Tool Calls

### Backend Parallel Execution

```javascript
// API route with parallel tool calls
export async function POST(request) {
  const { query } = await request.json();
  
  // Parse intent and identify needed tools
  const tools = parseIntent(query);
  
  // Execute all tools in parallel
  const results = await Promise.allSettled(
    tools.map(tool => executeTool(tool))
  );
  
  // Aggregate results
  const aggregated = results.map((result, index) => ({
    tool: tools[index].name,
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : result.reason
  }));
  
  return Response.json(aggregated);
}

// Parallel data fetching with prioritization
async function fetchParallelData(ticker) {
  const requests = [
    { priority: 1, fn: () => fetchQuote(ticker) },
    { priority: 1, fn: () => fetchPrice(ticker) },
    { priority: 2, fn: () => fetchChart(ticker) },
    { priority: 2, fn: () => fetchNews(ticker) },
    { priority: 3, fn: () => fetchSocial(ticker) }
  ];
  
  // Group by priority
  const byPriority = requests.reduce((acc, req) => {
    acc[req.priority] = acc[req.priority] || [];
    acc[req.priority].push(req.fn);
    return acc;
  }, {});
  
  const results = {};
  
  // Execute priority 1 first, then 2, then 3
  for (const priority of Object.keys(byPriority).sort()) {
    const priorityResults = await Promise.all(
      byPriority[priority].map(fn => fn())
    );
    Object.assign(results, ...priorityResults);
  }
  
  return results;
}
```

### Batched Prompts

```javascript
// Batch multiple prompts into single request
async function batchPrompts(prompts) {
  const response = await fetch('/api/ai/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompts,
      parallel: true
    })
  });
  
  return response.json();
}

// Usage: Summarize 5 stocks in one request
const summaries = await batchPrompts([
  { id: 'AAPL', prompt: 'Summarize AAPL stock performance' },
  { id: 'GOOGL', prompt: 'Summarize GOOGL stock performance' },
  { id: 'MSFT', prompt: 'Summarize MSFT stock performance' },
  { id: 'AMZN', prompt: 'Summarize AMZN stock performance' },
  { id: 'TSLA', prompt: 'Summarize TSLA stock performance' }
]);
```

## Client-Side API Batching

### Single Endpoint Batching

```javascript
// Batch multiple API calls into single request
class APIBatcher {
  constructor() {
    this.queue = [];
    this.timeout = null;
    this.batchSize = 10;
    this.batchWindow = 50; // ms
  }
  
  add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ ...request, resolve, reject });
      
      if (this.queue.length >= this.batchSize) {
        this.flush();
      } else if (!this.timeout) {
        this.timeout = setTimeout(() => this.flush(), this.batchWindow);
      }
    });
  }
  
  async flush() {
    if (this.queue.length === 0) return;
    
    clearTimeout(this.timeout);
    this.timeout = null;
    
    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: batch.map(({ resolve, reject, ...req }) => req)
        })
      });
      
      const results = await response.json();
      
      // Resolve individual promises
      results.forEach((result, index) => {
        if (result.error) {
          batch[index].reject(new Error(result.error));
        } else {
          batch[index].resolve(result.data);
        }
      });
    } catch (error) {
      batch.forEach(({ reject }) => reject(error));
    }
  }
}

// Usage
const batcher = new APIBatcher();

// These get batched into single request
const price1 = batcher.add({ endpoint: '/price/AAPL' });
const price2 = batcher.add({ endpoint: '/price/GOOGL' });
const price3 = batcher.add({ endpoint: '/price/MSFT' });

const [aapl, googl, msft] = await Promise.all([price1, price2, price3]);
```

## Streaming UI Patterns

### Progress Indicators

```javascript
function StreamingProgress({ progress }) {
  return (
    <div className="streaming-progress">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="progress-text">{progress}%</span>
    </div>
  );
}

// With streaming tokens
function StreamingResponse({ stream }) {
  const [content, setContent] = useState('');
  const [tokensReceived, setTokensReceived] = useState(0);
  const [estimatedTokens, setEstimatedTokens] = useState(100);
  
  useEffect(() => {
    let tokenCount = 0;
    
    const consumeStream = async () => {
      for await (const token of stream) {
        tokenCount++;
        setTokensReceived(tokenCount);
        setContent(prev => prev + token);
        
        // Update estimate based on actual flow
        if (tokenCount > estimatedTokens) {
          setEstimatedTokens(tokenCount * 1.5);
        }
      }
    };
    
    consumeStream();
  }, [stream]);
  
  const progress = Math.min((tokensReceived / estimatedTokens) * 100, 95);
  
  return (
    <div>
      <div className="response">{content}</div>
      {tokensReceived < estimatedTokens && (
        <StreamingProgress progress={progress} />
      )}
    </div>
  );
}
```

## React Server Components Streaming

### `renderToReadableStream`

```javascript
// Server-side: stream React Server Components to the client
import { renderToReadableStream } from 'react-dom/server';

async function handler(request) {
  const stream = await renderToReadableStream(
    <App />,
    {
      bootstrapScripts: ['/client.js'],
      onError(error) {
        console.error('Stream error:', error);
      }
    }
  );
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/html',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
```

### Out-of-Order Streaming with `use()`

```javascript
// React Server Component with streaming data dependencies
async function StockWidget({ ticker }) {
  // Fetch data — rendered on server, streamed to client as it resolves
  const price = await fetchPrice(ticker);
  
  return (
    <Suspense fallback={<PriceSkeleton />}>
      <PriceDisplay price={price} />
    </Suspense>
  );
}

// Client component receives streamed HTML progressively
// Users see the shell immediately, content fills in as data arrives
```

## Node.js `pipe()` for Large Responses

```javascript
// Stream large datasets without buffering into memory
import { createReadStream } from 'fs';
import { Transform } from 'stream';

app.get('/api/export/csv', (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Transfer-Encoding', 'chunked');
  
  // Pipe a large file through a transform, never loading all at once
  createReadStream('/data/large-dataset.csv')
    .pipe(new Transform({
      transform(chunk, encoding, callback) {
        // Optional: transform each chunk (e.g. filter, map)
        callback(null, chunk);
      }
    }))
    .pipe(res);
});

// Streaming JSON array — each item sent as its own chunk
app.get('/api/stream/records', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.write('[');
  
  let first = true;
  for await (const record of fetchRecords()) {
    if (!first) res.write(',');
    res.write(JSON.stringify(record));
    first = false;
  }
  
  res.write(']');
  res.end();
});
```

## Server-Sent Events (SSE)

```javascript
// Server: one-way real-time data pushed to client
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  
  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  
  // Push updates as they happen
  const interval = setInterval(() => {
    const update = { price: Math.random() * 100, timestamp: Date.now() };
    res.write(`data: ${JSON.stringify(update)}\n\n`);
  }, 1000);
  
  // Clean up on client disconnect
  req.on('close', () => clearInterval(interval));
});

// Client: consume SSE stream
const eventSource = new EventSource('/api/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateUI(data);
};

eventSource.onerror = () => {
  // EventSource auto-reconnects by default
  console.warn('SSE connection lost, retrying...');
};
```

## Optimistic UI with Streaming

```javascript
function OptimisticStreamingChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    // Add user message immediately
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Add optimistic assistant message
    const assistantId = Date.now();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true
    }]);
    
    // Stream response
    const stream = streamChatResponse(input);
    let fullContent = '';
    
    for await (const token of stream) {
      fullContent += token;
      setMessages(prev => prev.map(msg => 
        msg.id === assistantId 
          ? { ...msg, content: fullContent }
          : msg
      ));
    }
    
    // Mark as complete
    setMessages(prev => prev.map(msg => 
      msg.id === assistantId 
        ? { ...msg, isStreaming: false }
        : msg
    ));
  };
  
  return (
    <div className="chat">
      {messages.map(msg => (
        <div key={msg.id} className={`message ${msg.role}`}>
          <div className="message-content">{msg.content}</div>
          {msg.isStreaming && <span className="streaming-indicator" />}
        </div>
      ))}
      <input 
        value={input} 
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
    </div>
  );
}
```

## Checklist

- [ ] Implement real token streaming (not chunked simulation)
- [ ] Add anti-buffering headers to disable proxy buffering
- [ ] Use `renderToReadableStream` for React Server Component streaming
- [ ] Use `pipe()` for streaming large responses in Node.js
- [ ] Implement SSE for one-way real-time data
- [ ] Use parallel tool calls on backend
- [ ] Implement batched prompts for efficiency
- [ ] Batch client-side API calls over single endpoint
- [ ] Add progress indicators for streaming operations
- [ ] Use optimistic UI updates with streaming
- [ ] Handle stream errors gracefully
- [ ] Test streaming on slow connections

## Key Metrics

- **Time to first token:** Under 500ms
- **Token streaming rate:** 50+ tokens per second
- **Parallel tool execution:** 5+ tools simultaneously
- **API batching efficiency:** 80%+ reduction in request overhead
- **Perceived latency:** Under 100ms for UI updates

## Key Takeaways

1. **Real streaming:** Send tokens as they're generated, not in chunks
2. **Disable buffering:** Use headers to prevent proxy/CDN buffering
3. **React streaming:** Use `renderToReadableStream` for progressive page delivery
4. **SSE:** Use Server-Sent Events for one-way real-time data (simpler than WebSocket)
5. **Pipe streams:** Use `pipe()` to stream large responses without memory overhead
6. **Parallel execution:** Run independent operations simultaneously
7. **Batch requests:** Combine multiple API calls into one
8. **Optimistic UI:** Show results immediately while streaming completes
