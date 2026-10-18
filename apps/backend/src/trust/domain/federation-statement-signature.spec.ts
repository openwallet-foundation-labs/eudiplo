import { exportJWK, generateKeyPair, type JWK, SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { pinnedTrustAnchorMismatch } from "./federation-statement-signature.js";

const TA = "https://ta.example.org";

describe("pinnedTrustAnchorMismatch", () => {
    let privateKey: CryptoKey;
    let pinned: JWK;

    beforeAll(async () => {
        const pair = await generateKeyPair("ES256");
        privateKey = pair.privateKey as CryptoKey;
        pinned = { ...(await exportJWK(pair.publicKey)), kid: "ta-1" };
    });

    const statement = (
        claims: Record<string, unknown> = { iss: TA, sub: TA },
        header: Record<string, unknown> = { alg: "ES256", kid: "ta-1" },
    ) =>
        new SignJWT(claims)
            .setProtectedHeader(header as { alg: string })
            .sign(privateKey);

    it("accepts the trust anchor's entity configuration signed with a pinned key", async () => {
        await expect(
            pinnedTrustAnchorMismatch(await statement(), TA, [pinned]),
        ).resolves.toBeUndefined();
    });

    it("rejects a missing entity configuration", async () => {
        await expect(
            pinnedTrustAnchorMismatch(undefined, TA, [pinned]),
        ).resolves.toBe(`no entity configuration of trust anchor ${TA}`);
    });

    it("rejects a value that is not a JWT", async () => {
        await expect(
            pinnedTrustAnchorMismatch("not-a-jwt", TA, [pinned]),
        ).resolves.toBe(
            `entity configuration of trust anchor ${TA} is not a JWT`,
        );
    });

    it("rejects a statement that is not the trust anchor's own", async () => {
        await expect(
            pinnedTrustAnchorMismatch(
                await statement({ iss: TA, sub: "https://leaf.example.org" }),
                TA,
                [pinned],
            ),
        ).resolves.toContain("is not the entity configuration of trust anchor");
    });

    it.each([
        ["an unknown kid", { alg: "ES256", kid: "other" }],
        ["no kid", { alg: "ES256" }],
    ])("rejects %s", async (_name, header) => {
        await expect(
            pinnedTrustAnchorMismatch(await statement(undefined, header), TA, [
                pinned,
            ]),
        ).resolves.toBe(
            `entity configuration of trust anchor ${TA} is not signed with a pinned key`,
        );
    });

    it("rejects an unsigned statement", async () => {
        const encode = (value: object) =>
            Buffer.from(JSON.stringify(value)).toString("base64url");
        const unsigned = `${encode({ alg: "none", kid: "ta-1" })}.${encode({ iss: TA, sub: TA })}.`;
        await expect(
            pinnedTrustAnchorMismatch(unsigned, TA, [pinned]),
        ).resolves.toContain("is not signed with a pinned key");
    });
});
