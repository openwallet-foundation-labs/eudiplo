import { describe, expect, it } from "vitest";
import { toPublicJwk } from "./public-jwk.js";

describe("toPublicJwk", () => {
    it("keeps only the public members", () => {
        expect(
            toPublicJwk({
                kty: "EC",
                crv: "P-256",
                x: "x",
                y: "y",
                kid: "k",
                alg: "ES256",
                use: "sig",
                d: "private",
                oth: [{ r: "prime" }],
                ext: true,
            } as never),
        ).toEqual({
            kty: "EC",
            crv: "P-256",
            x: "x",
            y: "y",
            kid: "k",
            alg: "ES256",
            use: "sig",
        });
    });
});
