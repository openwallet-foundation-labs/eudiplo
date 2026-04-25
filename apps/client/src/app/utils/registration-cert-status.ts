import type { PresentationConfig } from '@eudiplo/sdk-core';

export type RegistrationCertStatus = 'none' | 'active' | 'expiring' | 'expired' | 'pending';

interface RegistrationCertCacheLike {
  expiresAt?: number | null;
  source?: string | null;
}

const EXPIRING_WINDOW_SECONDS = 7 * 24 * 60 * 60;

/**
 * Derive the display status of a presentation config's registration
 * certificate cache. Mirrors the backend cache lifecycle: cache present
 * and not yet expiring → active; within 7 days → expiring; past
 * expiry → expired; spec configured but cache missing → pending; no
 * spec at all → none.
 */
export function getRegistrationCertStatus(
  config: Pick<PresentationConfig, 'registrationCert' | 'registrationCertCache'> | null | undefined
): RegistrationCertStatus {
  if (!config) return 'none';
  const cache = config.registrationCertCache as RegistrationCertCacheLike | null | undefined;
  const hasSpec = !!config.registrationCert;

  if (!cache) {
    return hasSpec ? 'pending' : 'none';
  }

  const exp = cache.expiresAt;
  if (typeof exp === 'number') {
    const now = Math.floor(Date.now() / 1000);
    if (exp < now) return 'expired';
    if (exp - now < EXPIRING_WINDOW_SECONDS) return 'expiring';
  }
  return 'active';
}

export function formatRegistrationCertExpiresIn(
  cache: RegistrationCertCacheLike | null | undefined
): string | null {
  const exp = cache?.expiresAt;
  if (typeof exp !== 'number') return null;
  const seconds = exp - Math.floor(Date.now() / 1000);
  if (seconds <= 0) return 'expired';
  const days = Math.floor(seconds / 86400);
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'}`;
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const mins = Math.floor(seconds / 60);
  return `${mins} minute${mins === 1 ? '' : 's'}`;
}
