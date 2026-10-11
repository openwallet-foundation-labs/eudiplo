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

    it("sends a category without tags to the registrar", async () => {
        const { tags: _tags, ...categoryOnly } = config;

        await service.submitSchemaMetadata(
            "tenant-1",
            SignSchemaMetaConfigDto.schema.parse({ config: categoryOnly }),
        );

        expect(schemaMetadataService.updateMetadata).toHaveBeenCalledWith(
            "tenant-1",
            schemaMetadataId,
            "1.0.0",
            { displayName: "German PID", category: "identity" },
        );
    });

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
