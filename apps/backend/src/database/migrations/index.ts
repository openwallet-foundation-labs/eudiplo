/**
 * Migration index - exports all migration classes for TypeORM.
 * Import migrations directly to avoid ESM/CJS compatibility issues
 * with dynamic file loading during tests.
 */
export { BaselineMigration1740000000000 } from "./1740000000000-BaselineMigration";
export { AddKmsProvider1740500000000 } from "./1740500000000-AddKmsProvider";
export { AddSigningKeyIdToIssuanceConfig1741000000000 } from "./1741000000000-AddSigningKeyIdToIssuanceConfig";
export { AddPreferredAuthServerToIssuanceConfig1741500000000 } from "./1741500000000-AddPreferredAuthServerToIssuanceConfig";
export { AddExternalKeyId1742000000000 } from "./1742000000000-AddExternalKeyId";
export { AddKeyUsageEntity1743000000000 } from "./1743000000000-AddKeyUsageEntity";
export { AddKeyRotation1744000000000 } from "./1744000000000-AddKeyRotation";
export { RenameSigningToAttestation1745000000000 } from "./1745000000000-RenameSigningToAttestation";
export { FlattenKeyUsageType1746000000000 } from "./1746000000000-FlattenKeyUsageType";
export { MigrateKeysToKeyChain1747000000000 } from "./1747000000000-MigrateKeysToKeyChain";
export { ExtractAttributeProviderAndWebhookEndpoint1748000000000 } from "./1748000000000-ExtractAttributeProviderAndWebhookEndpoint";
export { AddSessionLogEntry1749000000000 } from "./1749000000000-AddSessionLogEntry";
