import { Injectable } from '@angular/core';
import {
  CredentialConfig,
  CredentialConfigCreate,
  CredentialConfigUpdate,
  credentialConfigControllerDeleteIssuanceConfiguration,
  credentialConfigControllerGetConfigById,
  credentialConfigControllerGetConfigs,
  credentialConfigControllerStoreCredentialConfiguration,
  credentialConfigControllerUpdateCredentialConfiguration,
} from '@eudiplo/sdk';

@Injectable({
  providedIn: 'root',
})
export class CredentialConfigService {
  getConfig(configId: string) {
    return credentialConfigControllerGetConfigById({ path: { id: configId } }).then(
      (response) => response.data
    );
  }

  /**
   * Load all existing credential configurations
   */
  async loadConfigurations(): Promise<CredentialConfig[]> {
    const response = await credentialConfigControllerGetConfigs();
    return response.data || [];
  }

  /**
   * Save a new credential configuration (POST)
   */
  async saveConfiguration(config: CredentialConfigCreate): Promise<any> {
    return credentialConfigControllerStoreCredentialConfiguration({
      body: config,
    });
  }

  /**
   * Update an existing credential configuration (PATCH)
   * Set fields to null to clear them, omit fields to keep existing values
   */
  async updateConfiguration(id: string, config: CredentialConfigUpdate): Promise<any> {
    return credentialConfigControllerUpdateCredentialConfiguration({
      path: { id },
      body: config,
    });
  }

  /**
   * Delete a credential configuration
   */
  async deleteConfiguration(configId: string): Promise<any> {
    return credentialConfigControllerDeleteIssuanceConfiguration({
      path: { id: configId },
    });
  }

  /**
   * Validate JSON string
   */
  validateJson(jsonString: string): { isValid: boolean; parsed?: any; error?: string } {
    try {
      const parsed = JSON.parse(jsonString || '{}');
      return { isValid: true, parsed };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON',
      };
    }
  }

  /**
   * Format JSON string with proper indentation
   */
  formatJson(jsonString: string): string {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return jsonString;
    }
  }
}
