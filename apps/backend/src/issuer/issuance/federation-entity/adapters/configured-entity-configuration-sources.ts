import { createHash } from "node:crypto";
import type { KeyChainService } from "../../../../crypto/key/key-chain.service.js";
import { KeyUsageType } from "../../../../crypto/key/types/key-usage-type.js";
import type { VerifierMetadataService } from "../../../../verifier/oid4vp/verifier-metadata.service.js";
import { IssuanceConfigurationNotFound } from "../../../configuration/issuance/domain/issuance-configuration.js";
import {
    federationEntityIdProblem,
    ownFederationEntity,
} from "../../../configuration/issuance/domain/own-federation-entity.js";
import type { IssuanceService } from "../../../configuration/issuance/issuance.service.js";
import type { BuildIssuerMetadata } from "../../oid4vci/application/build-issuer-metadata.js";
import type { Oid4vciSdkFactory } from "../../oid4vci/oid4vci-sdk.factory.js";
import type { CredentialIssuerEntityParts } from "../domain/entity-metadata.js";
import type { EntityConfigurationSources } from "../ports/entity-configuration-sources.js";

/**
 * Builds the entity configuration from the metadata EUDIPLO serves anyway:
 * the OID4VCI issuer metadata with its authorization servers, and the OID4VP
 * verifier metadata.
 */
export class ConfiguredEntityConfigurationSources
    implements EntityConfigurationSources
{
    constructor(
        private readonly issuance: Pick<
            IssuanceService,
            "getIssuanceConfiguration"
        >,
        private readonly issuerMetadata: Pick<BuildIssuerMetadata, "execute">,
        private readonly sdk: Pick<Oid4vciSdkFactory, "issuer">,
        private readonly keyChains: Pick<
            KeyChainService,
            "getPublicKeysByUsageTypes"
        >,
        private readonly verifierMetadata: Pick<
            VerifierMetadataService,
            "credentialVerifierMetadata"
        >,
        /** Whether OUTBOUND_URL_ALLOW_HTTP allows an http entity ID. */
        private readonly allowHttp: () => boolean,
    ) {}

    async ownEntity(tenantId: string) {
        const config = await this.issuance
            .getIssuanceConfiguration(tenantId)
            .catch((error: unknown) => {
                // Only a missing configuration means "no federation entity".
                if (error instanceof IssuanceConfigurationNotFound) {
                    return undefined;
                }
                throw error;
            });
        const entity = ownFederationEntity(config?.federation);
        if (!config || !entity) return undefined;
        return {
            entity,
            entityIdProblem: federationEntityIdProblem(entity.entityId, {
                allowHttp: this.allowHttp(),
            }),
            // updatedAt has second precision on SQLite, so the federation
            // block itself is part of the version.
            version: createHash("sha256")
                .update(
                    `${new Date(config.updatedAt).getTime()}\u0000${JSON.stringify(config.federation)}`,
                )
                .digest("base64url"),
        };
    }

    async credentialIssuer(
        tenantId: string,
    ): Promise<CredentialIssuerEntityParts> {
        const result = await this.issuerMetadata.execute(
            tenantId,
            this.sdk.issuer(tenantId),
        );
        return {
            metadata: result.credentialIssuer as Record<string, unknown>,
            authorizationServers: result.authorizationServers as Record<
                string,
                unknown
            >[],
            // Status lists fall back to an attestation key chain, so both
            // usage types sign artifacts of this issuer.
            signingKeys: await this.keyChains.getPublicKeysByUsageTypes(
                tenantId,
                [KeyUsageType.Attestation, KeyUsageType.StatusList],
            ),
        };
    }

    credentialVerifier(tenantId: string) {
        return this.verifierMetadata.credentialVerifierMetadata(tenantId);
    }
}
