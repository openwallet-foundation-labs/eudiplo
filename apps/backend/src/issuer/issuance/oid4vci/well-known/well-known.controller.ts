import { Controller, Get, Header, Param } from "@nestjs/common";
import {
    ApiExcludeController,
    ApiOperation,
    ApiProduces,
    ApiTags,
} from "@nestjs/swagger";
import { ContentType } from "../../../../shared/utils/mediaType/media-type.decorator";
import { MediaType } from "../../../../shared/utils/mediaType/media-type.enum";
import { JwksResponseDto } from "./dto/jwks-response.dto";
import { WellKnownService } from "./well-known.service";

/**
 * Controller for the OpenID4VCI well-known endpoints.
 */
@ApiTags("OID4VCI")
@ApiExcludeController(process.env.SWAGGER_ALL !== "true")
@Controller()
export class WellKnownController {
    /**
     * Constructor for WellKnownController.
     * @param wellKnownService
     */
    constructor(private readonly wellKnownService: WellKnownService) {}

    /**
     * Retrieves the OpenID4VCI issuer metadata for a given tenant.
     * @param tenantId
     * @param contentType
     * @returns
     */
    @ApiOperation({
        summary: "Get OpenID4VCI issuer metadata",
        description: "Returns the OpenID4VCI issuer metadata.",
    })
    //we can not set the accept in the apiheader via swagger.
    @ApiProduces(MediaType.APPLICATION_JSON, MediaType.APPLICATION_JWT)
    @Get([
        ".well-known/openid-credential-issuer/:tenantId",
        ":tenantId/.well-known/openid-credential-issuer",
    ])
    issuerMetadata(
        @ContentType() contentType: MediaType,
        @Param("tenantId") tenantId: string,
    ) {
        return this.wellKnownService
            .getIssuerMetadata(tenantId, contentType)
            .catch((err) => {
                console.error("Error in issuerMetadata:", err);
                throw err;
            });
    }

    /**
     * Authorization Server Metadata
     * @returns
     */
    @Get([
        ".well-known/oauth-authorization-server/:tenantId",
        ":tenantId/.well-known/oauth-authorization-server",
    ])
    authzMetadata(@Param("tenantId") tenantId: string) {
        return this.wellKnownService.getAuthzMetadata(tenantId);
    }

    /**
     * Chained Authorization Server Metadata (RFC 8414 alternative path format).
     * Supports discovery via `/.well-known/oauth-authorization-server/:tenantId/chained-as`
     * for wallets that construct the discovery URL per RFC 8414.
     * @returns
     */
    @Get(".well-known/oauth-authorization-server/:tenantId/chained-as")
    chainedAsMetadata(@Param("tenantId") tenantId: string) {
        return this.wellKnownService.getChainedAsMetadata(tenantId);
    }

    /**
     * Returns the JSON Web Key Set (JWKS) for the authorization server.
     * @returns
     */
    @Header("Content-Type", "application/jwk-set+json")
    @Get([".well-known/jwks.json/:tenantId", ":tenantId/.well-known/jwks.json"])
    getJwks(@Param("tenantId") tenantId: string): Promise<JwksResponseDto> {
        return this.wellKnownService.getJwks(tenantId);
    }
}
