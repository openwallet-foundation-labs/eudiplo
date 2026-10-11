const MAX_REGISTRAR_MESSAGE_LENGTH = 500;

/**
 * The registrar's error message for the API caller: only text, joined when
 * the registrar lists several messages, and capped in length, so an
 * arbitrary upstream body is never passed on.
 */
export function registrarErrorMessage(error: unknown): string {
    const candidate = [
        (error as any)?.error?.message,
        (error as any)?.message,
        (error as any)?.error,
    ]
        .map(toText)
        .find((value) => value !== undefined);
    if (candidate === undefined) {
        return "Unknown registrar error";
    }
    return candidate.length > MAX_REGISTRAR_MESSAGE_LENGTH
        ? `${candidate.slice(0, MAX_REGISTRAR_MESSAGE_LENGTH)}…`
        : candidate;
}

function toText(value: unknown): string | undefined {
    if (typeof value === "string") {
        return value.length > 0 ? value : undefined;
    }
    if (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((entry) => typeof entry === "string")
    ) {
        return value.join("; ");
    }
    return undefined;
}
