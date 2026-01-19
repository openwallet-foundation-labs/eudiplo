/**
 * Alpine Grand Hotel - Digital Check-in Demo
 * Uses EUDIPLO to verify guest identity for hotel registration
 * Requests: given_name, family_name, birthdate, nationality
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

const USE_CASE = 'hotel-checkin';

// DOM Elements
const reservationSection = getElement<HTMLElement>('reservationSection');
const verificationSection = getElement<HTMLElement>('verificationSection');
const successSection = getElement<HTMLElement>('successSection');
const qrCodeDiv = getElement<HTMLDivElement>('qrCode');
const sameDeviceLink = getElement<HTMLDivElement>('sameDeviceLink');
const statusText = getElement<HTMLParagraphElement>('statusText');
const checkinBtn = getElement<HTMLButtonElement>('checkinBtn');
const doneBtn = document.getElementById('doneBtn') as HTMLButtonElement | null;
const frontDeskLink = document.getElementById('frontDeskLink') as HTMLAnchorElement | null;

// Show one section, hide others
function showSection(section: HTMLElement): void {
  [reservationSection, verificationSection, successSection].forEach((s) => {
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
  checkinBtn.addEventListener('click', handleCheckin);
  doneBtn?.addEventListener('click', handleDone);
  frontDeskLink?.addEventListener('click', handleFrontDesk);
  
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
  statusText.textContent = 'Verifying your identity...';
  
  try {
    const session = await waitForSession(sessionId, {
      onUpdate: (s) => {
        if (s.status === 'pending') {
          statusText.textContent = 'Waiting for wallet response...';
        } else if (s.status === 'processing') {
          statusText.textContent = 'Processing guest registration...';
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

// Handle check-in button click
async function handleCheckin(): Promise<void> {
  checkinBtn.disabled = true;
  checkinBtn.textContent = 'Starting verification...';

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
          statusText.textContent = 'Processing guest registration...';
        }
      },
    });

    // Handle result
    handleVerificationResult(session);
  } catch (error) {
    handleError(error);
  } finally {
    checkinBtn.disabled = false;
    checkinBtn.textContent = '🪪 Check In with EUDI Wallet';
  }
}

// Handle verification result
function handleVerificationResult(session: Session): void {
  showSuccess(session);
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

  const claims = extractClaims(session.presentation || {});
  
  // Set guest name on key card
  const guestNameEl = document.getElementById('guestName');
  if (guestNameEl) {
    const firstName = claims.given_name || claims.first_name || '';
    const lastName = claims.family_name || claims.last_name || '';
    guestNameEl.textContent = `${firstName} ${lastName}`.trim() || 'Guest';
  }

  // Display verified data
  const verifiedDataEl = document.getElementById('verifiedData');
  if (verifiedDataEl) {
    verifiedDataEl.innerHTML = '';
    
    const displayFields = [
      { key: 'given_name', label: 'First Name', fallback: 'first_name' },
      { key: 'family_name', label: 'Last Name', fallback: 'last_name' },
      { key: 'birthdate', label: 'Date of Birth', fallback: 'birth_date' },
      { key: 'nationality', label: 'Nationality', fallback: 'nationalities' },
    ];
    
    for (const field of displayFields) {
      let value = claims[field.key] || claims[field.fallback];
      
      // Handle array values (e.g., nationalities)
      if (Array.isArray(value)) {
        value = value.join(', ');
      }
      
      if (value) {
        const item = document.createElement('div');
        item.className = 'verified-item';
        item.innerHTML = `
          <span class="label">${field.label}</span>
          <span class="value">✓ ${value}</span>
        `;
        verifiedDataEl.appendChild(item);
      }
    }

    // Add registration status
    const status = document.createElement('div');
    status.className = 'verified-item';
    status.innerHTML = `
      <span class="label">Guest Registration</span>
      <span class="value" style="color: #16a34a;">✓ Complete</span>
    `;
    verifiedDataEl.appendChild(status);
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

// Handle front desk link
function handleFrontDesk(e: Event): void {
  e.preventDefault();
  alert('Please proceed to the front desk in the lobby.\n\nOur staff will be happy to assist you with traditional check-in.');
}

// Handle done button
function handleDone(): void {
  window.location.href = '../';
}

// Start the app
init();
