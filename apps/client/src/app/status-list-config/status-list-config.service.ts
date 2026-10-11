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
   * Get the settings the tenant stores; `{}` when it stores none.
   */
  async getConfig(): Promise<StatusListConfig | null> {
    // Without settings the backend answers an empty body without a
    // Content-Type, which the SDK would otherwise return as a raw stream.
    const response = await statusListConfigControllerGetConfig<true>({ parseAs: 'json' });
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
