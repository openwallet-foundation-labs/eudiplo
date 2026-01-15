# @eudiplo/sdk-core

Framework-agnostic EUDIPLO SDK for demos and integrations. Works with Node.js, browsers, React, Vue, vanilla JS, and any other JavaScript environment.

## Installation

```bash
npm install @eudiplo/sdk-core
# or
pnpm add @eudiplo/sdk-core
# or
yarn add @eudiplo/sdk-core
```

## Quick Start - The Simplest Way

### One-liner for Age Verification

```typescript
import { verifyAndWait } from '@eudiplo/sdk-core';

const session = await verifyAndWait({
  baseUrl: 'https://eudiplo.example.com',
  clientId: 'my-demo',
  clientSecret: 'secret',
  configId: 'age-over-18',
  onUri: (uri) => showQRCode(uri), // Your QR code display function
  onUpdate: (s) => console.log('Status:', s.status),
});

console.log('Verified!', session.credentials);
```

### Two-step Flow (More Control)

```typescript
import { verify } from '@eudiplo/sdk-core';

// Step 1: Create the request
const { uri, sessionId, waitForCompletion } = await verify({
  baseUrl: 'https://eudiplo.example.com',
  clientId: 'my-demo',
  clientSecret: 'secret',
  configId: 'age-over-18',
});

// Step 2: Show QR code
showQRCode(uri);

// Step 3: Wait for user to scan and respond
const session = await waitForCompletion();
console.log('Verified credentials:', session.credentials);
```

### Credential Issuance

```typescript
import { issue } from '@eudiplo/sdk-core';

const { uri, waitForCompletion } = await issue({
  baseUrl: 'https://eudiplo.example.com',
  clientId: 'my-demo',
  clientSecret: 'secret',
  credentialConfigurationIds: ['PID'],
  claims: {
    PID: { given_name: 'John', family_name: 'Doe', birthdate: '1990-01-15' },
  },
});

showQRCode(uri);
await waitForCompletion();
```

## Full API

### Factory Functions (Easiest)

| Function                 | Description                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `verify(options)`        | Create a presentation request, returns `{ uri, sessionId, waitForCompletion, getStatus }` |
| `issue(options)`         | Create an issuance offer, returns `{ uri, sessionId, waitForCompletion, getStatus }`      |
| `verifyAndWait(options)` | One-liner: create request + wait for result                                               |
| `issueAndWait(options)`  | One-liner: create offer + wait for result                                                 |

### Class-based API (More Control)

```typescript
import { EudiploClient } from '@eudiplo/sdk-core';

const client = new EudiploClient({
  baseUrl: 'https://eudiplo.example.com',
  clientId: 'my-demo-client',
  clientSecret: 'your-secret',
});

// Create a presentation request (e.g., for age verification)
const { uri, sessionId } = await client.createPresentationRequest({
  configId: 'age-over-18',
});

console.log('Show this QR code:', uri);

// Wait for the user to scan and respond
const session = await client.waitForSession(sessionId, {
  onUpdate: (s) => console.log('Status:', s.status),
});

console.log('Verified credentials:', session.credentials);
```

## API

### `new EudiploClient(config)`

Create a new client instance.

```typescript
const client = new EudiploClient({
  baseUrl: 'https://eudiplo.example.com', // EUDIPLO server URL
  clientId: 'my-client', // OAuth2 client ID
  clientSecret: 'secret', // OAuth2 client secret
  autoRefresh: true, // Auto-refresh tokens (default: true)
});
```

### `createPresentationRequest(options)`

Create a presentation request for credential verification.

```typescript
const { uri, sessionId } = await client.createPresentationRequest({
  configId: 'age-over-18', // Presentation config ID
  responseType: 'uri', // 'uri' | 'qrcode' | 'dc-api'
  redirectUri: 'https://...', // Optional redirect after completion
});
```

### `createIssuanceOffer(options)`

Create a credential issuance offer.

```typescript
const { uri, sessionId } = await client.createIssuanceOffer({
  credentialConfigurationIds: ['PID', 'mDL'],
  claims: {
    PID: { given_name: 'John', family_name: 'Doe' },
    mDL: { driving_privileges: [...] }
  },
  flow: 'pre_authorized_code',       // or 'authorization_code'
  txCode: '1234'                     // Optional transaction code
});
```

### `getSession(sessionId)`

Get the current state of a session.

```typescript
const session = await client.getSession(sessionId);
console.log(session.status); // 'active' | 'fetched' | 'completed' | 'expired' | 'failed'
```

### `waitForSession(sessionId, options)`

Poll until a session completes or fails.

```typescript
const session = await client.waitForSession(sessionId, {
  interval: 1000, // Poll every 1 second
  timeout: 60000, // Timeout after 60 seconds
  signal: abortController.signal, // Optional abort signal
  onUpdate: (session) => {
    console.log('Status:', session.status);
  },
});
```

## Examples

### Age Verification in a Web Shop

```typescript
import { EudiploClient } from '@eudiplo/sdk-core';

const client = new EudiploClient({
  baseUrl: process.env.EUDIPLO_URL,
  clientId: process.env.EUDIPLO_CLIENT_ID,
  clientSecret: process.env.EUDIPLO_CLIENT_SECRET,
});

// Express.js route handler
app.post('/api/verify-age', async (req, res) => {
  const { uri, sessionId } = await client.createPresentationRequest({
    configId: 'age-over-18',
    redirectUri: `${req.headers.origin}/checkout`,
  });

  res.json({ qrCodeUri: uri, sessionId });
});

app.get('/api/verify-age/:sessionId', async (req, res) => {
  const session = await client.getSession(req.params.sessionId);
  res.json({
    status: session.status,
    verified: session.status === 'completed',
  });
});
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';
import { EudiploClient } from '@eudiplo/sdk-core';

const client = new EudiploClient({...});

function useAgeVerification(configId: string) {
  const [uri, setUri] = useState<string>();
  const [status, setStatus] = useState<string>('idle');
  const [verified, setVerified] = useState(false);

  const startVerification = async () => {
    setStatus('pending');
    const { uri, sessionId } = await client.createPresentationRequest({ configId });
    setUri(uri);

    try {
      const session = await client.waitForSession(sessionId, {
        onUpdate: (s) => setStatus(s.status)
      });
      setVerified(true);
      setStatus('completed');
    } catch (e) {
      setStatus('failed');
    }
  };

  return { uri, status, verified, startVerification };
}
```

## Advanced: Direct API Access

For advanced use cases, you can access the generated API functions directly:

```typescript
import {
  client,
  sessionControllerGetAllSessions,
  credentialConfigControllerGetConfigs,
} from '@eudiplo/sdk-core/api';

// Configure the client
client.setConfig({
  baseUrl: 'https://eudiplo.example.com',
  headers: { Authorization: 'Bearer your-token' },
});

// Use any API endpoint
const configs = await credentialConfigControllerGetConfigs({});
```

## Requirements

- Node.js 20+ (uses native `fetch`)
- For older environments, use a `fetch` polyfill

## License

Apache-2.0
