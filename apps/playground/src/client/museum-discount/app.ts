/**
 * Berlin History Museum Resident Discount Demo
 * Uses EUDIPLO to verify Berlin residency for ticket discount
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

const USE_CASE = 'museum-discount';

// DOM Elements
const ticketSection = getElement<HTMLElement>('ticketSection');
const verificationSection = getElement<HTMLElement>('verificationSection');
const successSection = getElement<HTMLElement>('successSection');
const notBerlinSection = getElement<HTMLElement>('notBerlinSection');
const qrCodeDiv = getElement<HTMLDivElement>('qrCode');
const sameDeviceLink = getElement<HTMLDivElement>('sameDeviceLink');
const statusText = getElement<HTMLParagraphElement>('statusText');
const verifyBtn = getElement<HTMLButtonElement>('verifyBtn');
const doneBtn = document.getElementById('doneBtn') as HTMLButtonElement | null;
const skipLink = document.getElementById('skipLink') as HTMLAnchorElement | null;
const tryAgainBtn = document.getElementById('tryAgainBtn') as HTMLButtonElement | null;
const purchaseBtn = document.getElementById('purchaseBtn') as HTMLButtonElement | null;
const buyRegularBtn = document.getElementById('buyRegularBtn') as HTMLButtonElement | null;

// Show one section, hide others
function showSection(section: HTMLElement): void {
  [ticketSection, verificationSection, successSection, notBerlinSection].forEach((s) => {
    s.style.display = s === section ? 'block' : 'none';
  });
}

// Initialize
function init(): void {
  verifyBtn.addEventListener('click', handleVerify);
  doneBtn?.addEventListener('click', handleDone);
  skipLink?.addEventListener('click', handleSkip);
  tryAgainBtn?.addEventListener('click', handleTryAgain);
  purchaseBtn?.addEventListener('click', handlePurchase);
  buyRegularBtn?.addEventListener('click', handleBuyRegular);
  
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
  statusText.textContent = 'Checking residency...';
  
  try {
    const session = await waitForSession(sessionId, {
      onUpdate: (s) => {
        if (s.status === 'pending') {
          statusText.textContent = 'Waiting for wallet response...';
        } else if (s.status === 'processing') {
          statusText.textContent = 'Verifying residency...';
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
          statusText.textContent = 'Verifying residency...';
        }
      },
    });

    // Handle result
    handleVerificationResult(session);
  } catch (error) {
    handleError(error);
  } finally {
    verifyBtn.disabled = false;
    verifyBtn.textContent = '🪪 Verify Berlin Residency & Get Discount';
  }
}

// Check if user is from Berlin
function isBerlinResident(session: Session): boolean {
  const claims = extractClaims(session);
  
  // Check various possible city field names
  // PID credentials have city in address.locality
  const address = claims.address as Record<string, unknown> | undefined;
  const city = address?.locality || claims.resident_city || claims.locality || claims.city || claims.place_of_residence;
  
  console.log(city);

  if (typeof city === 'string') {
    const cityLower = city.toLowerCase().trim();
    return cityLower === 'berlin' || cityLower.includes('berlin');
  }
  
  return false;
}

// Handle verification result
function handleVerificationResult(session: Session): void {
  if (isBerlinResident(session)) {
    showSuccess(session);
  } else {
    showNotBerlin(session);
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

// Generate ticket ID
function generateTicketId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'BHM-2026-';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Show success state (Berlin resident)
function showSuccess(session: Session): void {
  showSection(successSection);

  // Set ticket ID
  const ticketIdEl = document.getElementById('ticketId');
  if (ticketIdEl) {
    ticketIdEl.textContent = generateTicketId();
  }

  // Display verified data
  const verifiedDataEl = document.getElementById('verifiedData');
  if (verifiedDataEl) {
    verifiedDataEl.innerHTML = '';
    
    const claims = extractClaims(session);
    const address = claims.address as Record<string, unknown> | undefined;
    const city = address?.locality || claims.resident_city || claims.locality || claims.city || claims.place_of_residence;
    
    // Only show city verification result
    const item = document.createElement('div');
    item.className = 'verified-item';
    item.innerHTML = `
      <span class="label">City of Residence</span>
      <span class="value">✓ ${city || 'Berlin'}</span>
    `;
    verifiedDataEl.appendChild(item);

    // Add eligibility status
    const eligibility = document.createElement('div');
    eligibility.className = 'verified-item';
    eligibility.innerHTML = `
      <span class="label">Discount Eligibility</span>
      <span class="value" style="color: #16a34a;">✓ Qualified</span>
    `;
    verifiedDataEl.appendChild(eligibility);
  }
}

// Show not Berlin state
function showNotBerlin(session: Session): void {
  showSection(notBerlinSection);
  
  // Show the actual city that was presented
  const claims = extractClaims(session);
  const address = claims.address as Record<string, unknown> | undefined;
  const city = address?.locality || claims.resident_city || claims.locality || claims.city || claims.place_of_residence;
  
  const cityInfoEl = document.getElementById('notBerlinCity');
  if (cityInfoEl && city) {
    cityInfoEl.textContent = `Your verified residence: ${city}`;
  }
}

// Credential structure from session
interface SessionCredential {
  id: string;
  values: Array<Record<string, unknown>>;
}

// Extract claims from session credentials
function extractClaims(session: Session): Record<string, unknown> {
  // Session has credentials array: [{ id: "pid-sd-jwt", values: [{ address: { locality: "BERLIN" }, ... }] }]
  if (Array.isArray(session.credentials) && session.credentials.length > 0) {
    const credential = session.credentials[0] as unknown as SessionCredential;
    if (Array.isArray(credential.values) && credential.values.length > 0) {
      return credential.values[0];
    }
  }
  
  // Fallback to presentation for backwards compatibility
  const presentation = session.presentation || {};
  
  // Direct claims
  if (presentation.resident_city || presentation.locality || presentation.city) {
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

// Handle skip link (no discount)
function handleSkip(e: Event): void {
  e.preventDefault();
  alert('Proceeding to purchase regular ticket for €16.00');
  // In a real app, this would go to checkout
}

// Handle try again
function handleTryAgain(): void {
  showSection(ticketSection);
}

// Handle purchase (discounted)
function handlePurchase(): void {
  alert('🎫 Thank you for your purchase!\n\nYour resident discount ticket (€8.00) has been confirmed.\n\nEnjoy your visit to the Berlin History Museum!');
}

// Handle buy regular ticket
function handleBuyRegular(): void {
  alert('🎫 Thank you for your purchase!\n\nYour regular ticket (€16.00) has been confirmed.\n\nEnjoy your visit to the Berlin History Museum!');
}

// Handle done button
function handleDone(): void {
  window.location.href = '../';
}

// Start the app
init();
