# Webhook Reference Implementation

A reference webhook implementation for integrating with EUDIPLO credential issuance flows.

This serves as both:

1. A **test server** for development
2. A **reference implementation** showing how to handle webhook callbacks

## API Specification

The webhook API is documented in OpenAPI format: [`webhook-api.yaml`](./webhook-api.yaml)

You can view the interactive documentation using:

- [Swagger Editor](https://editor.swagger.io/) - paste the YAML content
- [OpenAPI Preview VS Code Extension](https://marketplace.visualstudio.com/items?itemName=zoellner.openapi-preview)

## Webhook Types

### 1. Claims Webhook (Unified)

**Endpoint**: `POST /claims`

Unified endpoint for resolving credential claims in all issuance flows:

- **Authorization Code Flow**: Receives `identity` field with token claims from AS
- **Presentation Flow**: Receives `credentials` field with disclosed credential claims

### 2. Notification Webhook

**Endpoint**: `POST /notify`

Called when the wallet notifies about credential status changes (`credential_accepted`, `credential_failure`, `credential_deleted`).

## TypeScript Types

TypeScript type definitions are available in [`src/types.ts`](./src/types.ts):

```typescript
import {
  ClaimsWebhookRequest,
  NotificationWebhookRequest,
  ClaimsWebhookResponse,
  AuthorizationIdentity,
  PresentedCredential,
  // Type guards
  isClaimsWebhookRequest,
  hasIdentity,
  hasCredentials,
  // Helpers
  createClaimsResponse,
  createDeferredResponse,
} from './types';
```

## Setup

```bash
pnpm install
```

## Run Locally

```bash
pnpm start
```

Starts a local server on port 8787.

## Deploy to Cloudflare Worker

```bash
pnpm run deploy
```

## Available Endpoints

| Endpoint                   | Description                                                   |
| -------------------------- | ------------------------------------------------------------- |
| `POST /claims`             | Unified claims webhook (auth code + presentation flows)       |
| `POST /notify`             | Notification webhook                                          |
| `POST /process`            | Alias for `/claims`                                           |
| `POST /external-as-claims` | Alias for `/claims` (kept for compatibility)                  |
| `POST /deferred-claims`    | Returns deferred response                                     |
| `POST /consume`            | Authenticated webhook example (requires `x-api-key: foo-bar`) |
