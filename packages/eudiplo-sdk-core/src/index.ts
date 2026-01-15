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

// Re-export API types for advanced usage
export * from './api';
