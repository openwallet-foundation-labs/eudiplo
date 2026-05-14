import { BadRequestException, Injectable } from "@nestjs/common";
import { SchemaURIMeta } from "@owf/eudi-attestation-schema";
import { RegistrarService } from "../../../../registrar/registrar.service";
import { CredentialConfigService } from "../credential-config/credential-config.service";
import {
    SignSchemaMetaConfigDto,
    SignVersionSchemaMetaConfigDto,
} from "../dto/schema-meta-config.dto";
import { buildJsonSchema } from "../utils";
import { SchemaMetaAdapterService } from "./schema-meta-adapter.service";

@Injectable()
export class SchemaMetadataSigningService {
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
        meta: SchemaURIMeta;
    }> {
        const existing = await this.credentialsService.getById(
            tenantId,
            credentialConfigId,
        );
        const format = existing.config?.format ?? fallbackFormat ?? "dc+sd-jwt";

        const schema = buildJsonSchema(existing.fields as any);
        if (!schema || Object.keys(schema.properties ?? {}).length === 0) {
            throw new BadRequestException(
                `Credential config ${credentialConfigId} has no inline schema to upload. Provide schemaURIs explicitly or set the credential schema first.`,
            );
        }

        const fileName = `schema-${credentialConfigId}-${format}.json`;
        const schemaContent = JSON.stringify(schema, null, 2);
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
            meta: this.deriveSchemaUriMetadata(existing, format),
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
                        meta: uploadedSchema.meta,
                    },
                ],
            },
            alreadyHosted: true,
        };
    }

    async signSchemaMetaConfig(
        tenantId: string,
        body: SignSchemaMetaConfigDto,
    ) {
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

    async signVersionSchemaMetaConfig(
        tenantId: string,
        body: SignVersionSchemaMetaConfigDto,
    ) {
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
}
