import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildClaims,
  buildClaimsMetadata,
  buildDisclosureFrame,
  buildJsonSchema,
  convertV1ToV2,
} from "../src/config";
import type { CredentialConfigV1 } from "../src/config";

const currentDir = dirname(fileURLToPath(import.meta.url));

function readFixture(fileName: string): CredentialConfigV1 {
  const fixturePath = resolve(
    currentDir,
    "../../../assets/config/demo/issuance/credentials",
    fileName,
  );

  return JSON.parse(readFileSync(fixturePath, "utf-8")) as CredentialConfigV1;
}

function sortObject(input: unknown): unknown {
  if (Array.isArray(input)) {
    const normalized = input.map((entry) => sortObject(entry));
    return normalized.sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );
  }

  if (!input || typeof input !== "object") {
    return input;
  }

  const entries = Object.entries(input as Record<string, unknown>)
    .map(([key, value]) => [key, sortObject(value)] as const)
    .sort(([left], [right]) => left.localeCompare(right));

  return Object.fromEntries(entries);
}

describe("v1 to v2 migration", () => {
  it("converts pid fixture", () => {
    const v1 = readFixture("pid.json");
    const v2 = convertV1ToV2(v1);

    expect(v2.configVersion).toBe(2);
    expect(v2.config.format).toBe("dc+sd-jwt");
    expect(v2.fields.length).toBeGreaterThan(0);

    expect(sortObject(buildClaims(v2.fields))).toEqual(sortObject(v1.claims));
    expect(sortObject(buildDisclosureFrame(v2.fields))).toEqual(
      sortObject(v1.disclosureFrame),
    );

    const builtSchema = buildJsonSchema(v2.fields);
    const builtProperties = Object.keys(
      (builtSchema.properties as Record<string, unknown>) ?? {},
    );

    expect(builtSchema.type).toBe("object");
    expect(builtProperties).toEqual(
      expect.arrayContaining(["given_name", "family_name", "address"]),
    );

    const rebuiltMetadata = buildClaimsMetadata(v2.fields);
    const rebuiltByPath = new Map(
      rebuiltMetadata.map((entry) => [JSON.stringify(entry.path), entry]),
    );

    for (const expected of v1.config.claimsMetadata ?? []) {
      const key = JSON.stringify(expected.path);
      const received = rebuiltByPath.get(key);
      expect(received).toBeDefined();
      expect(sortObject(received?.display)).toEqual(sortObject(expected.display));
    }
  });

  it("converts pid mdoc fixture", () => {
    const v1 = readFixture("pid-mdoc.json");
    const v2 = convertV1ToV2(v1);

    expect(v2.configVersion).toBe(2);
    expect(v2.config.format).toBe("mso_mdoc");
    expect(v2.fields.length).toBeGreaterThan(0);

    expect(sortObject(buildClaims(v2.fields))).toEqual(sortObject(v1.claims));
  });

  it("converts citizen fixture", () => {
    const v1 = readFixture("citizen.json");
    const v2 = convertV1ToV2(v1);

    expect(v2.configVersion).toBe(2);
    expect(v2.fields.length).toBeGreaterThan(0);
    expect(sortObject(buildClaims(v2.fields))).toEqual(sortObject(v1.claims));
  });
});
