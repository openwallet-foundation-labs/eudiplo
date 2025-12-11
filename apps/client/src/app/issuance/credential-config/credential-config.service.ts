import { Injectable } from '@angular/core';
import {
  CredentialConfig,
  CredentialConfigCreate,
  credentialsControllerDeleteIssuanceConfiguration,
  credentialsControllerGetConfigById,
  credentialsControllerGetConfigs,
  credentialsControllerStoreCredentialConfiguration,
} from '@eudiplo/sdk';

@Injectable({
  providedIn: 'root',
})
export class CredentialConfigService {
  getConfig(configId: string) {
    return credentialsControllerGetConfigById({ path: { id: configId } }).then(
      (response) => response.data
    );
  }

  /**
   * Load all existing credential configurations
   */
  async loadConfigurations(): Promise<CredentialConfig[]> {
    const response = await credentialsControllerGetConfigs();
    return response.data || [];
  }

  /**
   * Save or update a credential configuration
   */
  async saveConfiguration(config: CredentialConfigCreate): Promise<any> {
    return credentialsControllerStoreCredentialConfiguration({
      body: config,
    });
  }

  /**
   * Delete a credential configuration
   */
  async deleteConfiguration(configId: string): Promise<any> {
    return credentialsControllerDeleteIssuanceConfiguration({
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
