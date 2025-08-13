// Interfaces for credential configuration forms

export interface DisplayFormValue {
  name: string;
  description?: string;
  locale: string;
  background_color?: string;
  text_color?: string;
  logo?: {
    uri?: string;
    url?: string;
  };
  background_image?: {
    uri?: string;
    url?: string;
  };
}

export interface VctFormValue {
  vct?: string;
  name?: string;
  description?: string;
  extends?: string;
  schema_uri?: string;
}

export interface CredentialConfigFormValue {
  id: string;
  tenantId: string;
  config: {
    format: string;
    display: DisplayFormValue[];
  };
  keyBinding?: boolean;
  statusManagement?: boolean;
  lifeTime?: number;
  keyId?: string;
  claims?: string; // JSON string
  disclosureFrame?: string; // JSON string
  vct?: VctFormValue;
}

export type FieldDisplayNames = Record<string, string>;

export const FIELD_DISPLAY_NAMES: FieldDisplayNames = {
  id: 'Configuration ID',
  tenantId: 'Tenant ID',
  'config.format': 'Format',
  'config.display.0.name': 'Display Name',
  'config.display.0.locale': 'Locale',
  lifeTime: 'Lifetime',
  keyId: 'Key ID',
};

export const SUPPORTED_FORMATS = [
  'dc+sd-jwt',
  'vc+sd-jwt',
  'jwt_vc_json',
  'jwt_vc_json-ld',
  'ldp_vc',
] as const;

export const SUPPORTED_LOCALES = [
  'en-US',
  'en-GB',
  'de-DE',
  'fr-FR',
  'es-ES',
  'it-IT',
  'pt-PT',
  'nl-NL',
  'sv-SE',
  'da-DK',
  'no-NO',
  'fi-FI',
] as const;
