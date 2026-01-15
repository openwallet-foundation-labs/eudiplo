/**
 * Bank Onboarding KYC Verification Demo
 * Uses EUDIPLO to verify full PID for KYC/AML compliance
 */

import {
  createVerificationRequest,
  generateQRCode,
  generateVerificationUI,
  waitForSession,
  getElement,
  type Session,
} from '../shared/utils';

const USE_CASE = 'bank-onboarding';

// DOM Elements
const welcomeSection = getElement<HTMLElement>('welcomeSection');
const verificationSection = getElement<HTMLElement>('verificationSection');
const successSection = getElement<HTMLElement>('successSection');
const qrCodeDiv = getElement<HTMLDivElement>('qrCode');
const sameDeviceLink = getElement<HTMLDivElement>('sameDeviceLink');
const statusText = getElement<HTMLParagraphElement>('statusText');
const startBtn = getElement<HTMLButtonElement>('startBtn');
const continueBtn = document.getElementById('continueBtn') as HTMLButtonElement | null;

// Show one section, hide others
function showSection(section: HTMLElement): void {
  [welcomeSection, verificationSection, successSection].forEach((s) => {
    s.style.display = s === section ? 'block' : 'none';
  });
}

// Initialize
function init(): void {
  startBtn.addEventListener('click', handleStart);
  continueBtn?.addEventListener('click', handleContinue);
}

// Handle start button click
async function handleStart(): Promise<void> {
  startBtn.disabled = true;
  startBtn.textContent = 'Preparing verification...';

  try {
    // Start verification process
    const result = await createVerificationRequest(USE_CASE);

    // Show verification section with QR code
    showSection(verificationSection);
    await generateVerificationUI(qrCodeDiv, sameDeviceLink, result.uri);
    statusText.textContent = 'Use your EUDI Wallet to verify';

    // Wait for verification to complete
    const session = await waitForSession(result.sessionId, {
      onUpdate: (s) => {
        if (s.status === 'pending') {
          statusText.textContent = 'Waiting for wallet response...';
        } else if (s.status === 'processing') {
          statusText.textContent = 'Verifying your identity...';
        }
      },
    });

    // Handle success
    showSuccess(session);
  } catch (error) {
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
    showSection(verificationSection);
    qrCodeDiv.innerHTML = '<div class="error-icon">⚠️</div>';
    qrCodeDiv.classList.remove('has-qr');
    sameDeviceLink.classList.add('hidden');
    statusText.textContent = `Something went wrong: ${message}`;
    statusText.classList.add('error');
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = 'Open an Account';
  }
}

// Show success state
function showSuccess(session: Session): void {
  showSection(successSection);

  // Display verified data
  const resultsDiv = document.getElementById('verificationResults');
  if (resultsDiv && session.presentation) {
    const p = session.presentation as Record<string, unknown>;

    const fields = [
      {
        label: 'Full Name',
        value: [p.given_name, p.family_name].filter(Boolean).join(' '),
      },
      { label: 'Date of Birth', value: formatDate(p.birth_date || p.birthdate) },
      { label: 'Nationality', value: p.nationality || p.issuing_country },
      { label: 'Address', value: formatAddress(p) },
      {
        label: 'Document Number',
        value: p.personal_identifier || p.document_number || '***',
      },
    ].filter((f) => f.value && f.value !== '***');

    resultsDiv.innerHTML = fields
      .map(
        (f) => `
      <div class="result-item">
        <span class="result-label">${f.label}</span>
        <span class="result-value">${f.value}</span>
      </div>
    `
      )
      .join('');
  }
}

// Format date helper
function formatDate(date: unknown): string | null {
  if (!date || typeof date !== 'string') return null;
  try {
    return new Date(date).toLocaleDateString('en-EU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return date;
  }
}

// Format address helper
function formatAddress(p: Record<string, unknown>): string | null {
  const address = p.address as Record<string, unknown> | undefined;
  const parts = [
    p.street_address || address?.street_address,
    p.locality || address?.locality,
    p.postal_code || address?.postal_code,
    p.country || address?.country,
  ].filter(Boolean) as string[];

  return parts.length > 0 ? parts.join(', ') : null;
}

// Handle continue (demo only)
function handleContinue(): void {
  alert(
    '🎉 Demo complete!\n\nIn a real application, you would continue to account setup, choose your account type, set up security, and start banking.'
  );
}

// Start the app
init();
