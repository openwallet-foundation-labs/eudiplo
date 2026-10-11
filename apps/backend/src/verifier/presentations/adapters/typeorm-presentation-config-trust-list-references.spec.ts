import { describe, expect, it, vi } from "vitest";
import type { PresentationConfig } from "../entities/presentation-config.entity.js";
import { TypeOrmPresentationConfigTrustListReferences } from "./typeorm-presentation-config-trust-list-references.js";

const list = { tenantId: "acme", id: "pid-issuers" };

function config(
    id: string,
    credentials: unknown,
    description?: string | null,
): PresentationConfig {
    return {
        id,
        description,
        dcql_query: { credentials },
    } as unknown as PresentationConfig;
}

function source(configs: PresentationConfig[]) {
    const repository = { find: vi.fn().mockResolvedValue(configs) };
    return {
        repository,
        source: new TypeOrmPresentationConfigTrustListReferences(
            repository as any,
        ),
    };
}

describe("TypeOrmPresentationConfigTrustListReferences", () => {
    it("returns configs whose etsi_tl authorities name the list by ID or URL", async () => {
        const { source: references, repository } = source([
            config(
                "by-id",
                [
                    {
                        id: "pid",
                        trusted_authorities: [
                            {
                                type: "etsi_tl",
                                values: [{ trustListId: "pid-issuers" }],
                            },
                        ],
                    },
                ],
                "PID check",
            ),
            config(
                "by-url",
                [
                    { id: "other" },
                    {
                        id: "pid",
                        trusted_authorities: [
                            {
                                type: "etsi_tl",
                                values: [
                                    {
                                        url: "https://eudiplo.example/issuers/acme/trust-list/pid-issuers",
                                    },
                                ],
                            },
                        ],
                    },
                ],
                null,
            ),
            config("unrelated", [
                {
                    id: "pid",
                    trusted_authorities: [
                        {
                            type: "etsi_tl",
                            values: [{ trustListId: "pid-issuers-old" }],
                        },
                        {
                            type: "openid_federation",
                            values: ["<TENANT_URL>/trust-list/pid-issuers"],
                        },
                    ],
                },
            ]),
            config("no-credentials", undefined),
        ]);

        await expect(references.findReferences(list)).resolves.toEqual([
            {
                kind: "PresentationConfig",
                id: "by-id",
                description: "PID check",
            },
            {
                kind: "PresentationConfig",
                id: "by-url",
                description: undefined,
            },
        ]);
        expect(repository.find).toHaveBeenCalledWith(
            expect.objectContaining({ where: { tenantId: "acme" } }),
        );
    });
});
