/**
 * Alcohol Shop Age Verification Demo
 * Uses EUDIPLO to verify the customer is over 18
 */

import {
  createVerificationRequest,
  generateQRCode,
  generateVerificationUI,
  waitForSession,
  getElement,
  getSessionFromUrl,
  buildRedirectUrl,
  clearSessionFromUrl,
  type Session,
} from '../shared/utils';

const USE_CASE = 'alcohol-shop';

// DOM Elements
const checkoutSection = getElement<HTMLDivElement>('checkoutSection');
const verificationSection = getElement<HTMLDivElement>('verificationSection');
const successSection = getElement<HTMLDivElement>('successSection');
const infoSection = getElement<HTMLDivElement>('infoSection');
const qrPlaceholder = getElement<HTMLDivElement>('qrPlaceholder');
const sameDeviceLink = getElement<HTMLDivElement>('sameDeviceLink');
const statusText = getElement<HTMLSpanElement>('statusText');
const statusBadge = getElement<HTMLDivElement>('statusBadge');
const credentialDisplay = getElement<HTMLDivElement>('credentialDisplay');
const resultPanel = getElement<HTMLDivElement>('resultPanel');
const checkoutBtn = getElement<HTMLButtonElement>('checkoutBtn');

// State
let currentSessionId: string | null = null;

// Initialize
function init(): void {
  checkoutBtn.addEventListener('click', handleCheckout);
  
  // Check if returning from wallet with session
  const sessionId = getSessionFromUrl();
  if (sessionId) {
    resumeSession(sessionId);
  }
}

// Resume an existing session (from redirect)
async function resumeSession(sessionId: string): Promise<void> {
  currentSessionId = sessionId;
  
  // Show verification section in processing state
  checkoutSection.classList.add('hidden');
  verificationSection.classList.remove('hidden');
  infoSection.classList.add('hidden');
  
  // Hide QR code and same-device link (we're returning from wallet)
  qrPlaceholder.innerHTML = '<div class="processing-icon">🔄</div>';
  qrPlaceholder.classList.remove('has-qr');
  sameDeviceLink.classList.add('hidden');
  updateStatus('processing', 'Completing verification...');
  
  try {
    // Wait for verification to complete
    const session = await waitForSession(sessionId, {
      onUpdate: (s) => {
        if (s.status === 'pending') {
          updateStatus('waiting', 'Waiting for wallet response...');
        } else if (s.status === 'processing') {
          updateStatus('processing', 'Processing verification...');
        }
      },
    });
    
    // Clear session from URL on success
    clearSessionFromUrl();
    showSuccess(session);
  } catch (error) {
    clearSessionFromUrl();
    handleError(error);
  }
}

// Handle checkout button click
async function handleCheckout(): Promise<void> {
  checkoutBtn.disabled = true;
  checkoutBtn.textContent = 'Starting verification...';

  try {
    // Build redirect URL with {sessionId} placeholder - backend will replace it
    const redirectUrl = buildRedirectUrl('{sessionId}');
    
    // Create request with redirect URI containing placeholder
    const result = await createVerificationRequest(USE_CASE, redirectUrl);
    currentSessionId = result.sessionId;

    // Show verification section
    checkoutSection.classList.add('hidden');
    verificationSection.classList.remove('hidden');
    infoSection.classList.add('hidden');

    // Generate QR code and same-device link
    await generateVerificationUI(qrPlaceholder, sameDeviceLink, result.uri);
    updateStatus('waiting', 'Waiting for you to scan...');

    // Wait for verification to complete
    const session = await waitForSession(result.sessionId, {
      onUpdate: (s) => {
        if (s.status === 'pending') {
          updateStatus('waiting', 'Waiting for wallet response...');
        } else if (s.status === 'processing') {
          updateStatus('processing', 'Processing verification...');
        }
      },
    });

    // Handle success
    showSuccess(session);
  } catch (error) {
    handleError(error);
  } finally {
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = 'Proceed to Checkout';
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
  
  // Show verification section with error state
  checkoutSection.classList.add('hidden');
  verificationSection.classList.remove('hidden');
  infoSection.classList.add('hidden');
  
  // Clear QR placeholder and show error
  qrPlaceholder.innerHTML = '<div class="error-icon">⚠️</div>';
  qrPlaceholder.classList.remove('has-qr');
  sameDeviceLink.classList.add('hidden');
  updateStatus('error', `Something went wrong: ${message}`);
}

// Update status display
function updateStatus(status: string, message: string): void {
  statusBadge.className = `status ${status}`;
  statusText.textContent = message;
}

// Show success state
function showSuccess(session: Session): void {
  updateStatus('success', 'Age verified!');

  // Show result panel
  resultPanel.classList.remove('hidden');

  // Display credential data
  if (session.presentation) {
    const p = session.presentation as Record<string, unknown>;
    const isOver18 = p.age_over_18 === true || p.age_over_18 === 'true';

    credentialDisplay.innerHTML = `
      <div class="credential-item">
        <span class="label">Age Over 18</span>
        <span class="value ${isOver18 ? 'success' : 'error'}">${isOver18 ? '✓ Yes' : '✗ No'}</span>
      </div>
      <div class="credential-item">
        <span class="label">Verified At</span>
        <span class="value">${new Date().toLocaleTimeString()}</span>
      </div>
    `;
  }

  // Show success section after a delay
  setTimeout(() => {
    verificationSection.classList.add('hidden');
    successSection.classList.remove('hidden');
  }, 1500);
}

// Start the app
init();
