import { Controller, Get, Header, Param } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CredentialsService } from "../../../configuration/credentials/credentials.service";

@ApiTags("OID4VCI")
@Controller("issuers/:tenantId/credentials-metadata")
export class Oid4vciMetadataController {
    constructor(private readonly credentialsService: CredentialsService) {}

    /**
     * Retrieves the VCT (Verifiable Credential Type) from the credentials service.
     * @param id - The identifier of the credential configuration.
     */
    @Get("vct/:id")
    vct(@Param("id") id: string, @Param("tenantId") tenantId: string) {
        return this.credentialsService.getVCT(id, tenantId);
    }

    /**
     * Retrieves the inline JSON Schema for a credential configuration.
     * Used to reference the credential's schema by URL (e.g. from a TS11 SchemaMeta document).
     *
     * @param id - The identifier of the credential configuration.
     * @param tenantId - The tenant identifier.
     * @param format - The credential format. Must match the credential's configured format
     *                 (one of `dc+sd-jwt`, `mso_mdoc`).
     */
    @Get("schema/:id/:format")
    @Header("Content-Type", "application/schema+json")
    @ApiOperation({
        summary: "Get the inline JSON Schema of a credential configuration",
    })
    @ApiResponse({ status: 200, description: "JSON Schema document" })
    @ApiResponse({
        status: 409,
        description:
            "Credential not found, format mismatch, or no inline schema configured",
    })
    schema(
        @Param("id") id: string,
        @Param("tenantId") tenantId: string,
        @Param("format") format: string,
    ) {
        return this.credentialsService.getSchema(id, tenantId, format);
    }
}
