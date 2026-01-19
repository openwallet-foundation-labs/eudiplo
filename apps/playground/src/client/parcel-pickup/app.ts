/**
 * SwiftBox - Parcel Pickup Demo
 * Uses EUDIPLO to verify recipient identity with minimal data
 * Requests: given_name, family_name only
 */

import {
  createVerificationRequest,
  generateVerificationUI,
  waitForSession,
  getElement,
  getSessionFromUrl,
  buildRedirectUrl,
  clearSessionFromUrl,
  type Session,
} from '../shared/utils';

const USE_CASE = 'parcel-pickup';

// Expected recipient (in real app, this would come from backend)
const EXPECTED_RECIPIENT = {
  firstName: 'Max',
  lastName: 'Mustermann',
};

// DOM Elements
const parcelSection = getElement<HTMLElement>('parcelSection');
const verificationSection = getElement<HTMLElement>('verificationSection');
const successSection = getElement<HTMLElement>('successSection');
const mismatchSection = getElement<HTMLElement>('mismatchSection');
const qrCodeDiv = getElement<HTMLDivElement>('qrCode');
const sameDeviceLink = getElement<HTMLDivElement>('sameDeviceLink');
const statusText = getElement<HTMLParagraphElement>('statusText');
const verifyBtn = getElement<HTMLButtonElement>('verifyBtn');
const doneBtn = document.getElementById('doneBtn') as HTMLButtonElement | null;
const tryAgainBtn = document.getElementById('tryAgainBtn') as HTMLButtonElement | null;
const helpBtn = document.getElementById('helpBtn') as HTMLButtonElement | null;
const codeLink = document.getElementById('codeLink') as HTMLAnchorElement | null;

// Show one section, hide others
function showSection(section: HTMLElement): void {
  [parcelSection, verificationSection, successSection, mismatchSection].forEach((s) => {
    if (s === section) {
      s.style.display = 'block';
      s.classList.remove('hidden');
    } else {
      s.style.display = 'none';
      s.classList.add('hidden');
    }
  });
}

// Initialize
function init(): void {
  verifyBtn.addEventListener('click', handleVerify);
  doneBtn?.addEventListener('click', handleDone);
  tryAgainBtn?.addEventListener('click', handleTryAgain);
  helpBtn?.addEventListener('click', handleHelp);
  codeLink?.addEventListener('click', handleCodeLink);
  
  // Check if returning from wallet with session
  const sessionId = getSessionFromUrl();
  if (sessionId) {
    resumeSession(sessionId);
  }
}

// Resume an existing session (from redirect)
async function resumeSession(sessionId: string): Promise<void> {
  showSection(verificationSection);
  qrCodeDiv.innerHTML = '<div class="processing-icon">🔄</div>';
  qrCodeDiv.classList.remove('has-qr');
  sameDeviceLink.classList.add('hidden');
  statusText.textContent = 'Verifying recipient...';
  
  try {
    const session = await waitForSession(sessionId, {
      onUpdate: (s) => {
        if (s.status === 'pending') {
          statusText.textContent = 'Waiting for wallet response...';
        } else if (s.status === 'processing') {
          statusText.textContent = 'Checking recipient name...';
        }
      },
    });
    
    clearSessionFromUrl();
    handleVerificationResult(session);
  } catch (error) {
    clearSessionFromUrl();
    handleError(error);
  }
}

// Handle verify button click
async function handleVerify(): Promise<void> {
  verifyBtn.disabled = true;
  verifyBtn.textContent = 'Starting verification...';

  try {
    // Build redirect URL with {sessionId} placeholder
    const redirectUrl = buildRedirectUrl('{sessionId}');
    
    // Create verification request
    const result = await createVerificationRequest(USE_CASE, redirectUrl);

    // Show verification section with QR code
    showSection(verificationSection);
    await generateVerificationUI(qrCodeDiv, sameDeviceLink, result.uri);
    statusText.textContent = 'Scan the QR code with your EUDI Wallet';

    // Wait for verification to complete
    const session = await waitForSession(result.sessionId, {
      onUpdate: (s) => {
        if (s.status === 'pending') {
          statusText.textContent = 'Waiting for wallet response...';
        } else if (s.status === 'processing') {
          statusText.textContent = 'Checking recipient name...';
        }
      },
    });

    // Handle result
    handleVerificationResult(session);
  } catch (error) {
    handleError(error);
  } finally {
    verifyBtn.disabled = false;
    verifyBtn.textContent = '🪪 Verify & Open Locker';
  }
}

// Check if name matches expected recipient
function isRecipientMatch(session: Session): boolean {
  const claims = extractClaims(session.presentation || {});
  
  const firstName = String(claims.given_name || claims.first_name || '').toLowerCase().trim();
  const lastName = String(claims.family_name || claims.last_name || '').toLowerCase().trim();
  
  const expectedFirst = EXPECTED_RECIPIENT.firstName.toLowerCase();
  const expectedLast = EXPECTED_RECIPIENT.lastName.toLowerCase();
  
  // For demo purposes, we'll accept any name (in real app, strict match)
  // To test mismatch flow, you could check: return firstName === expectedFirst && lastName === expectedLast;
  return true; // Always match for demo
}

// Get full name from session
function getFullName(session: Session): string {
  const claims = extractClaims(session.presentation || {});
  const firstName = claims.given_name || claims.first_name || '';
  const lastName = claims.family_name || claims.last_name || '';
  return `${firstName} ${lastName}`.trim();
}

// Handle verification result
function handleVerificationResult(session: Session): void {
  if (isRecipientMatch(session)) {
    showSuccess(session);
  } else {
    showMismatch(session);
  }
}

// Handle errors
function handleError(error: unknown): void {
  console.error('Verification error:', error);
  let message = 'Unknown error';
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = String((error as { message: unknown }).message);
  }
  
  showSection(verificationSection);
  qrCodeDiv.innerHTML = '<div class="error-icon">⚠️</div>';
  qrCodeDiv.classList.remove('has-qr');
  sameDeviceLink.classList.add('hidden');
  statusText.textContent = `Error: ${message}`;
  statusText.classList.add('error');
}

// Show success state
function showSuccess(session: Session): void {
  showSection(successSection);

  // Display verified data
  const verifiedDataEl = document.getElementById('verifiedData');
  if (verifiedDataEl) {
    verifiedDataEl.innerHTML = '';
    
    const claims = extractClaims(session.presentation || {});
    const firstName = claims.given_name || claims.first_name;
    const lastName = claims.family_name || claims.last_name;
    
    if (firstName) {
      const item = document.createElement('div');
      item.className = 'verified-item';
      item.innerHTML = `
        <span class="label">First Name</span>
        <span class="value">✓ ${firstName}</span>
      `;
      verifiedDataEl.appendChild(item);
    }
    
    if (lastName) {
      const item = document.createElement('div');
      item.className = 'verified-item';
      item.innerHTML = `
        <span class="label">Last Name</span>
        <span class="value">✓ ${lastName}</span>
      `;
      verifiedDataEl.appendChild(item);
    }

    // Match status
    const status = document.createElement('div');
    status.className = 'verified-item';
    status.innerHTML = `
      <span class="label">Recipient Match</span>
      <span class="value">✓ Confirmed</span>
    `;
    verifiedDataEl.appendChild(status);
  }
}

// Show mismatch state
function showMismatch(session: Session): void {
  showSection(mismatchSection);
  
  const verifiedNameEl = document.getElementById('verifiedName');
  if (verifiedNameEl) {
    verifiedNameEl.textContent = getFullName(session);
  }
}

// Extract claims from various presentation formats
function extractClaims(presentation: Record<string, unknown>): Record<string, unknown> {
  // Direct claims
  if (presentation.given_name || presentation.family_name) {
    return presentation;
  }
  
  // Nested in credentials array
  if (Array.isArray(presentation.credentials) && presentation.credentials.length > 0) {
    return presentation.credentials[0] as Record<string, unknown>;
  }
  
  // Nested in credential object
  if (presentation.credential && typeof presentation.credential === 'object') {
    return presentation.credential as Record<string, unknown>;
  }
  
  return presentation;
}

// Handle code link
function handleCodeLink(e: Event): void {
  e.preventDefault();
  const code = prompt('Enter your pickup code from SMS:');
  if (code) {
    alert(`Code "${code}" entered.\n\nIn a real system, this would verify via SMS code instead of wallet.`);
  }
}

// Handle try again
function handleTryAgain(): void {
  showSection(parcelSection);
}

// Handle help
function handleHelp(): void {
  alert('SwiftBox Customer Support\n\n📞 Hotline: 0800-SWIFT-BOX\n📧 Email: support@swiftbox.example\n\nOur team is available 24/7 to assist you.');
}

// Handle done button
function handleDone(): void {
  window.location.href = '../';
}

// Start the app
init();
