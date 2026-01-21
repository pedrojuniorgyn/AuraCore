# @auracore/sdk

Official TypeScript/JavaScript SDK for AuraCore Agents API.

## Installation

```bash
npm install @auracore/sdk
# or
yarn add @auracore/sdk
# or
pnpm add @auracore/sdk
```

## Quick Start

```typescript
import { AuraCore } from '@auracore/sdk';

const client = new AuraCore({
  apiKey: 'ac_live_xxxxxxxxxxxxxxxxxxxx',
});

// Chat with fiscal agent
const response = await client.agents.chat('fiscal', 'Calcule o ICMS para SP');
console.log(response.message);
```

## Usage

### Agents

```typescript
// List available agents
const agents = await client.agents.list();

// Chat with an agent
const response = await client.agents.chat('fiscal', 'Qual a alíquota de ICMS?');
console.log(response.message);
console.log(response.toolCalls);

// With options
const response = await client.agents.chat({
  agent: 'financial',
  message: 'Gere um título a pagar',
  sessionId: 'session-123',
  context: { customerId: '456' },
});

// Streaming response
for await (const chunk of client.agents.chatStream({
  agent: 'fiscal',
  message: 'Explique o ICMS',
})) {
  process.stdout.write(chunk);
}
```

### Voice

```typescript
// Transcribe audio (base64)
const transcription = await client.voice.transcribe(audioBase64, {
  language: 'pt-BR',
});
console.log(transcription.text);

// Transcribe file (browser)
const file = document.getElementById('audio-input').files[0];
const transcription = await client.voice.transcribeFile(file);

// Synthesize text to speech
const audio = await client.voice.synthesize('Olá, como posso ajudar?', {
  voice: 'pt-BR-Standard-A',
});

// Get as blob for playback
const blob = await client.voice.synthesizeToBlob('Olá!');
const audioUrl = URL.createObjectURL(blob);
```

### RAG (Retrieval-Augmented Generation)

```typescript
// Query legislation
const result = await client.rag.query('legislação ICMS SP');
console.log(result.answer);
console.log(result.sources);

// List collections
const collections = await client.rag.listCollections();
```

### Documents

```typescript
// Upload document
const doc = await client.documents.upload({
  content: base64Content,
  filename: 'danfe.pdf',
  mimeType: 'application/pdf',
  documentType: 'danfe',
});

// Upload file (browser)
const file = document.getElementById('file-input').files[0];
const doc = await client.documents.uploadFile(file, 'danfe');

// Process document
const processed = await client.documents.process(doc.id);
console.log(processed.extractedData);

// Get document
const document = await client.documents.get(doc.id);
```

### Analytics

```typescript
// Get usage stats
const stats = await client.analytics.usage({
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  groupBy: 'day',
});
console.log(stats.totalRequests);
console.log(stats.estimatedCost);

// Get top agents
const topAgents = await client.analytics.topAgents(5);
```

## Configuration

```typescript
const client = new AuraCore({
  // Required
  apiKey: 'ac_live_xxx',

  // Optional
  baseUrl: 'https://api.auracore.com.br', // default
  timeout: 30000, // 30s default
  headers: {
    'X-Custom-Header': 'value',
  },
  retry: {
    maxRetries: 3, // default
    initialDelay: 1000, // 1s default
    maxDelay: 30000, // 30s default
  },
});
```

## Environment Variables

```bash
AURACORE_API_KEY=ac_live_xxx
AURACORE_BASE_URL=https://api.auracore.com.br
```

## Error Handling

```typescript
import {
  AuraCore,
  AuthenticationError,
  RateLimitError,
  ValidationError,
} from '@auracore/sdk';

try {
  const response = await client.agents.chat('fiscal', 'Hello');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (error instanceof ValidationError) {
    console.error('Invalid request:', error.details);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  ChatRequest,
  ChatResponse,
  AgentType,
  TranscribeResponse,
} from '@auracore/sdk';

const request: ChatRequest = {
  agent: 'fiscal',
  message: 'Hello',
};
```

## Features

- **Zero dependencies** - Uses native fetch API
- **Full TypeScript support** - Strict types for all operations
- **Browser and Node.js compatible** - Works everywhere
- **Streaming support** - Real-time chat responses
- **Automatic retry** - Exponential backoff with jitter
- **Comprehensive error handling** - Typed error classes

## Available Resources

| Resource | Methods |
|----------|---------|
| `agents` | `list`, `get`, `chat`, `chatStream` |
| `voice` | `transcribe`, `transcribeFile`, `synthesize`, `synthesizeToBlob` |
| `rag` | `query`, `listCollections`, `getCollection` |
| `documents` | `upload`, `uploadFile`, `process`, `get`, `delete`, `list` |
| `analytics` | `usage`, `topAgents`, `topTools`, `costEstimate` |

## License

MIT
