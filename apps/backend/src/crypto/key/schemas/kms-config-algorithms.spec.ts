import type { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { parseRawKmsConfig } from "./kms-config.schema.js";

/** The paths of the validation issues a parse reports. */
function issuePaths(input: unknown): string[] {
    try {
        parseRawKmsConfig(input);
    } catch (error) {
        const body = (error as BadRequestException).getResponse() as {
            errors?: { path: (string | number)[] }[];
        };
        return (body.errors ?? []).map((issue) => issue.path.join("."));
    }
    return [];
}

describe("kms.json algorithms", () => {
    it("accepts algorithms and a default among them", () => {
        const config = parseRawKmsConfig({
            providers: [
                {
                    id: "db",
                    type: "db",
                    algorithms: ["ES256", "ES384"],
                    defaultAlgorithm: "ES384",
                },
            ],
        });
        expect(config.providers[0]).toMatchObject({
            algorithms: ["ES256", "ES384"],
            defaultAlgorithm: "ES384",
        });
    });

    it("rejects unknown algorithms", () => {
        expect(
            issuePaths({
                providers: [{ id: "db", type: "db", algorithms: ["ES256K"] }],
            }),
        ).toContainEqual(expect.stringMatching(/^providers\.0/));
    });

    it("rejects a default outside the algorithms", () => {
        expect(
            issuePaths({
                providers: [
                    {
                        id: "db",
                        type: "db",
                        algorithms: ["ES256"],
                        defaultAlgorithm: "ES512",
                    },
                ],
            }),
        ).toEqual(["providers.0.defaultAlgorithm"]);
    });
});
