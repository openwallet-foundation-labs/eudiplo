import { Injectable } from '@angular/core';
import {
  sessionConfigControllerGetConfig,
  sessionConfigControllerUpdateConfig,
  sessionConfigControllerResetConfig,
  SessionStorageConfig,
  UpdateSessionConfigDto,
} from '@eudiplo/sdk-core';

export type SessionCleanupMode = NonNullable<SessionStorageConfig['cleanupMode']>;

export const cleanupModes: { value: SessionCleanupMode; label: string; description: string }[] = [
  { value: 'full', label: 'Full Delete', description: 'Delete entire session record' },
  {
    value: 'anonymize',
    label: 'Anonymize',
    description: 'Keep metadata but remove personal data (credentials, etc.)',
  },
];

@Injectable({
  providedIn: 'root',
})
export class SessionConfigService {
  /**
   * Get the current session storage configuration.
   */
  async getConfig(): Promise<SessionStorageConfig | null> {
    const response = await sessionConfigControllerGetConfig<true>({});
    return response.data;
  }

  /**
   * Update the session storage configuration. Omitted fields keep their stored
   * value; `ttlSeconds: null` removes the TTL override.
   */
  async updateConfig(config: UpdateSessionConfigDto): Promise<SessionStorageConfig> {
    const response = await sessionConfigControllerUpdateConfig<true>({
      body: config,
    });
    return response.data;
  }

  /**
   * Reset the session storage configuration to defaults.
   */
  async resetConfig(): Promise<void> {
    await sessionConfigControllerResetConfig<true>({});
  }
}
