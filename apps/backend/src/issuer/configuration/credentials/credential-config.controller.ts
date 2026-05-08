import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SchemaURIMeta } from "@owf/eudi-attestation-schema";
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
    ) {}

    private deriveSchemaUriMetadata(
        credentialConfig: Awaited<
            ReturnType<CredentialConfigService["getById"]>
        >,
        format: string,
    ): SchemaURIMeta {
        if (format === "dc+sd-jwt") {
            const configuredVct =
                typeof credentialConfig.vct === "string"
                    ? credentialConfig.vct
                    : credentialConfig.vct &&
                        typeof credentialConfig.vct === "object" &&
                        "vct" in credentialConfig.vct &&
                        typeof (credentialConfig.vct as { vct?: unknown })
                            .vct === "string"
                      ? (credentialConfig.vct as { vct: string }).vct
                      : undefined;

            if (!configuredVct) {
                throw new BadRequestException(
                    "schemaURIs metadata is required: unable to derive vct for dc+sd-jwt from credential config.",
                );
            }

            return { vct: configuredVct };
        }

        if (format === "mso_mdoc") {
            const docType =
                credentialConfig.config?.docType ??
                (credentialConfig.config as { doctype?: string } | undefined)
                    ?.doctype;

            if (!docType) {
                throw new BadRequestException(
                    "schemaURIs metadata is required: unable to derive docType for mso_mdoc from credential config.",
                );
            }

            return { doctype_value: docType };
        }

        throw new BadRequestException(
            `schemaURIs metadata is required: unsupported format '${format}'. Provide schemaURIs[].metadata explicitly.`,
        );
    }

    private async uploadSchemaAssetFromCredentialConfig(
        tenantId: string,
        credentialConfigId: string,
        fallbackFormat?: string,
    ): Promise<{
        format: string;
        uri: string;
        metadata: SchemaURIMeta;
    }> {
        const existing = await this.credentialsService.getById(
            tenantId,
            credentialConfigId,
        );
        const format = existing.config?.format ?? fallbackFormat ?? "dc+sd-jwt";

        if (!existing.schema) {
            throw new BadRequestException(
                `Credential config ${credentialConfigId} has no inline schema to upload. Provide schemaURIs explicitly or set the credential schema first.`,
            );
        }

        const fileName = `schema-${credentialConfigId}-${format}.json`;
        const schemaContent = JSON.stringify(existing.schema, null, 2);
        const schemaAsset =
            typeof File === "function"
                ? new File([schemaContent], fileName, {
                      type: "application/schema+json",
                  })
                : new Blob([schemaContent], {
                      type: "application/schema+json",
                  });

        const uploadedSchema =
            await this.registrarService.uploadSchemaMetadataAsset(
                tenantId,
                "schemas",
                schemaAsset,
            );

        return {
            format,
            uri: uploadedSchema.url,
            metadata: this.deriveSchemaUriMetadata(existing, format),
        };
    }

    private async uploadSchemaMetaAssetsToRegistrar(
        tenantId: string,
        config: SignSchemaMetaConfigDto["config"],
        options?: { schemaUrisAlreadyHosted?: boolean },
    ): Promise<SignSchemaMetaConfigDto["config"]> {
        const uploadedRulebook =
            await this.registrarService.uploadSchemaMetadataAssetFromUrl(
                tenantId,
                "rulebooks",
                config.rulebookURI,
                `rulebook-${config.version}.md`,
            );

        const uploadedSchemaURIs = options?.schemaUrisAlreadyHosted
            ? (config.schemaURIs ?? [])
            : await Promise.all(
                  (config.schemaURIs ?? []).map(async (entry) => {
                      if (entry.credentialConfigId) {
                          return this.uploadSchemaAssetFromCredentialConfig(
                              tenantId,
                              entry.credentialConfigId,
                              entry.format,
                          );
                      }

                      if (!entry.uri) {
                          throw new BadRequestException(
                              "schemaURIs entry requires either credentialConfigId or uri",
                          );
                      }

                      const uploadedSchema =
                          await this.registrarService.uploadSchemaMetadataAssetFromUrl(
                              tenantId,
                              "schemas",
                              entry.uri,
                              `schema-${entry.format}.json`,
                          );
                      return {
                          ...entry,
                          uri: uploadedSchema.url,
                      };
                  }),
              );

        return {
            ...config,
            rulebookURI: uploadedRulebook.url,
            schemaURIs: uploadedSchemaURIs,
        };
    }

    private async ensureSchemaUrisFromCredentialConfig(
        tenantId: string,
        config: SignSchemaMetaConfigDto["config"],
        credentialConfigId?: string,
    ): Promise<{
        config: SignSchemaMetaConfigDto["config"];
        alreadyHosted: boolean;
    }> {
        if (config.schemaURIs?.length || !credentialConfigId) {
            return { config, alreadyHosted: false };
        }

        const existing = await this.credentialsService.getById(
            tenantId,
            credentialConfigId,
        );
        const format = existing.config?.format ?? "dc+sd-jwt";
        const uploadedSchema = await this.uploadSchemaAssetFromCredentialConfig(
            tenantId,
            credentialConfigId,
            format,
        );

        return {
            config: {
                ...config,
                schemaURIs: [
                    {
                        format: uploadedSchema.format,
                        uri: uploadedSchema.uri,
                        metadata: uploadedSchema.metadata,
                    },
                ],
            },
            alreadyHosted: true,
        };
    }

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

        const { config: derivedConfig, alreadyHosted } =
            await this.ensureSchemaUrisFromCredentialConfig(
                tenantId,
                body.config,
                body.credentialConfigId,
            );

        let configToSign = derivedConfig;

        configToSign = await this.uploadSchemaMetaAssetsToRegistrar(
            tenantId,
            configToSign,
            { schemaUrisAlreadyHosted: alreadyHosted },
        );

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
                ...(existing.schemaMeta ?? {}),
                ...configToSign,
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

        const configToSign = await this.uploadSchemaMetaAssetsToRegistrar(
            tenantId,
            body.config,
        );

        const signed =
            await this.schemaMetaAdapterService.signRawSchemaMetaConfig(
                tenantId,
                configToSign,
                body.keyChainId,
            );

        return this.registrarService.submitSchemaMetadata(tenantId, signed.jws);
    }

    @Delete(":id")
    deleteIssuanceConfiguration(
        @Param("id") id: string,
        @Token() user: TokenPayload,
    ): Promise<unknown> {
        return this.credentialsService.delete(user.entity!.id, id);
    }
}
