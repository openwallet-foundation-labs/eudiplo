import { Injectable } from '@angular/core';
import { client } from '../../generated/client.gen';
import {
  credentialsControllerDeleteIssuanceConfiguration,
  credentialsControllerGetConfigs,
  credentialsControllerStoreCredentialConfiguration,
} from '../../generated/sdk.gen';
import { CredentialConfig, CredentialConfigCreate } from '../../generated/types.gen';

@Injectable({
  providedIn: 'root',
})
export class CredentialConfigService {
  getConfig(configId: string) {
    return this.loadConfigurations().then((configs) =>
      configs.find((config) => config.id === configId)
    );
  }

  /**
   * Load all existing credential configurations
   */
  async loadConfigurations(): Promise<CredentialConfig[]> {
    const response = await credentialsControllerGetConfigs({ client });
    return response.data || [];
  }

  /**
   * Save or update a credential configuration
   */
  async saveConfiguration(config: CredentialConfigCreate): Promise<void> {
    return credentialsControllerStoreCredentialConfiguration({
      body: config,
    }).then((response) => {
      if (response.error) {
        throw new Error((response.error as any).message);
      }
      //return response.data;
    });
  }

  /**
   * Delete a credential configuration
   */
  async deleteConfiguration(configId: string): Promise<void> {
    try {
      await credentialsControllerDeleteIssuanceConfiguration({
        client,
        path: { id: configId },
      });
    } catch (error) {
      console.error('Failed to delete credential configuration:', error);
      throw new Error('Failed to delete configuration');
    }
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
