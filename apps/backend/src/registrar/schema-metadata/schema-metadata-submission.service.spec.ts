import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    SignSchemaMetaConfigDto,
    SignVersionSchemaMetaConfigDto,
} from "../../issuer/configuration/credentials/dto/schema-meta-config.dto.js";
import { CredentialConfigCreateSchema } from "../../issuer/configuration/credentials/schemas/credential-config.schema.js";
import { SchemaMetadataSubmissionService } from "./schema-metadata-submission.service.js";

describe("SchemaMetadataSubmissionService remote files", () => {
    const outbound = { getFollowingRedirects: vi.fn() };
    const service = new SchemaMetadataSubmissionService(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        outbound as never,
    );
    const fetchRemoteFile = (url: string) =>
        (
            service as unknown as {
                fetchRemoteFile(
                    sourceUrl: string,
                    fallbackFileName: string,
                    label: string,
                ): Promise<Blob | File>;
            }
        ).fetchRemoteFile(url, "rulebook-1.0.0.md", "rulebook");

    beforeEach(() => {
        outbound.getFollowingRedirects.mockReset();
    });

    it("downloads through the outbound URL policy with bounded limits", async () => {
        outbound.getFollowingRedirects.mockResolvedValue({
            status: 200,
            url: "https://rules.example/v1/rulebook.md",
            contentType: "text/markdown",
            body: "# Rules",
            bytes: Buffer.from("# Rules"),
        });

        const file = (await fetchRemoteFile(
            "https://rules.example/v1/rulebook.md",
        )) as File;

        expect(outbound.getFollowingRedirects).toHaveBeenCalledWith(
            "https://rules.example/v1/rulebook.md",
            { timeoutMs: 10_000, maxBytes: 5 * 1024 * 1024, maxRedirects: 3 },
        );
        expect(file.name).toBe("rulebook.md");
        expect(file.type).toBe("text/markdown");
        expect(await file.text()).toBe("# Rules");
    });

    it("rejects targets blocked by the policy", async () => {
        outbound.getFollowingRedirects.mockRejectedValue(
            new BadRequestException(
                "Outbound URL target resolves to a private or loopback IP",
            ),
        );

        await expect(
            fetchRemoteFile("https://internal.example/rulebook.md"),
        ).rejects.toThrow(
            "Failed to fetch rulebook (https://internal.example/rulebook.md): Outbound URL target resolves to a private or loopback IP",
        );
    });

    it("rejects non-success responses", async () => {
        outbound.getFollowingRedirects.mockResolvedValue({
            status: 404,
            url: "https://rules.example/missing.md",
            body: "",
            bytes: Buffer.alloc(0),
        });

        await expect(
            fetchRemoteFile("https://rules.example/missing.md"),
        ).rejects.toThrow("HTTP 404");
    });
});

describe("SchemaMetadataSubmissionService registrar catalogue fields", () => {
    const credentialsService = { getById: vi.fn(), update: vi.fn() };
    const schemaMetadataService = {
        createSchemaMetadata: vi.fn(),
        updateMetadata: vi.fn(),
        findOne: vi.fn(),
    };
    const trustListService = { findOne: vi.fn() };
    const keyChainService = { getEntity: vi.fn() };
    const configService = { getOrThrow: vi.fn() };
    const outbound = { getFollowingRedirects: vi.fn() };
    const service = new SchemaMetadataSubmissionService(
        credentialsService as never,
        schemaMetadataService as never,
        trustListService as never,
        keyChainService as never,
        configService as never,
        outbound as never,
    );

    const credentialConfig = {
        id: "pid",
        config: { format: "dc+sd-jwt", display: [] },
        fields: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        credentialsService.getById.mockResolvedValue(credentialConfig);
        schemaMetadataService.createSchemaMetadata.mockResolvedValue({
            id: "https://registrar.example/schemas/pid",
            version: "1.0.0",
        });
        schemaMetadataService.updateMetadata.mockImplementation(
            (_tenantId, id, version, update) => ({ id, version, ...update }),
        );
        trustListService.findOne.mockResolvedValue({
            id: "tl-1",
            keyChainId: "kc-1",
        });
        keyChainService.getEntity.mockResolvedValue({
            activeCertificate:
                "-----BEGIN CERTIFICATE-----\nMIIBszCCAVmgAwIBAgIU\n-----END CERTIFICATE-----",
        });
        configService.getOrThrow.mockReturnValue("https://eudiplo.example");
        outbound.getFollowingRedirects.mockResolvedValue({
            status: 200,
            contentType: "text/markdown",
            bytes: Buffer.from("{}"),
        });
    });

    const schemaMetadataId = "https://registrar.example/schemas/pid";
    const config = {
        name: "German PID",
        version: "1.0.0",
        rulebookURI: "https://rules.example/pid.md",
        attestationLoS: "iso_18045_high",
        bindingType: "key",
        category: "identity",
        tags: ["pid", "eudi"],
        schemaURIs: [
            {
                format: "dc+sd-jwt",
                uri: "https://rules.example/pid.json",
                meta: { vct: "urn:eudi:pid:1" },
            },
        ],
        trustedAuthorities: [{ trustListId: "tl-1" }],
    };

    it.each([
        {
            method: "submitSchemaMetadata",
            submit: () =>
                service.submitSchemaMetadata(
                    "tenant-1",
                    SignSchemaMetaConfigDto.schema.parse({
                        config,
                        credentialConfigId: "pid",
                    }),
                ),
        },
        {
            method: "submitSchemaMetadataVersion",
            submit: () =>
                service.submitSchemaMetadataVersion(
                    "tenant-1",
                    SignVersionSchemaMetaConfigDto.schema.parse({
                        config: { ...config, id: schemaMetadataId },
                        credentialConfigId: "pid",
                    }),
                ),
        },
    ])(
        "$method sends category and tags to the registrar and keeps them out of the credential config",
        async ({ submit }) => {
            await submit();

            expect(schemaMetadataService.updateMetadata).toHaveBeenCalledWith(
                "tenant-1",
                schemaMetadataId,
                "1.0.0",
                {
                    displayName: "German PID",
                    category: "identity",
                    tags: ["pid", "eudi"],
                },
            );

            expect(credentialsService.update).toHaveBeenCalledOnce();
            const [, , { schemaMeta }] =
                credentialsService.update.mock.calls[0];
            expect(schemaMeta).not.toHaveProperty("category");
            expect(schemaMeta).not.toHaveProperty("tags");
            expect(schemaMeta.id).toBe(schemaMetadataId);
            expect(
                CredentialConfigCreateSchema.safeParse({
                    ...credentialConfig,
                    schemaMeta,
                }).error,
            ).toBeUndefined();
        },
    );

    it.each([
        {
            fields: { category: "identity" },
            update: { displayName: "German PID", category: "identity" },
        },
        {
            fields: { tags: ["pid"] },
            update: { displayName: "German PID", tags: ["pid"] },
        },
        { fields: { tags: [] }, update: { displayName: "German PID" } },
    ])(
        "sends only the set catalogue fields $fields to the registrar",
        async ({ fields, update }) => {
            const {
                category: _category,
                tags: _tags,
                ...withoutCatalogue
            } = config;

            await service.submitSchemaMetadata(
                "tenant-1",
                SignSchemaMetaConfigDto.schema.parse({
                    config: { ...withoutCatalogue, ...fields },
                }),
            );

            expect(schemaMetadataService.updateMetadata).toHaveBeenCalledWith(
                "tenant-1",
                schemaMetadataId,
                "1.0.0",
                update,
            );
        },
    );

    describe("link-only request", () => {
        const {
            rulebookURI: _rulebookURI,
            category,
            tags,
            ...linkConfig
        } = config;
        const link = (catalogueFields: object) =>
            service.submitSchemaMetadata(
                "tenant-1",
                SignSchemaMetaConfigDto.schema.parse({
                    config: {
                        ...linkConfig,
                        ...catalogueFields,
                        id: schemaMetadataId,
                    },
                    credentialConfigId: "pid",
                }),
            );

        it.each([
            { catalogueFields: { category } },
            { catalogueFields: { tags } },
        ])("rejects $catalogueFields", async ({ catalogueFields }) => {
            await expect(link(catalogueFields)).rejects.toThrow(
                BadRequestException,
            );
            expect(credentialsService.update).not.toHaveBeenCalled();
            expect(schemaMetadataService.updateMetadata).not.toHaveBeenCalled();
        });

        it("accepts empty tags and links without a registrar update", async () => {
            await link({ tags: [] });

            const [, , { schemaMeta }] =
                credentialsService.update.mock.calls[0];
            expect(schemaMeta.id).toBe(schemaMetadataId);
            expect(schemaMeta).not.toHaveProperty("tags");
            expect(schemaMetadataService.updateMetadata).not.toHaveBeenCalled();
        });
    });
});

describe("SchemaMetadataSubmissionService credential config link", () => {
    const credentialConfig = {
        id: "pid",
        config: { format: "dc+sd-jwt", display: [] },
        vct: "urn:example:pid",
        fields: [{ path: ["given_name"], type: "string" }],
    };
    const rootCertificate = Buffer.from("root certificate").toString("base64");
    const publishedConfig: SignSchemaMetaConfigDto["config"] = {
        name: "PID",
        version: "1.0.0",
        rulebookURI: "https://rules.example/pid.md",
        attestationLoS: "iso_18045_high",
        bindingType: "key",
        trustedAuthorities: [{ frameworkType: "x509", value: rootCertificate }],
    };

    const credentials = { getById: vi.fn(), update: vi.fn() };
    const schemaMetadata = {
        createSchemaMetadata: vi.fn(),
        updateMetadata: vi.fn(),
        findOne: vi.fn(),
    };
    const outbound = { getFollowingRedirects: vi.fn() };
    const service = new SchemaMetadataSubmissionService(
        credentials as never,
        schemaMetadata as never,
        {} as never,
        {} as never,
        {} as never,
        outbound as never,
    );
    const linkedSchemaMeta = () =>
        credentials.update.mock.calls[0]?.[2]?.schemaMeta;

    beforeEach(() => {
        vi.resetAllMocks();
        credentials.getById.mockResolvedValue(credentialConfig);
        const published = {
            id: "https://schemas.example/pid",
            version: "1.0.0",
        };
        schemaMetadata.createSchemaMetadata.mockResolvedValue(published);
        schemaMetadata.updateMetadata.mockResolvedValue(published);
        schemaMetadata.findOne.mockResolvedValue(published);
        outbound.getFollowingRedirects.mockResolvedValue({
            status: 200,
            url: publishedConfig.rulebookURI,
            contentType: "text/markdown",
            body: "# Rules",
            bytes: Buffer.from("# Rules"),
        });
    });

    it.each([
        [
            "publish",
            () =>
                service.submitSchemaMetadata("tenant", {
                    config: publishedConfig,
                    credentialConfigId: "pid",
                }),
        ],
        [
            "publish-version",
            () =>
                service.submitSchemaMetadataVersion("tenant", {
                    config: {
                        ...publishedConfig,
                        id: "https://schemas.example/pid",
                    },
                    credentialConfigId: "pid",
                }),
        ],
        [
            "link-only publish",
            () =>
                service.submitSchemaMetadata("tenant", {
                    config: {
                        ...publishedConfig,
                        id: "https://schemas.example/pid",
                        rulebookURI: undefined,
                    },
                    credentialConfigId: "pid",
                }),
        ],
    ])(
        "%s with an x509 trusted authority links a valid credential config",
        async (_, submit) => {
            await submit();

            expect(linkedSchemaMeta()).toMatchObject({
                id: "https://schemas.example/pid",
                trustedAuthorities: [
                    { frameworkType: "x509", value: rootCertificate },
                ],
            });
            const result = CredentialConfigCreateSchema.safeParse({
                ...credentialConfig,
                schemaMeta: linkedSchemaMeta(),
            });
            expect(result.error?.issues).toBeUndefined();
        },
    );
});
