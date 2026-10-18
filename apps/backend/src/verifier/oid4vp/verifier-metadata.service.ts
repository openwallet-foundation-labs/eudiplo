import { Injectable } from "@nestjs/common";
import type { JWK } from "jose";
import { EncryptionService } from "../../crypto/encryption/encryption.service.js";
import { CryptoImplementationService } from "../../crypto/key/crypto-implementation/crypto-implementation.service.js";
import { toPublicJwk } from "../../crypto/key/domain/public-jwk.js";
import { KeyChainService } from "../../crypto/key/key-chain.service.js";
import { KeyUsageType } from "../../crypto/key/types/key-usage-type.js";
import { CredentialFormat } from "../../issuer/configuration/credentials/entities/credential.entity.js";

/** Content encryption algorithms EUDIPLO accepts for encrypted responses. */
export const ENCRYPTED_RESPONSE_ENC_VALUES_SUPPORTED = ["A128GCM", "A256GCM"];

/**
 * The verifier metadata of a tenant: in `client_metadata` of OID4VP
 * requests and, for an OpenID Federation entity, as
 * `openid_credential_verifier` metadata of its entity configuration.
 */
@Injectable()
export class VerifierMetadataService {
    constructor(
        private readonly cryptoImplementation: CryptoImplementationService,
        private readonly keyChains: KeyChainService,
        private readonly encryption: EncryptionService,
    ) {}

    /** OID4VP 1.0 Appendix B: algorithms per credential format. */
    vpFormatsSupported() {
        const sdJwtAlgs = this.cryptoImplementation.getAlgs(
            CredentialFormat.SD_JWT_VC,
        );
        return {
            mso_mdoc: {
                issuerauth_alg_values: this.cryptoImplementation.getAlgs(
                    CredentialFormat.MSO_MDOC,
                ),
                deviceauth_alg_values:
                    this.cryptoImplementation.getMdocDeviceAuthAlgs(),
            },
            "dc+sd-jwt": {
                "kb-jwt_alg_values": sdJwtAlgs,
                "sd-jwt_alg_values": sdJwtAlgs,
            },
        };
    }

    /**
     * `openid_credential_verifier` metadata. A wallet takes it from the trust
     * chain and ignores `client_metadata` (OID4VP 1.0 Section 5.9.3), so
     * `jwks` lists the request object signing keys (all access key chains)
     * and the tenant encryption key that responses are encrypted to.
     */
    async credentialVerifierMetadata(
        tenantId: string,
    ): Promise<Record<string, unknown>> {
        const signingKeys = await this.keyChains.getPublicKeysByUsageTypes(
            tenantId,
            [KeyUsageType.Access],
        );
        const encryptionKey =
            await this.encryption.getEncryptionPublicKey(tenantId);
        return {
            jwks: {
                keys: [
                    ...signingKeys.map(
                        (key): JWK => (key.use ? key : { ...key, use: "sig" }),
                    ),
                    toPublicJwk(encryptionKey),
                ],
            },
            vp_formats_supported: this.vpFormatsSupported(),
            encrypted_response_enc_values_supported:
                ENCRYPTED_RESPONSE_ENC_VALUES_SUPPORTED,
        };
    }
}
