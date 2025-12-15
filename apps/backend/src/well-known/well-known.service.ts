import { Injectable } from "@nestjs/common";
import { CryptoService } from "../crypto/crypto.service";
import { CryptoImplementationService } from "../crypto/key/crypto-implementation/crypto-implementation.service";
import { AuthorizeService } from "../issuer/authorize/authorize.service";
import { Oid4vciService } from "../issuer/oid4vci/oid4vci.service";
import { MediaType } from "../utils/mediaType/media-type.enum";
import { CredentialIssuerMetadataDto } from "./dto/credential-issuer-metadata.dto";
import { JwksResponseDto } from "./dto/jwks-response.dto";

/**
 * Service to handle well-known endpoints and metadata retrieval.
 */
@Injectable()
export class WellKnownService {
    /**
     * Constructor for WellKnownService.
     * @param oid4vciService
     * @param cryptoService
     * @param authorizeService
     */
    constructor(
        private readonly oid4vciService: Oid4vciService,
        private readonly cryptoService: CryptoService,
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
            const cert = await this.cryptoService.find({
                tenantId,
                type: "access",
            });
            return this.cryptoService.signJwt(
                {
                    typ: "openidvci-issuer-metadata+jwt",
                    alg: this.cryptoImplementationService.getAlg(),
                    x5c: await this.cryptoService.getCertChain(cert),
                },
                {
                    ...metadata,
                    iss: metadata.credential_issuer,
                    sub: metadata.credential_issuer,
                    iat: Math.floor(new Date().getTime() / 1000),
                    // [Review]: should we add `exp` value here?
                    //MM: the value makes sense when we cache the issuer metadata so it must not be signed on every request. Like when it is issued every hour, its lifetime is 1 hour and the jwt is in the cache.
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
        return this.cryptoService.getJwks(tenantId).then((key) => ({
            keys: [key],
        }));
    }
}
