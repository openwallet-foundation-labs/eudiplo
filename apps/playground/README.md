# EUDIPLO Playground

A collection of realistic use case demos showcasing EUDI Wallet integration using EUDIPLO.

## Use Cases

### 🍷 Alcohol Shop (Age Verification)

Online alcohol purchase requiring age verification (over 18).

- **Credential:** Age verification (`age_over_18`)
- **Scenario:** Customer wants to buy wine online

### 🏦 Bank Onboarding (KYC)

Digital bank account opening with full identity verification.

- **Credential:** Full PID (Personal Identification Data)
- **Scenario:** Opening a new bank account requires KYC/AML compliance

### 🚗 Car Rental (License Verification)

Car rental booking requiring valid driving license.

- **Credential:** Mobile Driving License (mDL)
- **Scenario:** Renting a car requires proof of valid driving license

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Static HTML)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Alcohol Shop │  │ Bank Onboard │  │  Car Rental  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│           │                │                │                │
└───────────┼────────────────┼────────────────┼────────────────┘
            │                │                │
            ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Worker (API)                         │
│  - Handles authentication with EUDIPLO                       │
│  - Creates verification requests                             │
│  - Proxies session status                                    │
│  - Credentials stored securely in environment                │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                    EUDIPLO Backend                           │
│  - OID4VP verification                                       │
│  - Session management                                        │
│  - Credential verification                                   │
└─────────────────────────────────────────────────────────────┘
```

## Development

### Prerequisites

- Node.js 18+
- pnpm
- Access to an EUDIPLO instance

### Local Development

```bash
# Install dependencies
pnpm install

# Start local development server
pnpm run dev
```

This starts:

- Cloudflare Worker on `http://localhost:8787`
- Static files served from `/public`

### Environment Variables

Create a `.dev.vars` file for local development:

```
EUDIPLO_API_URL=https://your-eudiplo-instance.com
EUDIPLO_CLIENT_ID=your-client-id
EUDIPLO_CLIENT_SECRET=your-client-secret
```

### Deployment

Deploy to Cloudflare Workers:

```bash
# Login to Cloudflare
npx wrangler login

# Set secrets
npx wrangler secret put EUDIPLO_API_URL
npx wrangler secret put EUDIPLO_CLIENT_ID
npx wrangler secret put EUDIPLO_CLIENT_SECRET

# Deploy
pnpm run deploy
```

## Adding New Use Cases

1. Create a new directory under `/public/` (e.g., `/public/hotel-checkin/`)
2. Add `index.html`, `styles.css`, and `app.js`
3. Use the shared utilities from `/public/shared/utils.js`
4. Add the use case configuration in `src/worker.ts`
5. Add a card to the landing page in `/public/index.html`

### Use Case Configuration

In `src/worker.ts`, add your credential configuration:

```typescript
const USE_CASES: Record<string, UseCaseConfig> = {
  'hotel-checkin': {
    name: 'Hotel Check-in',
    credentialId: 'your-credential-config-id',
  },
  // ... other use cases
};
```

## License

Apache 2.0 - Part of [EUDIPLO](https://github.com/openwallet-foundation-labs/eudiplo)
