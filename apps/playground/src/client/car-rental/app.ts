/**
 * Car Rental License Verification Demo
 * Uses EUDIPLO to verify driving license for car rental
 */

import {
  createVerificationRequest,
  generateQRCode,
  generateVerificationUI,
  waitForSession,
  getElement,
  type Session,
} from '../shared/utils';

const USE_CASE = 'car-rental';

// DOM Elements
const carSection = getElement<HTMLElement>('carSection');
const verificationSection = getElement<HTMLElement>('verificationSection');
const successSection = getElement<HTMLElement>('successSection');
const qrCodeDiv = getElement<HTMLDivElement>('qrCode');
const sameDeviceLink = getElement<HTMLDivElement>('sameDeviceLink');
const statusText = getElement<HTMLParagraphElement>('statusText');
const verifyBtn = getElement<HTMLButtonElement>('verifyBtn');
const doneBtn = document.getElementById('doneBtn') as HTMLButtonElement | null;

// Show one section, hide others
function showSection(section: HTMLElement): void {
  [carSection, verificationSection, successSection].forEach((s) => {
    s.style.display = s === section ? 'block' : 'none';
  });
}

// Initialize
function init(): void {
  verifyBtn.addEventListener('click', handleVerify);
  doneBtn?.addEventListener('click', handleDone);
}

// Handle verify button click
async function handleVerify(): Promise<void> {
  verifyBtn.disabled = true;
  verifyBtn.textContent = 'Starting verification...';

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
          statusText.textContent = 'Verifying your license...';
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
    verifyBtn.disabled = false;
    verifyBtn.textContent = 'Verify License & Complete Booking';
  }
}

// Generate confirmation number
function generateConfirmationNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'EUR-2026-';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Show success state
function showSuccess(session: Session): void {
  showSection(successSection);

  // Set confirmation number
  const confirmationNum = document.getElementById('confirmationNumber');
  if (confirmationNum) {
    confirmationNum.textContent = generateConfirmationNumber();
  }

  // Display verified license data
  const resultsDiv = document.getElementById('verificationResults');
  if (resultsDiv && session.presentation) {
    const p = session.presentation as Record<string, unknown>;

    const fields = [
      {
        label: 'Driver Name',
        value: [p.given_name, p.family_name].filter(Boolean).join(' '),
      },
      { label: 'Date of Birth', value: formatDate(p.birth_date || p.birthdate) },
      {
        label: 'License Number',
        value: maskLicenseNumber(p.document_number || p.license_number),
      },
      {
        label: 'Categories',
        value: formatCategories(p.driving_privileges || p.categories),
      },
      { label: 'Valid Until', value: formatDate(p.expiry_date || p.valid_until) },
      { label: 'Issuing Country', value: p.issuing_country || p.issuing_authority },
    ].filter((f) => f.value);

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
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return date;
  }
}

// Mask license number for privacy
function maskLicenseNumber(number: unknown): string | null {
  if (!number || typeof number !== 'string') return null;
  if (number.length <= 4) return number;
  return '***' + number.slice(-4);
}

// Format driving categories
function formatCategories(privileges: unknown): string {
  if (!privileges) return 'B (Standard Car)';
  if (Array.isArray(privileges)) {
    const codes = privileges
      .map((p) => (p as Record<string, unknown>).vehicle_category_code || (p as Record<string, unknown>).code || p)
      .filter(Boolean);
    return codes.length > 0 ? codes.join(', ') : 'B';
  }
  return String(privileges);
}

// Handle done (demo only)
function handleDone(): void {
  alert(
    '🚗 Booking Complete!\n\nIn a real application, you would receive a confirmation email and the booking would be added to your account.'
  );
  window.location.href = '../';
}

// Start the app
init();
