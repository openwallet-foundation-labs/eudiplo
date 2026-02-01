// Main client export
export { EudiploClient } from './client';
export type { EudiploClientConfig, SessionPollingOptions } from './client';

// Simple factory functions for easiest integration
export { verify, issue, verifyAndWait, issueAndWait } from './client';
export type {
  EudiploCredentials,
  VerifyOptions,
  IssueOptions,
  FlowResult,
  IssuanceOfferOptions,
  PresentationRequestOptions,
  OfferResult,
} from './client';

// Digital Credentials API exports
export {
  isDcApiAvailable,
  verifyWithDcApi,
  createDcApiRequest,
  // Server/Client split helpers
  createDcApiRequestForBrowser,
  callDcApi,
  submitDcApiWalletResponse,
} from './client';
export type {
  DcApiVerifyOptions,
  DcApiPresentationOptions,
  DcApiPresentationResult,
  DigitalCredentialResponse,
  // Server/Client split types
  DcApiRequestData,
  DcApiWalletResponse,
} from './client';

// Re-export the HTTP client instance for direct API usage
export { client } from './api/client.gen';

// Re-export API types for advanced usage
export * from './api';
