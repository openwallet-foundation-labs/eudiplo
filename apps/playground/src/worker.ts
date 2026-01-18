/**
 * EUDIPLO Playground Worker
 * 
 * Handles API requests for all demo use cases, keeping credentials server-side.
 * Uses @eudiplo/sdk-core for all EUDIPLO interactions.
 */

import { EudiploClient } from '@eudiplo/sdk-core';

interface Env {
  EUDIPLO_URL: string;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  ASSETS: Fetcher;
}

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // API Routes
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url);
    }

    // Serve static assets - handled by Wrangler's assets binding
    // When assets binding is configured, Wrangler handles static files automatically
    if (env?.ASSETS?.fetch) {
      return env.ASSETS.fetch(request);
    }

    // Fallback: return 404 for unknown routes (static assets handled by wrangler)
    return new Response('Not Found', { status: 404 });
  },
};

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    // GET /api/use-cases - List available use cases
    if (url.pathname === '/api/use-cases' && request.method === 'GET') {
      return Response.json(
        Object.entries(USE_CASES).map(([id, config]) => ({
          id,
          name: config.name,
        })),
        { headers: corsHeaders }
      );
    }

    // POST /api/verify - Create a presentation request
    if (url.pathname === '/api/verify' && request.method === 'POST') {
      const body = await request.json() as { useCase: string; redirectUri?: string };
      const useCase = USE_CASES[body.useCase];

      if (!useCase) {
        return Response.json(
          { error: `Unknown use case: ${body.useCase}` },
          { status: 400, headers: corsHeaders }
        );
      }

      const client = new EudiploClient({
        baseUrl: env.EUDIPLO_URL,
        clientId: env.CLIENT_ID,
        clientSecret: env.CLIENT_SECRET,
      });

      // Create the presentation request
      const { uri, sessionId } = await client.createPresentationRequest({
        configId: useCase.presentationConfigId,
        // Pass redirect URI directly - caller is responsible for including session param
        redirectUri: body.redirectUri,
      });

      return Response.json({ uri, sessionId }, { headers: corsHeaders });
    }

    // GET /api/session/:id - Get session status
    if (url.pathname.startsWith('/api/session/') && request.method === 'GET') {
      const sessionId = url.pathname.replace('/api/session/', '');

      const client = new EudiploClient({
        baseUrl: env.EUDIPLO_URL,
        clientId: env.CLIENT_ID,
        clientSecret: env.CLIENT_SECRET,
      });

      const session = await client.getSession(sessionId);

      // Only return safe data (no raw credentials)
      return Response.json(
        {
          status: session.status,
          credentials: session.credentials,
        },
        { headers: corsHeaders }
      );
    }

    return Response.json({ error: 'Not Found' }, { status: 404, headers: corsHeaders });
  } catch (error: any) {
    console.error('API Error:', error);
    return Response.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
