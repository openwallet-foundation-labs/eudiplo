import { HttpException } from "@nestjs/common";
import type { ConfigImportPlan } from "./config-resource.types.js";

/**
 * The client secrets an apply generated, from its plan or from the error it
 * failed with: a failed apply reports the secrets generated before the failure.
 */
export function generatedSecretsOf(
    result: unknown,
): ConfigImportPlan["generatedSecrets"] {
    const response =
        result instanceof HttpException ? result.getResponse() : result;
    if (!response || typeof response !== "object") return undefined;
    const { generatedSecrets } = response as Record<string, unknown>;
    return Array.isArray(generatedSecrets)
        ? (generatedSecrets as ConfigImportPlan["generatedSecrets"])
        : undefined;
}
