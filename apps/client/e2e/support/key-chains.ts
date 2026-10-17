import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from './test';
import { resolvedE2EConfig } from './e2e-config';

const api = resolvedE2EConfig.apiBaseUrl;

/** A leaf certificate, for trust list entities and external trust list signers. */
export const certificatePem = readFileSync(
  join(__dirname, '..', 'fixtures', 'key-chain', 'leaf-cert.pem'),
  'utf8'
);

/** Creates a standalone key chain through the API and returns its ID. */
export async function createKeyChain(
  token: string,
  usageType: string,
  description: string
): Promise<string> {
  const response = await fetch(`${api}/api/key-chain`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ usageType, type: 'standalone', description }),
  });
  expect(response.status, await response.clone().text()).toBe(201);
  return ((await response.json()) as { id: string }).id;
}
