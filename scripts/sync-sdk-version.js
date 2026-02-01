#!/usr/bin/env node
/**
 * Syncs the SDK version with the main EUDIPLO release version.
 * Called by semantic-release during the prepare phase.
 *
 * Usage: node scripts/sync-sdk-version.js <version>
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const version = process.argv[2];

if (!version) {
  console.error('Usage: node sync-sdk-version.js <version>');
  process.exit(1);
}

const sdkPackagePath = join(__dirname, '../packages/eudiplo-sdk-core/package.json');

try {
  const pkg = JSON.parse(readFileSync(sdkPackagePath, 'utf-8'));
  pkg.version = version;
  writeFileSync(sdkPackagePath, JSON.stringify(pkg, null, 4) + '\n');
  console.log(`✅ Updated @eudiplo/sdk-core version to ${version}`);
} catch (error) {
  console.error(`❌ Failed to update SDK version: ${error.message}`);
  process.exit(1);
}
