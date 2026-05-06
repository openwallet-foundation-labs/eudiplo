import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    ApiBody,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { Role } from "../../../auth/roles/role.enum";
import { Secured } from "../../../auth/secure.decorator";
import { Token, TokenPayload } from "../../../auth/token.decorator";
import { RegistrarService } from "../../../registrar/registrar.service";
import { CredentialConfigService } from "./credential-config/credential-config.service";
import { CredentialConfigCreate } from "./dto/credential-config-create.dto";
import { CredentialConfigUpdate } from "./dto/credential-config-update.dto";
import {
    SignSchemaMetaConfigDto,
    SignVersionSchemaMetaConfigDto,
} from "./dto/schema-meta-config.dto";
import { SchemaMetaAdapterService } from "./schema-meta/schema-meta-adapter.service";

/**
 * Controller for managing credential configurations.
 */
@ApiTags("Issuer")
@Secured([Role.Issuances])
@Controller("issuer/credentials")
export class CredentialConfigController {
    constructor(
        private readonly credentialsService: CredentialConfigService,
        private readonly schemaMetaAdapterService: SchemaMetaAdapterService,
        private readonly registrarService: RegistrarService,
        private readonly configService: ConfigService,
    ) {}

    @Get()
    getConfigs(@Token() user: TokenPayload) {
        return this.credentialsService.get(user.entity!.id);
    }

    @Get(":id")
    getConfigById(@Param("id") id: string, @Token() user: TokenPayload) {
        return this.credentialsService.getById(user.entity!.id, id);
    }

    @Post()
    storeCredentialConfiguration(
        @Body() config: CredentialConfigCreate,
        @Token() user: TokenPayload,
    ) {
        return this.credentialsService.store(user.entity!.id, config);
    }

    @Patch(":id")
    updateCredentialConfiguration(
        @Param("id") id: string,
        @Body() config: CredentialConfigUpdate,
        @Token() user: TokenPayload,
    ) {
        return this.credentialsService.update(user.entity!.id, id, config);
    }

    @Get(":id/schema-metadata")
    @ApiOperation({
        summary: "Get TS11 schema metadata for a credential configuration",
        description:
            "Generates a SchemaMeta document per the EUDI Catalogue of Attestations (TS11) specification. " +
            "The credential configuration must have a schemaMeta field set. " +
            "Pass ?signed=true to receive a signed JWS; requires a certificate chain on the key chain.",
    })
    @ApiQuery({
        name: "signed",
        required: false,
        type: Boolean,
        description: "Return a signed JWS instead of a plain JSON object",
    })
    @ApiResponse({ status: 200, description: "SchemaMeta document" })
    @ApiResponse({
        status: 404,
        description: "Credential config not found or no schemaMeta configured",
    })
    @ApiResponse({
        status: 400,
        description:
            "Invalid schema metadata or missing certificate for signing",
    })
    async getSchemaMetadata(
        @Param("id") id: string,
        @Token() user: TokenPayload,
        @Query("signed") signed?: string,
    ) {
        const config = await this.credentialsService.getById(
            user.entity!.id,
            id,
        );
        if (signed === "true") {
            return this.schemaMetaAdapterService.generateSignedSchemaMeta(
                user.entity!.id,
                config,
            );
        }
        return this.schemaMetaAdapterService.generateSchemaMeta(config);
    }

    /**
     * Reserves an attestation ID at the registrar, signs the supplied
     * SchemaMetaConfig (with the reserved ID baked in as id) and submits
     * the resulting JWS to the registrar in a single call. Returns the
     * registrar SchemaMetadataResponseDto for the freshly created entry.
     *
     * If an optional credentialConfigId is provided, the reservedId is
     * written back into that credential config schemaMeta.id field so the
     * link between the two entities is queryable.
     *
     * @experimental The TS11 specification is not yet finalized.
     */
    @Post("schema-metadata/sign")
    @ApiOperation({
        summary:
            "Reserve, sign and submit a TS11 SchemaMetaConfig to the registrar",
        description:
            "Reserves an attestation ID at the configured registrar, injects it as id, signs the SchemaMetaConfig with the tenant key chain and submits the JWS to the registrar. Optionally pass credentialConfigId to link the created entry back to a credential config.",
    })
    @ApiResponse({
        status: 201,
        description:
            "Registrar metadata entry for the freshly submitted schema metadata.",
    })
    @ApiResponse({
        status: 400,
        description:
            "Invalid schema metadata or missing certificate for signing",
    })
    @ApiBody({ type: SignSchemaMetaConfigDto })
    async signSchemaMetaConfig(
        @Token() user: TokenPayload,
        @Body() body: SignSchemaMetaConfigDto,
    ) {
        const tenantId = user.entity!.id;

        // Auto-derive schemaURIs from the credential config's UUID and format
        // when credentialConfigId is supplied but schemaURIs are absent.
        let configToSign = body.config;
        if (body.credentialConfigId && !body.config.schemaURIs?.length) {
            const existing = await this.credentialsService.getById(
                tenantId,
                body.credentialConfigId,
            );
            const format = existing.config?.format ?? "dc+sd-jwt";
            const publicUrl =
                this.configService.getOrThrow<string>("PUBLIC_URL");
            configToSign = {
                ...body.config,
                schemaURIs: [
                    {
                        format,
                        uri: `${publicUrl}/issuers/${tenantId}/credentials-metadata/schema/${body.credentialConfigId}/${format}`,
                    },
                ],
            };
        }

        const { reservedId } =
            await this.registrarService.reserveSchemaId(tenantId);

        const signed =
            await this.schemaMetaAdapterService.signRawSchemaMetaConfig(
                tenantId,
                { ...configToSign, id: reservedId },
                body.keyChainId,
            );

        const result = await this.registrarService.submitSchemaMetadata(
            tenantId,
            signed.jws,
        );

        // Write reservedId back into schemaMeta.id so the link is queryable
        // from the credential config side.
        if (body.credentialConfigId) {
            const existing = await this.credentialsService.getById(
                tenantId,
                body.credentialConfigId,
            );
            const schemaMetaForLink = {
                ...(existing.schemaMeta ?? configToSign),
                id: reservedId,
            };
            await this.credentialsService.update(
                tenantId,
                body.credentialConfigId,
                {
                    schemaMeta: schemaMetaForLink as any,
                },
            );
        }

        return result;
    }

    /**
     * Signs a new version of an existing SchemaMetaConfig and submits it to
     * the registrar. Unlike POST schema-metadata/sign, this endpoint does
     * NOT reserve a new attestation ID — the caller must supply the existing
     * id in the config so the registrar records the JWT as a new version
     * under the same schema.
     *
     * @experimental The TS11 specification is not yet finalized.
     */
    @Post("schema-metadata/sign-version")
    @ApiOperation({
        summary:
            "Sign and submit a new version of an existing schema metadata entry",
        description:
            "Signs the supplied SchemaMetaConfig (which must include the existing id) with the tenant key chain and submits the JWS to the registrar as a new version under the same schema ID.",
    })
    @ApiResponse({
        status: 201,
        description:
            "Registrar metadata entry for the newly submitted version.",
    })
    @ApiResponse({
        status: 400,
        description: "config.id is required; or invalid schema metadata",
    })
    @ApiBody({ type: SignVersionSchemaMetaConfigDto })
    async signVersionSchemaMetaConfig(
        @Token() user: TokenPayload,
        @Body() body: SignVersionSchemaMetaConfigDto,
    ) {
        const tenantId = user.entity!.id;

        if (!body.config.id) {
            throw new BadRequestException(
                "config.id is required when publishing a new version of an existing schema metadata entry",
            );
        }

        const signed =
            await this.schemaMetaAdapterService.signRawSchemaMetaConfig(
                tenantId,
                body.config,
                body.keyChainId,
            );

        return this.registrarService.submitSchemaMetadata(tenantId, signed.jws);
    }

    @Delete(":id")
    deleteIssuanceConfiguration(
        @Param("id") id: string,
        @Token() user: TokenPayload,
    ) {
        return this.credentialsService.delete(user.entity!.id, id);
    }
}
