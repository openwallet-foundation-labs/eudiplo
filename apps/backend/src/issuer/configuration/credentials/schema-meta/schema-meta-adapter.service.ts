import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { type Signer } from "@owf/crypto";
import {
    type SchemaMeta,
    type SignedSchemaMeta,
    schemaMeta as schemaMetaBuilder,
    schemaURI as schemaURIBuilder,
    signSchemaMeta,
    trustAuthority as trustAuthorityBuilder,
    validateSchemaMeta,
} from "@owf/eudi-attestation-schema";
import { PinoLogger } from "nestjs-pino";
import { KeyUsageType } from "../../../../crypto/key/entities/key-chain.entity";
import { KeyChainService } from "../../../../crypto/key/key-chain.service";
import { SchemaMetaConfig } from "../dto/schema-meta-config.dto";
import {
    CredentialConfig,
    CredentialFormat,
} from "../entities/credential.entity";

/**
 * Adapter service that translates a CredentialConfig's schemaMeta configuration
 * into a TS11 SchemaMeta object using the @owf/eudi-attestation-schema library.
 *
 * @experimental The TS11 specification (EUDI Catalogue of Attestations) is not yet finalized.
 */
@Injectable()
export class SchemaMetaAdapterService {
    constructor(
        private readonly keyChainService: KeyChainService,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext("SchemaMetaAdapterService");
    }

    /**
     * Generates a plain (unsigned) SchemaMeta object from the credential config.
     * Throws if no schemaMeta configuration is present on the credential.
     *
     * Integrity hashes for `rulebookURI` and every `schemaURIs[].uri` are
     * always computed server-side at generation time so the signed object
     * reflects the live resources rather than any stale or attacker-supplied
     * value.
     */
    async generateSchemaMeta(
        credentialConfig: CredentialConfig,
    ): Promise<SchemaMeta> {
        const { schemaMeta: config, vct, id: credId } = credentialConfig;

        if (!config) {
            throw new NotFoundException(
                "No schema metadata configuration found for this credential. " +
                    "Set the `schemaMeta` field on the credential configuration to enable TS11 schema metadata generation.",
            );
        }

        // Derive the attestation format from the stored credential format.
        const credFormat = credentialConfig.config?.format;
        const format =
            credFormat === CredentialFormat.MSO_MDOC
                ? ("mso_mdoc" as const)
                : ("dc+sd-jwt" as const);

        const rulebookIntegrity = await this.computeSri(
            config.rulebookURI,
            "rulebookURI",
        );
        const schemaURIsWithIntegrity = await Promise.all(
            (config.schemaURIs ?? []).map(async (entry) => ({
                ...entry,
                integrity: await this.computeSri(
                    entry.uri,
                    `schemaURIs[${entry.format}]`,
                ),
            })),
        );

        // Build the core SchemaMeta object.
        let builder = schemaMetaBuilder()
            .version(config.version)
            .rulebookURI(config.rulebookURI)
            .rulebookIntegrity(rulebookIntegrity)
            .attestationLoS(config.attestationLoS)
            .bindingType(config.bindingType)
            .addFormat(format);

        // Optional: explicit id override; otherwise fall back to vct / docType / entity id.
        const attestationId =
            config.id ??
            (typeof vct === "string"
                ? vct
                : typeof vct === "object" && vct !== null
                  ? (vct as { value?: string }).value
                  : undefined) ??
            credentialConfig.config?.docType ??
            credId;

        if (attestationId) {
            builder = builder.id(attestationId);
        }

        // Add schema URIs.
        for (const entry of schemaURIsWithIntegrity) {
            const uriBuilder = schemaURIBuilder()
                .format(entry.format as any)
                .uri(entry.uri)
                .integrity(entry.integrity);
            builder = builder.addSchemaURI(uriBuilder.build());
        }

        // Add trusted authorities.
        for (const ta of config.trustedAuthorities ?? []) {
            const taObj = trustAuthorityBuilder()
                .frameworkType(ta.frameworkType as any)
                .value(ta.value)
                .build();
            builder = builder.addTrustAuthority(taObj);
        }

        const result = builder.build();

        // Validate the generated object.
        const validation = validateSchemaMeta(result);
        if (!validation.valid) {
            const errors = validation.errors
                .map((e) => `${e.path}: ${e.message}`)
                .join("; ");
            throw new BadRequestException(
                `Generated SchemaMeta is invalid: ${errors}`,
            );
        }

        return result;
    }

    /**
    /**
     * Fetches the resource at `url` and returns its W3C Subresource Integrity
     * hash in `sha256-<base64>` form. Computing this server-side prevents
     * stale or attacker-supplied integrity values from being signed and
     * sidesteps browser CORS limitations the UI would otherwise hit.
     */
    private async computeSri(url: string, label: string): Promise<string> {
        let response: Response;
        try {
            response = await fetch(url);
        } catch (err) {
            throw new BadRequestException(
                `Failed to fetch ${label} (${url}) for integrity computation: ${
                    err instanceof Error ? err.message : String(err)
                }`,
            );
        }
        if (!response.ok) {
            throw new BadRequestException(
                `Failed to fetch ${label} (${url}) for integrity computation: HTTP ${response.status}`,
            );
        }
        const buffer = await response.arrayBuffer();
        const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
        const base64 = Buffer.from(digest).toString("base64");
        return `sha256-${base64}`;
    }

    /**
     * Signs an already-built SchemaMeta object using the specified or default key chain.
     *
     * Uses the {@link KeyChainService.signer} abstraction so that signing works
     * against any configured KMS provider — the raw private key is never
     * materialised here (an external KMS may not expose it at all).
     */
    private async signWithKeyChain(
        tenantId: string,
        schemaMetaObj: SchemaMeta,
        keyChainId?: string,
    ): Promise<SignedSchemaMeta> {
        const resolvedKeyChainId =
            keyChainId ??
            (
                await this.keyChainService.findByUsageType(
                    tenantId,
                    KeyUsageType.Access,
                )
            )?.id;

        const keyChain = await this.keyChainService.getEntity(
            tenantId,
            resolvedKeyChainId,
        );

        // KMS-agnostic signer: returns a (data) => base64url-signature callback.
        const signer: Signer = await this.keyChainService.signer(
            tenantId,
            resolvedKeyChainId,
        );

        const certificates: string[] = [];
        if (keyChain.activeCertificate) {
            const pemBlocks = (keyChain.activeCertificate as string)
                .split(/(?=-----BEGIN CERTIFICATE-----)/)
                .map((pem) => pem.trim())
                .filter(Boolean);
            certificates.push(...pemBlocks);
        }
        if (
            keyChain.rootCertificate &&
            !certificates.includes(keyChain.rootCertificate.trim())
        ) {
            certificates.push(keyChain.rootCertificate.trim());
        }

        if (certificates.length === 0) {
            throw new BadRequestException(
                "Cannot sign schema metadata: the key chain does not have a certificate chain configured. " +
                    "Generate or import a certificate for the key chain before signing.",
            );
        }

        const kid =
            (keyChain.activeKey as { kid?: string } | undefined)?.kid ??
            keyChain.id;

        return signSchemaMeta({
            schemaMeta: schemaMetaObj,
            keyId: kid,
            certificates,
            signer,
        });
    }

    /**
     * Generates a signed SchemaMeta JWT from a raw SchemaMetaConfig object,
     * independent of any stored credential configuration.
     *
     * @experimental The TS11 specification (EUDI Catalogue of Attestations) is not yet finalized.
     */
    async signRawSchemaMetaConfig(
        tenantId: string,
        config: SchemaMetaConfig,
        keyChainId?: string,
    ): Promise<SignedSchemaMeta> {
        // Always (re)compute SRI hashes server-side from the live resources so
        // we never sign stale or attacker-supplied integrity values. Any
        // integrity field on the inbound config is ignored.
        const rulebookIntegrity = await this.computeSri(
            config.rulebookURI,
            "rulebookURI",
        );
        const schemaURIsWithIntegrity = await Promise.all(
            (config.schemaURIs ?? []).map(async (entry) => ({
                ...entry,
                integrity: await this.computeSri(
                    entry.uri,
                    `schemaURIs[${entry.format}]`,
                ),
            })),
        );

        let builder = schemaMetaBuilder()
            .version(config.version)
            .rulebookURI(config.rulebookURI)
            .rulebookIntegrity(rulebookIntegrity)
            .attestationLoS(config.attestationLoS)
            .bindingType(config.bindingType);

        // Derive supportedFormats from the schemaURIs entries (deduplicated),
        // since the raw config does not carry an explicit format list.
        const formats = new Set<string>();
        for (const entry of schemaURIsWithIntegrity) {
            if (entry.format) {
                formats.add(entry.format);
            }
        }
        for (const fmt of formats) {
            builder = builder.addFormat(fmt as any);
        }

        if (config.id) {
            builder = builder.id(config.id);
        }
        for (const entry of schemaURIsWithIntegrity) {
            const uriBuilder = schemaURIBuilder()
                .format(entry.format as any)
                .uri(entry.uri)
                .integrity(entry.integrity);
            builder = builder.addSchemaURI(uriBuilder.build());
        }
        for (const ta of config.trustedAuthorities ?? []) {
            const taObj = trustAuthorityBuilder()
                .frameworkType(ta.frameworkType as any)
                .value(ta.value)
                .build();
            builder = builder.addTrustAuthority(taObj);
        }

        const result = builder.build();

        const validation = validateSchemaMeta(result);
        if (!validation.valid) {
            const errors = validation.errors
                .map((e) => `${e.path}: ${e.message}`)
                .join("; ");
            throw new BadRequestException(
                `Generated SchemaMeta is invalid: ${errors}`,
            );
        }

        this.logger.info({ tenantId }, "Signing raw SchemaMetaConfig");

        return this.signWithKeyChain(tenantId, result, keyChainId);
    }

    /**
     * Generates a signed SchemaMeta JWT (JWS) for the given credential config.
     *
     * The signing key is resolved from the credential's keyChainId or the tenant's
     * default key chain. The certificate chain from the key chain is included in the
     * JWS x5c header.
     *
     * @experimental Signing requires a certificate chain; ensure the key chain
     *   has a certificate configured before calling this method.
     */
    async generateSignedSchemaMeta(
        tenantId: string,
        credentialConfig: CredentialConfig,
    ): Promise<SignedSchemaMeta> {
        const schemaMetaObj = await this.generateSchemaMeta(credentialConfig);

        const keyChainId =
            credentialConfig.keyChainId ??
            (await this.keyChainService.getKid(tenantId));

        this.logger.info(
            { tenantId, credentialId: credentialConfig.id },
            "Signing SchemaMeta",
        );

        return this.signWithKeyChain(tenantId, schemaMetaObj, keyChainId);
    }
}
