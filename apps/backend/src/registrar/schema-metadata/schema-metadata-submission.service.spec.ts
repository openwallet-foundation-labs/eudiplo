import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SignSchemaMetaConfigDto } from "../../issuer/configuration/credentials/dto/schema-meta-config.dto.js";
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
