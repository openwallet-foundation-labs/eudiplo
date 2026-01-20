/**
 * Shared utilities for playground demos
 */

// qrcode-generator library loaded from CDN
// https://github.com/kazuhikoarase/qrcode-generator
declare function qrcode(typeNumber: number, errorCorrectionLevel: string): {
  addData(data: string): void;
  make(): void;
  createImgTag(cellSize?: number, margin?: number): string;
  createSvgTag(cellSize?: number, margin?: number): string;
  createDataURL(cellSize?: number, margin?: number): string;
};

export interface VerificationResult {
  sessionId: string;
  uri: string;
}

export interface IssuanceResult {
  sessionId: string;
  uri: string;
}

export interface Session {
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'fetched' | 'failed' | 'expired';
  presentation?: Record<string, unknown>;
  credentials?: Array<Record<string, unknown>>;
}

export interface WaitOptions {
  onUpdate?: (session: Session) => void;
  timeout?: number;
  interval?: number;
}

/**
 * Extract error message from various error formats
 */
function extractErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (typeof err.error === 'string') {
      return err.error;
    }
    if (typeof err.message === 'string') {
      return err.message;
    }
    // Try to stringify for debugging
    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Create a credential issuance offer
 */
export async function createIssuanceOffer(
  credentialId: string,
  claims?: Record<string, unknown>
): Promise<IssuanceResult> {
  const response = await fetch('/api/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credentialId, claims }),
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      throw new Error(`Request failed with status ${response.status}`);
    }
    throw new Error(extractErrorMessage(errorBody, 'Failed to create issuance offer'));
  }

  return response.json();
}

/**
 * Create a presentation request and get the QR code URI
 */
export async function createVerificationRequest(
  useCase: string,
  redirectUri?: string
): Promise<VerificationResult> {
  const response = await fetch('/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ useCase, redirectUri }),
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      throw new Error(`Request failed with status ${response.status}`);
    }
    throw new Error(extractErrorMessage(errorBody, 'Failed to create request'));
  }

  return response.json();
}

/**
 * Get session status
 */
export async function getSessionStatus(sessionId: string): Promise<Session> {
  const response = await fetch(`/api/session/${sessionId}`);

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      throw new Error(`Request failed with status ${response.status}`);
    }
    throw new Error(extractErrorMessage(errorBody, 'Failed to get session'));
  }

  return response.json();
}

/**
 * Generate QR code in an element
 */
export async function generateQRCode(element: HTMLElement, uri: string): Promise<void> {
  // Clear previous content
  element.innerHTML = '';
  element.classList.add('has-qr');

  // Create QR code using qrcode-generator
  // Type 0 = auto-detect size, 'M' = medium error correction
  const qr = qrcode(0, 'M');
  qr.addData(uri);
  qr.make();

  // Create image element from QR code
  const img = document.createElement('img');
  img.src = qr.createDataURL(4, 2); // cellSize=4, margin=2
  img.alt = 'QR Code';
  img.style.width = '180px';
  img.style.height = '180px';
  element.appendChild(img);
}

/**
 * Generate both QR code and same-device link button
 */
export async function generateVerificationUI(
  qrElement: HTMLElement,
  linkElement: HTMLElement,
  uri: string
): Promise<void> {
  // Generate QR code
  await generateQRCode(qrElement, uri);

  // Create same-device link button
  linkElement.innerHTML = '';
  const link = document.createElement('a');
  link.href = uri;
  link.className = 'btn btn-primary same-device-btn';
  link.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
      <line x1="12" y1="18" x2="12.01" y2="18"></line>
    </svg>
    Open in Wallet
  `;
  linkElement.appendChild(link);
  linkElement.classList.remove('hidden');
}

/**
 * Poll for session completion
 */
export async function waitForSession(
  sessionId: string,
  options: WaitOptions = {}
): Promise<Session> {
  const { onUpdate, timeout = 300000, interval = 1500 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const session = await getSessionStatus(sessionId);

    if (onUpdate) {
      onUpdate(session);
    }

    // 'completed' for verification, 'fetched' for issuance
    if (session.status === 'completed' || session.status === 'fetched') {
      return session;
    }

    if (session.status === 'failed' || session.status === 'expired') {
      throw new Error(`Session ${session.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('Session timed out');
}

/**
 * Helper to get an element by ID with type safety
 */
export function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element #${id} not found`);
  }
  return element as T;
}

/**
 * Get session ID from URL query parameter
 */
export function getSessionFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('session');
}

/**
 * Build redirect URL with session parameter
 */
export function buildRedirectUrl(sessionId: string): string {
  const url = new URL(window.location.href);
  url.search = ''; // Clear existing params
  url.searchParams.set('session', sessionId);
  return url.toString();
}

/**
 * Clear session from URL (replace state without reload)
 */
export function clearSessionFromUrl(): void {
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState({}, '', url.toString());
}
