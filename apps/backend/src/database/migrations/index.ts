/**
 * Migration index - exports all migration classes for TypeORM.
 * Import migrations directly to avoid ESM/CJS compatibility issues
 * with dynamic file loading during tests.
 */
export { BaselineMigration1740000000000 } from "./1740000000000-BaselineMigration";
export { AddKmsProvider1740500000000 } from "./1740500000000-AddKmsProvider";
export { AddSigningKeyIdToIssuanceConfig1741000000000 } from "./1741000000000-AddSigningKeyIdToIssuanceConfig";
