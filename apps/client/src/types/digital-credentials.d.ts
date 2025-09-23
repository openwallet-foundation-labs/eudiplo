// This file extends the existing DOM types with Digital Credentials API types

interface DigitalCredentialRequest {
  protocol: string;
  data: {
    request?: string;
    [key: string]: any;
  };
}

interface DigitalCredentialOptions {
  requests: DigitalCredentialRequest[];
}

// Extend the existing CredentialRequestOptions interface
declare global {
  interface CredentialRequestOptions {
    digital?: DigitalCredentialOptions;
  }

  interface Credential {
    data?: any;
  }

  interface Window {
    DigitalCredential: any;
  }
}

export {};
