/** One claim of a presented credential, flattened to a path. */
interface PresentedClaim {
  /** Dotted claim path, e.g. `address.locality` or `nationalities.0`. */
  path: string;
  value: string;
}

/** One credential the wallet presented for a query of the request. */
export interface PresentedCredential {
  /** The query ID of the request (DCQL credential ID). */
  queryId: string;
  /** SD-JWT VC `vct` or mDOC docType, when known. */
  type: string | null;
  issuer: string | null;
  claims: PresentedClaim[];
}

/**
 * Credential metadata shown next to the claims instead of among them, and
 * key-binding and digest fields nobody needs to read.
 */
const METADATA_CLAIMS = new Set(['iss', 'vct', 'iat', 'nbf', 'exp', 'cnf', 'status', 'sub']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Binary data, such as an mDL portrait, reaches the JSON column as an array or
 * an index-keyed object of bytes; one row per byte would bury the claims.
 */
function byteLength(value: Record<string, unknown> | unknown[]): number | null {
  const entries = Array.isArray(value) ? value : Object.values(value);
  if (entries.length < 16) return null;
  if (!Array.isArray(value) && !Object.keys(value).every((key, index) => key === String(index))) {
    return null;
  }
  const bytes = entries.every(
    (item) => Number.isInteger(item) && (item as number) >= 0 && (item as number) <= 255
  );
  return bytes ? entries.length : null;
}

function formatBytes(length: number): string {
  return length >= 1024
    ? `Binary data, ${Math.round(length / 1024)} kB`
    : `Binary data, ${length} bytes`;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return JSON.stringify(value) ?? '—';
}

function flattenContainer(
  value: Record<string, unknown> | unknown[],
  path: string,
  out: PresentedClaim[]
): void {
  const bytes = byteLength(value);
  if (bytes !== null) {
    out.push({ path, value: formatBytes(bytes) });
    return;
  }
  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value);
  if (entries.length === 0) {
    out.push({ path, value: Array.isArray(value) ? '[]' : '{}' });
  }
  for (const [key, item] of entries) {
    if (!key.startsWith('_sd')) flatten(item, path ? `${path}.${key}` : key, out);
  }
}

function flatten(value: unknown, path: string, out: PresentedClaim[]): void {
  if (isRecord(value) || Array.isArray(value)) {
    flattenContainer(value, path, out);
  } else {
    out.push({ path, value: formatValue(value) });
  }
}

function claimsOf(record: Record<string, unknown>): PresentedClaim[] {
  const out: PresentedClaim[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (METADATA_CLAIMS.has(key) || key.startsWith('_sd')) continue;
    flatten(value, key, out);
  }
  return out;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

/**
 * The credentials of a completed presentation as claim rows. Reads both
 * shapes the backend stores: OpenID4VP `{ id, values: [claims] }` and
 * ISO 18013-7 `{ id, docType, claims }`.
 */
export function presentedCredentials(credentials: unknown): PresentedCredential[] {
  if (!Array.isArray(credentials)) return [];
  const result: PresentedCredential[] = [];
  for (const entry of credentials) {
    if (!isRecord(entry)) continue;
    const queryId = str(entry['id']) ?? 'credential';
    if (Array.isArray(entry['values'])) {
      for (const value of entry['values']) {
        if (!isRecord(value)) continue;
        result.push({
          queryId,
          type: str(value['vct']),
          issuer: str(value['iss']),
          claims: claimsOf(value),
        });
      }
    } else if (isRecord(entry['claims'])) {
      result.push({
        queryId,
        type: str(entry['docType']),
        issuer: null,
        claims: claimsOf(entry['claims']),
      });
    }
  }
  return result;
}
