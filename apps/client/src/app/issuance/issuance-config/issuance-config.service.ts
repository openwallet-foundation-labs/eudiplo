import { Injectable } from '@angular/core';
import {
  type IssuanceConfig,
  type IssuanceDto,
  issuanceControllerDeleteIssuanceConfiguration,
  issuanceControllerGetIssuanceConfigurations,
  issuanceControllerStoreIssuanceConfiguration,
  issuerManagementControllerGetOffer,
  type OfferRequestDto,
} from '../../generated';
import { client } from '../../generated/client.gen';

@Injectable({
  providedIn: 'root',
})
export class IssuanceConfigService {
  getConfig(configId: string) {
    return this.loadConfigurations().then((configs) =>
      configs.find((config) => config.id === configId)
    );
  }

  /**
   * Load all existing issuance configurations
   */
  async loadConfigurations(): Promise<IssuanceConfig[]> {
    const response = await issuanceControllerGetIssuanceConfigurations({ client });
    return response.data || [];
  }

  /**
   * Save or update an issuance configuration
   */
  async saveConfiguration(config: IssuanceDto): Promise<void> {
    try {
      // Assuming there's a method to save the configuration
      // This is a placeholder as the actual implementation may vary
      await issuanceControllerStoreIssuanceConfiguration({ body: config, client });
    } catch (error) {
      console.error('Failed to save issuance configuration:', error);
      throw new Error('Failed to save configuration');
    }
  }

  /**
   * Delete an issuance configuration
   */
  async deleteConfiguration(configId: string): Promise<void> {
    try {
      // Assuming there's a method to delete the configuration
      // This is a placeholder as the actual implementation may vary
      await issuanceControllerDeleteIssuanceConfiguration({ path: { id: configId } });
    } catch (error) {
      console.error('Failed to delete issuance configuration:', error);
      throw new Error('Failed to delete configuration');
    }
  }

  getOffer(values: OfferRequestDto) {
    return issuerManagementControllerGetOffer({ client, body: values }).then((response) => {
      return response.data;
    });
  }
}
