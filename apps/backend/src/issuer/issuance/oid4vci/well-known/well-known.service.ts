import { Inject, Injectable } from "@nestjs/common";
import { CertService } from "../../../../crypto/key/cert/cert.service";
import { CryptoImplementationService } from "../../../../crypto/key/crypto-implementation/crypto-implementation.service";
import { KeyService } from "../../../../crypto/key/key.service";
import { MediaType } from "../../../../shared/utils/mediaType/media-type.enum";
import { AuthorizeService } from "../authorize/authorize.service";
import { Oid4vciService } from "../oid4vci.service";
import { CredentialIssuerMetadataDto } from "./dto/credential-issuer-metadata.dto";
import { EC_Public, JwksResponseDto } from "./dto/jwks-response.dto";

/**
 * Service to handle well-known endpoints and metadata retrieval.
 */
@Injectable()
export class WellKnownService {
    /**
     * Constructor for WellKnownService.
     * @param oid4vciService
     * @param certService
     * @param authorizeService
     */
    constructor(
        private readonly oid4vciService: Oid4vciService,
        private readonly certService: CertService,
        @Inject("KeyService") public readonly keyService: KeyService,
        private readonly authorizeService: AuthorizeService,
        private readonly cryptoImplementationService: CryptoImplementationService,
    ) {}

    /**
     * Retrieves the issuer metadata for a given tenant for the specified content type.
     * The metadata can be returned in two formats:
     * - an unsigned JSON document using the media type application/json, or
     * - a signed JSON Web Token (JWT) containing the Credential Issuer Metadata in its payload using the media type application/jwt.
     * @param tenantId
     * @param contentType
     * @returns
     */
    async getIssuerMetadata(tenantId: string, contentType: MediaType) {
        const metadata = (await this.oid4vciService.issuerMetadata(tenantId))
            .credentialIssuer as unknown as CredentialIssuerMetadataDto;

        if (contentType === MediaType.APPLICATION_JWT) {
            const cert = await this.certService.find({
                tenantId,
                type: "access",
            });
            return this.keyService.signJWT(
                {
                    ...metadata,
                    iss: metadata.credential_issuer,
                    sub: metadata.credential_issuer,
                    iat: Math.floor(new Date().getTime() / 1000),
                    // [Review]: should we add `exp` value here?
                    //MM: the value makes sense when we cache the issuer metadata so it must not be signed on every request. Like when it is issued every hour, its lifetime is 1 hour and the jwt is in the cache.
                },
                {
                    typ: "openidvci-issuer-metadata+jwt",
                    alg: this.cryptoImplementationService.getAlg(),
                    x5c: await this.certService.getCertChain(cert),
                },
                tenantId,
                cert.keyId,
            );
        }

        return metadata;
    }

    /**
     * Returns the OAuth 2.0 Authorization Server metadata for a given tenant.
     * @returns
     */
    getAuthzMetadata(tenantId: string) {
        return this.authorizeService.authzMetadata(tenantId);
    }

    /**
     * Returns the JSON Web Key Set (JWKS) for a given tenant.
     * @returns
     */
    getJwks(tenantId: string): Promise<JwksResponseDto> {
        return this.keyService.getPublicKey("jwk", tenantId).then((key) => ({
            keys: [key as EC_Public],
        }));
    }
}
