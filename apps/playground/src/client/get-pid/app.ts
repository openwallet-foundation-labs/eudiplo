/**
 * Get PID Demo
 * Issues a demo PID credential to the user's EUDI Wallet
 * Supports multiple personas and custom data entry
 */

import {
  createIssuanceOffer,
  generateVerificationUI,
  waitForSession,
  getElement,
} from '../shared/utils';

const CREDENTIAL_ID = 'pid';

// Persona definitions
interface Persona {
  given_name: string;
  family_name: string;
  birthdate: string;
  birth_city: string;
  street_address: string;
  city: string;
  postal_code: string;
  nationality: string;
}

const PERSONAS: Record<string, Persona> = {
  max: {
    given_name: 'Max',
    family_name: 'Mustermann',
    birthdate: '1990-01-15',
    birth_city: 'Berlin',
    street_address: 'Musterstraße 123',
    city: 'Berlin',
    postal_code: '10115',
    nationality: 'DE',
  },
  erika: {
    given_name: 'Erika',
    family_name: 'Mustermann',
    birthdate: '1964-08-12',
    birth_city: 'Berlin',
    street_address: 'Heidestraße 17',
    city: 'Köln',
    postal_code: '51147',
    nationality: 'DE',
  },
  anna: {
    given_name: 'Anna',
    family_name: 'Schmidt',
    birthdate: '2008-06-20',
    birth_city: 'München',
    street_address: 'Leopoldstraße 42',
    city: 'München',
    postal_code: '80802',
    nationality: 'DE',
  },
  thomas: {
    given_name: 'Thomas',
    family_name: 'Weber',
    birthdate: '2005-03-10',
    birth_city: 'Hamburg',
    street_address: 'Reeperbahn 100',
    city: 'Hamburg',
    postal_code: '20359',
    nationality: 'DE',
  },
};

// DOM Elements
const startSection = getElement<HTMLElement>('startSection');
const issuanceSection = getElement<HTMLElement>('issuanceSection');
const successSection = getElement<HTMLElement>('successSection');
const qrCodeDiv = getElement<HTMLDivElement>('qrCode');
const sameDeviceLink = getElement<HTMLDivElement>('sameDeviceLink');
const statusText = getElement<HTMLParagraphElement>('statusText');
const getCredentialBtn = getElement<HTMLButtonElement>('getCredentialBtn');
const getAnotherBtn = document.getElementById('getAnotherBtn') as HTMLButtonElement | null;

// Form elements
const personaSelect = getElement<HTMLSelectElement>('personaSelect');
const givenNameInput = getElement<HTMLInputElement>('givenName');
const familyNameInput = getElement<HTMLInputElement>('familyName');
const birthdateInput = getElement<HTMLInputElement>('birthdate');
const birthCityInput = getElement<HTMLInputElement>('birthCity');
const streetAddressInput = getElement<HTMLInputElement>('streetAddress');
const cityInput = getElement<HTMLInputElement>('city');
const postalCodeInput = getElement<HTMLInputElement>('postalCode');
const nationalityInput = getElement<HTMLInputElement>('nationality');
const calculatedAgeSpan = getElement<HTMLSpanElement>('calculatedAge');
const ageFlagsSpan = getElement<HTMLSpanElement>('ageFlags');

// Calculate age from birthdate
function calculateAge(birthdate: string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Update age display
function updateAgeDisplay(): void {
  const birthdate = birthdateInput.value;
  if (!birthdate) return;

  const age = calculateAge(birthdate);
  calculatedAgeSpan.textContent = String(age);

  const flags: string[] = [];
  if (age >= 12) flags.push('✓ Over 12');
  if (age >= 14) flags.push('✓ Over 14');
  if (age >= 16) flags.push('✓ Over 16');
  if (age >= 18) flags.push('✓ Over 18');
  else flags.push('✗ Under 18');
  if (age >= 21) flags.push('✓ Over 21');
  else if (age >= 18) flags.push('✗ Under 21');
  if (age >= 65) flags.push('✓ Over 65');

  ageFlagsSpan.textContent = flags.join(', ');
}

// Set form values from persona
function setFormValues(persona: Persona): void {
  givenNameInput.value = persona.given_name;
  familyNameInput.value = persona.family_name;
  birthdateInput.value = persona.birthdate;
  birthCityInput.value = persona.birth_city;
  streetAddressInput.value = persona.street_address;
  cityInput.value = persona.city;
  postalCodeInput.value = persona.postal_code;
  nationalityInput.value = persona.nationality;
  updateAgeDisplay();
}

// Enable/disable form editing
function setFormEditable(editable: boolean): void {
  const inputs = [
    givenNameInput,
    familyNameInput,
    birthdateInput,
    birthCityInput,
    streetAddressInput,
    cityInput,
    postalCodeInput,
    nationalityInput,
  ];
  for (const input of inputs) {
    input.disabled = !editable;
  }
}

// Build claims from form values
function buildClaimsFromForm(): Record<string, unknown> {
  const birthdate = birthdateInput.value;
  const age = calculateAge(birthdate);
  const birthYear = new Date(birthdate).getFullYear();

  return {
    issuing_country: 'DE',
    issuing_authority: 'DE',
    source_document_type: 'id_card',
    given_name: givenNameInput.value.toUpperCase(),
    family_name: familyNameInput.value.toUpperCase(),
    birthdate: birthdate,
    age_birth_year: birthYear,
    age_in_years: age,
    age_equal_or_over: {
      '12': age >= 12,
      '14': age >= 14,
      '16': age >= 16,
      '18': age >= 18,
      '21': age >= 21,
      '65': age >= 65,
    },
    place_of_birth: {
      locality: birthCityInput.value.toUpperCase(),
    },
    address: {
      street_address: streetAddressInput.value.toUpperCase(),
      locality: cityInput.value.toUpperCase(),
      country: nationalityInput.value.toUpperCase(),
      postal_code: postalCodeInput.value,
    },
    nationalities: [nationalityInput.value.toUpperCase()],
  };
}

// Show one section, hide others
function showSection(section: HTMLElement): void {
  [startSection, issuanceSection, successSection].forEach((s) => {
    if (s === section) {
      s.classList.remove('hidden');
    } else {
      s.classList.add('hidden');
    }
  });
}

// Handle persona selection
function handlePersonaChange(): void {
  const selected = personaSelect.value;

  if (selected === 'custom') {
    setFormEditable(true);
  } else {
    setFormEditable(false);
    const persona = PERSONAS[selected];
    if (persona) {
      setFormValues(persona);
    }
  }
}

// Initialize
function init(): void {
  getCredentialBtn.addEventListener('click', handleGetCredential);
  getAnotherBtn?.addEventListener('click', handleGetAnother);
  personaSelect.addEventListener('change', handlePersonaChange);
  birthdateInput.addEventListener('change', updateAgeDisplay);

  // Initialize with default persona
  setFormValues(PERSONAS.max);
  updateAgeDisplay();
}

// Handle get credential button click
async function handleGetCredential(): Promise<void> {
  getCredentialBtn.disabled = true;
  getCredentialBtn.textContent = 'Creating offer...';

  try {
    // Build claims from form
    const claims = buildClaimsFromForm();

    // Create issuance offer
    const result = await createIssuanceOffer(CREDENTIAL_ID, claims);

    // Show issuance section with QR code
    showSection(issuanceSection);
    await generateVerificationUI(qrCodeDiv, sameDeviceLink, result.uri);
    statusText.textContent = 'Scan the QR code with your EUDI Wallet';

    // Wait for issuance to complete
    await waitForSession(result.sessionId, {
      onUpdate: (s) => {
        if (s.status === 'pending') {
          statusText.textContent = 'Waiting for wallet to accept...';
        } else if (s.status === 'processing') {
          statusText.textContent = 'Issuing credential...';
        }
      },
    });

    showSuccess();
  } catch (error) {
    handleError(error);
  }
}

// Handle get another button
function handleGetAnother(): void {
  // Reset state
  getCredentialBtn.disabled = false;
  getCredentialBtn.textContent = '🪪 Get Demo PID';
  qrCodeDiv.innerHTML = '';
  qrCodeDiv.classList.remove('has-qr');
  sameDeviceLink.classList.add('hidden');
  statusText.textContent = 'Waiting for wallet to accept...';

  // Show start section
  showSection(startSection);
}

// Show success section
function showSuccess(): void {
  showSection(successSection);
}

// Handle errors
function handleError(error: unknown): void {
  console.error('Error:', error);
  const message = error instanceof Error ? error.message : 'An error occurred';

  statusText.textContent = `Error: ${message}`;
  statusText.style.color = '#dc2626';

  // Reset button
  getCredentialBtn.disabled = false;
  getCredentialBtn.textContent = '🪪 Get Demo PID';
}

// Start the app
init();
