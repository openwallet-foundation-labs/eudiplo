export interface LocaleOption {
  value: string;
  label: string;
}

// BCP 47 locale options shared across locale-related selectors.
export const LOCALE_OPTIONS: LocaleOption[] = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'de-DE', label: 'German' },
  { value: 'fr-FR', label: 'French' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'nl-NL', label: 'Dutch' },
  { value: 'pt-PT', label: 'Portuguese' },
  { value: 'pl-PL', label: 'Polish' },
  { value: 'cs-CZ', label: 'Czech' },
  { value: 'sk-SK', label: 'Slovak' },
  { value: 'sl-SI', label: 'Slovenian' },
  { value: 'hr-HR', label: 'Croatian' },
  { value: 'hu-HU', label: 'Hungarian' },
  { value: 'ro-RO', label: 'Romanian' },
  { value: 'bg-BG', label: 'Bulgarian' },
  { value: 'el-GR', label: 'Greek' },
  { value: 'fi-FI', label: 'Finnish' },
  { value: 'sv-SE', label: 'Swedish' },
  { value: 'da-DK', label: 'Danish' },
  { value: 'no-NO', label: 'Norwegian' },
  { value: 'et-EE', label: 'Estonian' },
  { value: 'lv-LV', label: 'Latvian' },
  { value: 'lt-LT', label: 'Lithuanian' },
  { value: 'mt-MT', label: 'Maltese' },
  { value: 'ga-IE', label: 'Irish' },
];
