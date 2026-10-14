import { describe, expect, it } from "vitest";
import { resolveDcqlTenantUrl } from "./dcql-tenant-url.js";

describe("resolveDcqlTenantUrl", () => {
    it("replaces every placeholder and leaves the input unchanged", () => {
        const query = {
            credentials: [
                {
                    id: "pid",
                    meta: { vct_values: ["<TENANT_URL>/credentials/pid"] },
                    trusted_authorities: [
                        { values: [{ url: "<TENANT_URL>/trust-list/a" }] },
                    ],
                },
            ],
        };

        const resolved = resolveDcqlTenantUrl(query, "https://x", "t");

        expect(resolved.credentials[0].meta.vct_values).toEqual([
            "https://x/issuers/t/credentials/pid",
        ]);
        expect(resolved.credentials[0].trusted_authorities[0].values).toEqual([
            { url: "https://x/issuers/t/trust-list/a" },
        ]);
        expect(query.credentials[0].meta.vct_values).toEqual([
            "<TENANT_URL>/credentials/pid",
        ]);
    });

    it("passes undefined through", () => {
        expect(
            resolveDcqlTenantUrl(undefined, "https://x", "t"),
        ).toBeUndefined();
    });
});
