import { Injectable } from '@angular/core';
import {
  statusListConfigControllerGetConfig,
  statusListConfigControllerUpdateConfig,
  statusListConfigControllerResetConfig,
  StatusListConfig,
} from '@eudiplo/sdk-core';

export const bitsOptions = [
  { value: 1, label: '1 bit', description: 'Valid/Revoked only (2 states)' },
  { value: 2, label: '2 bits', description: 'Valid/Revoked/Suspended (4 states)' },
  { value: 4, label: '4 bits', description: 'Extended status values (16 states)' },
  { value: 8, label: '8 bits', description: 'Full byte (256 states)' },
];

@Injectable({
  providedIn: 'root',
})
export class StatusListConfigService {
  /**
   * Get the current status list configuration.
   */
  async getConfig(): Promise<StatusListConfig | null> {
    const response = await statusListConfigControllerGetConfig<true>({});
    return response.data ?? null;
  }

  /**
   * Update the status list configuration.
   */
  async updateConfig(config: Partial<StatusListConfig>): Promise<StatusListConfig> {
    const response = await statusListConfigControllerUpdateConfig<true>({
      body: config,
    });
    return response.data;
  }

  /**
   * Reset the status list configuration to defaults.
   */
  async resetConfig(): Promise<void> {
    await statusListConfigControllerResetConfig<true>({});
  }
}
