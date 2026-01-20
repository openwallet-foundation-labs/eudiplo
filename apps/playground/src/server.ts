/**
 * EUDIPLO Playground Server (Standalone)
 *
 * Express.js server that handles API requests for all demo use cases.
 * Uses @eudiplo/sdk-core for all EUDIPLO interactions.
 * Serves static files from the public directory.
 */

import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EudiploClient } from '@eudiplo/sdk-core';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration from environment variables
const config = {
  port: Number.parseInt(process.env.PORT || '8080', 10),
  eudiploUrl: process.env.EUDIPLO_URL || 'http://localhost:3000',
  clientId: process.env.CLIENT_ID || 'root',
  clientSecret: process.env.CLIENT_SECRET || 'root',
};

// Use case configurations - map use case ID to presentation config
const USE_CASES: Record<string, { presentationConfigId: string; name: string }> = {
  'alcohol-shop': {
    presentationConfigId: 'age-over-18',
    name: 'Alcohol Shop - Age Verification',
  },
  'bank-onboarding': {
    presentationConfigId: 'playground-pid',
    name: 'Bank Onboarding - Identity Verification',
  },
  'sim-activation': {
    presentationConfigId: 'playground-pid',
    name: 'SIM Activation - Identity Verification (TKG §172)',
  },
  'museum-discount': {
    presentationConfigId: 'resident-city',
    name: 'Museum Discount - Berlin Residency Verification',
  },
  'hotel-checkin': {
    presentationConfigId: 'hotel-guest',
    name: 'Hotel Check-in - Guest Registration',
  },
  'parcel-pickup': {
    presentationConfigId: 'name-only',
    name: 'Parcel Pickup - Recipient Verification',
  },
};

// Credential configurations for issuance
const CREDENTIALS: Record<string, { credentialConfigId: string; name: string }> = {
  pid: {
    credentialConfigId: 'pid',
    name: 'Personal ID (PID)',
  },
};

// Create Express app
const app = express();

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 120, // 120 requests per minute
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Middleware
app.use(express.json());

// CORS middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Handle CORS preflight
app.options('*', (_req: Request, res: Response) => {
  res.sendStatus(200);
});

// Create EUDIPLO client helper
function createClient(): EudiploClient {
  return new EudiploClient({
    baseUrl: config.eudiploUrl,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  });
}

// API Routes

// GET /api/use-cases - List available use cases
app.get('/api/use-cases', (_req: Request, res: Response) => {
  res.json(
    Object.entries(USE_CASES).map(([id, cfg]) => ({
      id,
      name: cfg.name,
    }))
  );
});

// POST /api/verify - Create a presentation request
app.post('/api/verify', async (req: Request, res: Response) => {
  try {
    const { useCase, redirectUri } = req.body as { useCase: string; redirectUri?: string };
    const useCaseConfig = USE_CASES[useCase];

    if (!useCaseConfig) {
      res.status(400).json({ error: `Unknown use case: ${useCase}` });
      return;
    }

    const client = createClient();

    // Create the presentation request
    const { uri, sessionId } = await client.createPresentationRequest({
      configId: useCaseConfig.presentationConfigId,
      redirectUri,
    });

    res.json({ uri, sessionId });
  } catch (error: any) {
    console.error('API Error (verify):', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// POST /api/issue - Create a credential issuance offer
app.post('/api/issue', async (req: Request, res: Response) => {
  try {
    const { credentialId, claims } = req.body as {
      credentialId: string;
      claims?: Record<string, unknown>;
    };
    const credential = CREDENTIALS[credentialId];

    if (!credential) {
      res.status(400).json({ error: `Unknown credential: ${credentialId}` });
      return;
    }

    const client = createClient();

    // Create the issuance offer
    const { uri, sessionId } = await client.createIssuanceOffer({
      credentialConfigurationIds: [credential.credentialConfigId],
      claims: claims ? { [credential.credentialConfigId]: claims } : undefined,
    });

    res.json({ uri, sessionId });
  } catch (error: any) {
    console.error('API Error (issue):', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// GET /api/session/:id - Get session status
app.get('/api/session/:id', async (req: Request, res: Response) => {
  try {
    const { id: sessionId } = req.params;

    const client = createClient();
    const session = await client.getSession(sessionId);

    // Only return safe data (no raw credentials)
    res.json({
      status: session.status,
      credentials: session.credentials,
    });
  } catch (error: any) {
    console.error('API Error (session):', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Serve static files from public directory
const publicDir = path.resolve(__dirname, '..', 'public');

app.use(express.static(publicDir));

// Fallback to index.html for SPA-like behavior (serve index.html for directories)
app.get('*', (req: Request, res: Response) => {
  const requestPath = req.path;

  // Files with extensions are handled by express.static, return 404 for missing files
  if (requestPath.includes('.')) {
    res.status(404).send('Not Found');
    return;
  }

  // Sanitize path to prevent path traversal attacks
  // path.normalize removes redundant separators and resolves . and .. segments
  const normalizedPath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const indexPath = path.resolve(publicDir, normalizedPath.slice(1), 'index.html');

  // Ensure the resolved path is still within publicDir (prevent path traversal)
  if (!indexPath.startsWith(publicDir)) {
    res.status(403).send('Forbidden');
    return;
  }

  res.sendFile(indexPath, (err) => {
    if (err) {
      // Fallback to main index.html
      res.sendFile(path.join(publicDir, 'index.html'));
    }
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`🎮 EUDIPLO Playground running at http://localhost:${config.port}`);
  console.log(`📡 EUDIPLO Backend: ${config.eudiploUrl}`);
});
