import { client } from './api/client.gen';
import {
  authControllerGetOAuth2Token,
  credentialOfferControllerGetOffer,
  verifierOfferControllerGetOffer,
  sessionControllerGetSession,
} from './api/sdk.gen';
import type {
  Session,
  OfferRequestDto,
  PresentationRequest,
} from './api/types.gen';

/**
 * Configuration options for the EudiploClient
 */
export interface EudiploClientConfig {
  /** Base URL of the EUDIPLO server (e.g., 'https://eudiplo.example.com') */
  baseUrl: string;
  /** OAuth2 client ID */
  clientId: string;
  /** OAuth2 client secret */
  clientSecret: string;
  /** Optional: Auto-refresh token before expiry (default: true) */
  autoRefresh?: boolean;
  /** Optional: Custom fetch implementation (useful for Cloudflare Workers) */
  fetch?: typeof fetch;
}

/**
 * Options for session polling
 */
export interface SessionPollingOptions {
  /** Polling interval in milliseconds (default: 1000) */
  interval?: number;
  /** Maximum time to wait in milliseconds (default: 300000 = 5 minutes) */
  timeout?: number;
  /** Callback on each poll */
  onUpdate?: (session: Session) => void;
  /** AbortSignal to cancel polling */
  signal?: AbortSignal;
}

/**
 * Simplified options for creating an issuance offer
 */
export interface IssuanceOfferOptions {
  /** Credential configuration IDs to issue */
  credentialConfigurationIds: string[];
  /** Claims to include in the credentials (keyed by config ID) */
  claims?: Record<string, Record<string, unknown>>;
  /** Response type: 'qrcode' returns a data URL, 'uri' returns the offer URI */
  responseType?: 'qrcode' | 'uri' | 'dc-api';
  /** Transaction code for pre-authorized flow */
  txCode?: string;
  /** Flow type (default: 'pre_authorized_code') */
  flow?: 'authorization_code' | 'pre_authorized_code';
}

/**
 * Simplified options for creating a presentation request
 */
export interface PresentationRequestOptions {
  /** ID of the presentation configuration */
  configId: string;
  /** Response type: 'qrcode' returns a data URL, 'uri' returns the request URI */
  responseType?: 'qrcode' | 'uri' | 'dc-api';
  /** Optional redirect URI after presentation completes */
  redirectUri?: string;
}

/**
 * Result of creating an offer or request
 */
export interface OfferResult {
  /** The URI to encode in a QR code or use directly */
  uri: string;
  /** Session ID for polling */
  sessionId: string;
}

/**
 * Framework-agnostic EUDIPLO client for demos and integrations.
 *
 * @example
 * ```typescript
 * import { EudiploClient } from '@eudiplo/sdk-core';
 *
 * const client = new EudiploClient({
 *   baseUrl: 'https://eudiplo.example.com',
 *   clientId: 'my-demo',
 *   clientSecret: 'secret123'
 * });
 *
 * // Create a presentation request for age verification
 * const { uri, sessionId } = await client.createPresentationRequest({
 *   configId: 'age-over-18'
 * });
 *
 * // Display QR code with `uri`, then wait for completion
 * const session = await client.waitForSession(sessionId);
 * console.log('Verified:', session.credentials);
 * ```
 */
export class EudiploClient {
  private config: EudiploClientConfig;
  private accessToken?: string;
  private tokenExpiresAt?: number;
  private refreshPromise?: Promise<void>;

  constructor(config: EudiploClientConfig) {
    this.config = {
      autoRefresh: true,
      ...config,
    };

    // Configure the underlying API client
    client.setConfig({
      baseUrl: config.baseUrl,
      fetch: config.fetch,
    });
  }

  /**
   * Authenticate and obtain an access token.
   * Called automatically by other methods, but can be called explicitly.
   */
  async authenticate(): Promise<void> {
    // Prevent concurrent authentication attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._doAuthenticate();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = undefined;
    }
  }

  private async _doAuthenticate(): Promise<void> {    
    const res = await authControllerGetOAuth2Token({
      body: {
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      },
    });

    if (!res.response.ok) {
      const error = await res.response.text();
      throw new Error(`Authentication failed: ${res.response.status} ${error}`);
    }

    const data = res.data;
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;    

    // Update client with auth header
    client.setConfig({
      baseUrl: this.config.baseUrl,
      fetch: this.config.fetch,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
  }

  /**
   * Ensure we have a valid access token, refreshing if necessary.
   */
  private async ensureAuthenticated(): Promise<void> {
    const bufferMs = 60000; // 1 minute buffer

    if (!this.accessToken || !this.tokenExpiresAt) {
      await this.authenticate();
      return;
    }

    if (this.config.autoRefresh && Date.now() > this.tokenExpiresAt - bufferMs) {
      await this.authenticate();
    }
  }

  /**
   * Create a credential issuance offer.
   *
   * @example
   * ```typescript
   * const { uri, sessionId } = await client.createIssuanceOffer({
   *   credentialConfigurationIds: ['PID'],
   *   claims: {
   *     PID: { given_name: 'John', family_name: 'Doe' }
   *   }
   * });
   * ```
   */
  async createIssuanceOffer(options: IssuanceOfferOptions): Promise<OfferResult> {
    await this.ensureAuthenticated();

    const body: OfferRequestDto = {
      response_type: options.responseType ?? 'uri',
      credentialConfigurationIds: options.credentialConfigurationIds,
      flow: options.flow ?? 'pre_authorized_code',
      tx_code: options.txCode,
    };

    // Build credential claims if provided
    if (options.claims) {
      body.credentialClaims = {
        additionalProperties: undefined,
      };
      // For simplicity, we use inline claims
      for (const [configId, claims] of Object.entries(options.claims)) {
        // The API expects a specific structure
        (body.credentialClaims as Record<string, unknown>)[configId] = {
          type: 'inline',
          claims,
        };
      }
    }

    const response = await credentialOfferControllerGetOffer({
      body,
    });

    if (!response.data) {
      throw new Error('Failed to create issuance offer');
    }

    return {
      uri: response.data.uri,
      sessionId: response.data.session,
    };
  }

  /**
   * Create a presentation request (for verification).
   *
   * @example
   * ```typescript
   * // Age verification
   * const { uri, sessionId } = await client.createPresentationRequest({
   *   configId: 'age-over-18'
   * });
   *
   * // Show QR code, wait for wallet to respond
   * const session = await client.waitForSession(sessionId);
   * ```
   */
  async createPresentationRequest(options: PresentationRequestOptions): Promise<OfferResult> {
    await this.ensureAuthenticated();

    const body: PresentationRequest = {
      response_type: options.responseType ?? 'uri',
      requestId: options.configId,
      redirectUri: options.redirectUri,
    };

    const response = await verifierOfferControllerGetOffer({
      body,
    });

    if (!response.data) {
      throw new Error('Failed to create presentation request');
    }

    return {
      uri: response.data.uri,
      sessionId: response.data.session,
    };
  }

  /**
   * Get the current status of a session.
   */
  async getSession(sessionId: string): Promise<Session> {
    await this.ensureAuthenticated();

    const response = await sessionControllerGetSession({
      path: { id: sessionId },
    });

    if (!response.data) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return response.data;
  }

  /**
   * Wait for a session to complete (polling).
   *
   * @example
   * ```typescript
   * const session = await client.waitForSession(sessionId, {
   *   interval: 1000,
   *   timeout: 60000,
   *   onUpdate: (s) => console.log('Status:', s.status)
   * });
   * ```
   */
  async waitForSession(
    sessionId: string,
    options: SessionPollingOptions = {}
  ): Promise<Session> {
    const {
      interval = 1000,
      timeout = 300000,
      onUpdate,
      signal,
    } = options;

    const startTime = Date.now();

    while (true) {
      // Check for abort
      if (signal?.aborted) {
        throw new Error('Session polling aborted');
      }

      // Check for timeout
      if (Date.now() - startTime > timeout) {
        throw new Error(`Session polling timed out after ${timeout}ms`);
      }

      const session = await this.getSession(sessionId);

      if (onUpdate) {
        onUpdate(session);
      }

      // Check terminal states
      if (session.status === 'completed') {
        return session;
      }

      if (session.status === 'expired' || session.status === 'failed') {
        throw new Error(`Session ${session.status}: ${sessionId}`);
      }

      // Wait before next poll
      await this.sleep(interval, signal);
    }
  }

  /**
   * Helper to sleep with abort support
   */
  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(resolve, ms);

      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error('Aborted'));
        }, { once: true });
      }
    });
  }

  /**
   * Get the current access token (for advanced usage)
   */
  getAccessToken(): string | undefined {
    return this.accessToken;
  }

  /**
   * Get the configured base URL
   */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }
}

// ============================================================================
// Simple Factory Functions - For the easiest possible integration
// ============================================================================

/**
 * Credentials for EUDIPLO authentication
 */
export interface EudiploCredentials {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Options for the verify function
 */
export interface VerifyOptions extends EudiploCredentials {
  /** Presentation configuration ID */
  configId: string;
  /** Optional redirect URI */
  redirectUri?: string;
  /** Polling options */
  polling?: SessionPollingOptions;
}

/**
 * Options for the issue function
 */
export interface IssueOptions extends EudiploCredentials {
  /** Credential configuration IDs */
  credentialConfigurationIds: string[];
  /** Claims per credential config */
  claims?: Record<string, Record<string, unknown>>;
  /** Transaction code (optional) */
  txCode?: string;
  /** Polling options */
  polling?: SessionPollingOptions;
}

/**
 * Result of a verification or issuance flow
 */
export interface FlowResult {
  /** URI for QR code */
  uri: string;
  /** Session ID */
  sessionId: string;
  /** Wait for the session to complete */
  waitForCompletion: (options?: SessionPollingOptions) => Promise<Session>;
  /** Get current session status */
  getStatus: () => Promise<Session>;
}

/**
 * Create a presentation request for verification.
 * Returns a URI for QR code and a function to wait for completion.
 *
 * @example
 * ```typescript
 * import { verify } from '@eudiplo/sdk-core';
 *
 * const { uri, waitForCompletion } = await verify({
 *   baseUrl: 'https://eudiplo.example.com',
 *   clientId: 'demo',
 *   clientSecret: 'secret',
 *   configId: 'age-over-18'
 * });
 *
 * console.log('Scan this:', uri);
 * const session = await waitForCompletion();
 * console.log('Verified!', session.credentials);
 * ```
 */
export async function verify(options: VerifyOptions): Promise<FlowResult> {
  const client = new EudiploClient({
    baseUrl: options.baseUrl,
    clientId: options.clientId,
    clientSecret: options.clientSecret,
  });

  const { uri, sessionId } = await client.createPresentationRequest({
    configId: options.configId,
    redirectUri: options.redirectUri,
  });

  return {
    uri,
    sessionId,
    waitForCompletion: (pollingOptions?: SessionPollingOptions) =>
      client.waitForSession(sessionId, { ...options.polling, ...pollingOptions }),
    getStatus: () => client.getSession(sessionId),
  };
}

/**
 * Create a credential issuance offer.
 * Returns a URI for QR code and a function to wait for completion.
 *
 * @example
 * ```typescript
 * import { issue } from '@eudiplo/sdk-core';
 *
 * const { uri, waitForCompletion } = await issue({
 *   baseUrl: 'https://eudiplo.example.com',
 *   clientId: 'demo',
 *   clientSecret: 'secret',
 *   credentialConfigurationIds: ['PID'],
 *   claims: {
 *     PID: { given_name: 'John', family_name: 'Doe' }
 *   }
 * });
 *
 * console.log('Scan this:', uri);
 * const session = await waitForCompletion();
 * ```
 */
export async function issue(options: IssueOptions): Promise<FlowResult> {
  const client = new EudiploClient({
    baseUrl: options.baseUrl,
    clientId: options.clientId,
    clientSecret: options.clientSecret,
  });

  const { uri, sessionId } = await client.createIssuanceOffer({
    credentialConfigurationIds: options.credentialConfigurationIds,
    claims: options.claims,
    txCode: options.txCode,
  });

  return {
    uri,
    sessionId,
    waitForCompletion: (pollingOptions?: SessionPollingOptions) =>
      client.waitForSession(sessionId, { ...options.polling, ...pollingOptions }),
    getStatus: () => client.getSession(sessionId),
  };
}

/**
 * One-liner: Verify and wait for result in a single call.
 *
 * @example
 * ```typescript
 * import { verifyAndWait } from '@eudiplo/sdk-core';
 *
 * const session = await verifyAndWait({
 *   baseUrl: 'https://eudiplo.example.com',
 *   clientId: 'demo',
 *   clientSecret: 'secret',
 *   configId: 'age-over-18',
 *   onUri: (uri) => showQRCode(uri),
 *   onUpdate: (s) => console.log('Status:', s.status)
 * });
 * ```
 */
export async function verifyAndWait(
  options: VerifyOptions & {
    /** Called with the URI when available - use to display QR code */
    onUri: (uri: string) => void;
  }
): Promise<Session> {
  const { uri, waitForCompletion } = await verify(options);
  options.onUri(uri);
  return waitForCompletion(options.polling);
}

/**
 * One-liner: Issue credential and wait for completion in a single call.
 *
 * @example
 * ```typescript
 * import { issueAndWait } from '@eudiplo/sdk-core';
 *
 * const session = await issueAndWait({
 *   baseUrl: 'https://eudiplo.example.com',
 *   clientId: 'demo',
 *   clientSecret: 'secret',
 *   credentialConfigurationIds: ['PID'],
 *   claims: { PID: { given_name: 'John' } },
 *   onUri: (uri) => showQRCode(uri)
 * });
 * ```
 */
export async function issueAndWait(
  options: IssueOptions & {
    /** Called with the URI when available - use to display QR code */
    onUri: (uri: string) => void;
  }
): Promise<Session> {
  const { uri, waitForCompletion } = await issue(options);
  options.onUri(uri);
  return waitForCompletion(options.polling);
}
