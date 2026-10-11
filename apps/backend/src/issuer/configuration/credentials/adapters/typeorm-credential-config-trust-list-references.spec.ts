import { describe, expect, it, vi } from "vitest";
import type { CredentialConfig } from "../entities/credential.entity.js";
import { TypeOrmCredentialConfigTrustListReferences } from "./typeorm-credential-config-trust-list-references.js";

const list = { tenantId: "acme", id: "pid-issuers" };

function config(id: string, trustedAuthorities: unknown): CredentialConfig {
    return {
        id,
        description: `${id} description`,
        schemaMeta:
            trustedAuthorities === undefined ? null : { trustedAuthorities },
    } as unknown as CredentialConfig;
}

describe("TypeOrmCredentialConfigTrustListReferences", () => {
    it("returns configs whose schema metadata names the list", async () => {
        const repository = {
            find: vi.fn().mockResolvedValue([
                config("by-trust-list-id", [{ trustListId: "pid-issuers" }]),
                config("by-padded-id", [{ trustListId: " pid-issuers " }]),
                config("by-etsi-id", [
                    { frameworkType: "etsi_tl", value: "pid-issuers" },
                ]),
                config("by-etsi-url", [
                    { frameworkType: "x509", value: "MIIB..." },
                    {
                        frameworkType: "etsi_tl",
                        value: "<TENANT_URL>/trust-list/pid-issuers",
                    },
                ]),
                config("other-framework", [
                    { frameworkType: "aki", value: "pid-issuers" },
                ]),
                config("other-list", [
                    {
                        frameworkType: "etsi_tl",
                        value: "https://eudiplo.example/issuers/other/trust-list/pid-issuers",
                    },
                ]),
                config("no-schema-meta", undefined),
            ]),
        };
        const references = new TypeOrmCredentialConfigTrustListReferences(
            repository as any,
        );

        const found = await references.findReferences(list);

        expect(found.map((reference) => reference.id)).toEqual([
            "by-trust-list-id",
            "by-padded-id",
            "by-etsi-id",
            "by-etsi-url",
        ]);
        expect(found[0]).toEqual({
            kind: "CredentialConfig",
            id: "by-trust-list-id",
            description: "by-trust-list-id description",
        });
        expect(repository.find).toHaveBeenCalledWith(
            expect.objectContaining({ where: { tenantId: "acme" } }),
        );
    });
});
