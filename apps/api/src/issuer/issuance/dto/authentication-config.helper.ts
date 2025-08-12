import {
  AuthenticationConfig,
  AuthenticationUrlConfig,
  PresentationDuringIssuanceConfig,
} from './authentication-config.dto';

/**
 * Utility functions for working with OpenID4VC authentication configurations
 */
export class AuthenticationConfigHelper {
  /**
   * Type guard to check if the config uses pre-authorized code flow
   */
  static isNoneAuth(
    config: AuthenticationConfig
  ): config is { method: 'none' } {
    return config.method === 'none';
  }

  /**
   * Type guard to check if the config uses OID4VCI authorized code flow
   */
  static isAuthUrlAuth(
    config: AuthenticationConfig
  ): config is { method: 'auth'; config: AuthenticationUrlConfig } {
    return config.method === 'auth';
  }

  /**
   * Type guard to check if the config uses OID4VP flow
   */
  static isPresentationDuringIssuanceAuth(
    config: AuthenticationConfig
  ): config is {
    method: 'presentationDuringIssuance';
    config: PresentationDuringIssuanceConfig;
  } {
    return config.method === 'presentationDuringIssuance';
  }

  /**
   * Get the presentation configuration if the method is 'presentationDuringIssuance'
   */
  static getPresentationConfig(
    config: AuthenticationConfig
  ): PresentationDuringIssuanceConfig | null {
    if (this.isPresentationDuringIssuanceAuth(config)) {
      return config.config;
    }
    return null;
  }
}
