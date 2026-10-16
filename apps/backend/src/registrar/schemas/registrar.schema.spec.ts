import { describe, expect, it } from "vitest";
import {
    CreateRegistrarConfigSchema,
    UpdateRegistrarConfigSchema,
} from "./registrar.schema.js";

describe("registrar config URLs", () => {
    const config = {
        registrarUrl: "https://registrar.example/api",
        oidcUrl: "https://auth.example/realms/registrar",
        clientId: "client",
        username: "user",
        password: "password",
    };

    it("accepts plain http(s) base URLs", () => {
        expect(CreateRegistrarConfigSchema.safeParse(config).success).toBe(
            true,
        );
        expect(
            UpdateRegistrarConfigSchema.safeParse({
                registrarUrl: "http://registrar.example:3001",
            }).success,
        ).toBe(true);
    });

    it.each([
        // A trailing "#" swallows the API path the client appends.
        "https://registrar.example/#",
        "https://registrar.example/#/admin",
        "https://registrar.example/?",
        "https://registrar.example/?target=internal",
        "https://user:secret@registrar.example",
        "ftp://registrar.example",
        "file:///etc/passwd",
    ])("rejects %s", (url) => {
        for (const field of ["registrarUrl", "oidcUrl"] as const) {
            expect(
                CreateRegistrarConfigSchema.safeParse({
                    ...config,
                    [field]: url,
                }).success,
            ).toBe(false);
            expect(
                UpdateRegistrarConfigSchema.safeParse({ [field]: url }).success,
            ).toBe(false);
        }
    });
});

describe("registrar config relying party contact", () => {
    const config = {
        registrarUrl: "https://registrar.example/api",
        oidcUrl: "https://auth.example/realms/registrar",
        clientId: "client",
        username: "user",
        password: "password",
    };

    it.each([
        { supportUri: "https://verifier.example/support" },
        { email: "Support@Verifier.example" },
        { phone: "+49 (30) 123-4567" },
        {
            supportUri: "https://verifier.example/support",
            email: "support@verifier.example",
            phone: "+49 30 1234567",
        },
    ])("accepts %o", (relyingPartyContact) => {
        expect(
            CreateRegistrarConfigSchema.safeParse({
                ...config,
                relyingPartyContact,
            }).success,
        ).toBe(true);
    });

    it("accepts a missing or null contact", () => {
        expect(CreateRegistrarConfigSchema.safeParse(config).success).toBe(
            true,
        );
        expect(
            UpdateRegistrarConfigSchema.safeParse({ relyingPartyContact: null })
                .success,
        ).toBe(true);
    });

    it.each([
        {},
        // The registrar only puts https support URLs in certificates.
        { supportUri: "http://verifier.example/support" },
        { supportUri: "mailto:support@verifier.example" },
        { email: "support" },
        { phone: "call me" },
        { phone: "1234" },
        { fax: "+49 30 1234567" },
    ])("rejects %o", (relyingPartyContact) => {
        expect(
            CreateRegistrarConfigSchema.safeParse({
                ...config,
                relyingPartyContact,
            }).success,
        ).toBe(false);
        expect(
            UpdateRegistrarConfigSchema.safeParse({ relyingPartyContact })
                .success,
        ).toBe(false);
    });
});
