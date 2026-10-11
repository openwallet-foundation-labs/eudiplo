/** The backend's message from an SDK error body or an `Error`, if it has one. */
export function apiErrorDetail(error: unknown): string | undefined {
  const firstString = (value: unknown): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string' && value.trim()) return value;

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = firstString(item);
        if (found) return found;
      }
      return undefined;
    }

    if (typeof value !== 'object') return undefined;

    const record = value as Record<string, unknown>;
    const candidates = [
      record['error_description'],
      record['message'],
      record['error'],
      record['detail'],
    ];

    for (const candidate of candidates) {
      const found = firstString(candidate);
      if (found) return found;
    }

    return undefined;
  };

  const extracted = firstString(error);
  return extracted && extracted.toLowerCase() !== '[object object]' ? extracted : undefined;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const extracted = apiErrorDetail(error);
  if (!extracted) {
    return fallback;
  }

  if (extracted.toLowerCase().startsWith('failed to')) {
    return extracted;
  }

  return `${fallback}: ${extracted}`;
}

/** True when the SDK error is the backend's error body with this HTTP status. */
export function hasHttpStatus(error: unknown, status: number): boolean {
  return (error as { statusCode?: unknown } | null | undefined)?.statusCode === status;
}

/** A field the backend rejected in a `400 Validation failed` response. */
export interface ValidationIssue {
  /** Dot-separated path of the field in the request body, empty for the body itself. */
  path: string;
  message: string;
}

/**
 * The `errors` of a `400 Validation failed` response, from an Angular
 * `HttpErrorResponse` or from the response body the SDK throws; empty for any
 * other error.
 */
export function getValidationIssues(error: unknown): ValidationIssue[] {
  const record = error as { errors?: unknown; error?: { errors?: unknown } | null } | null;
  const issues = record?.error?.errors ?? record?.errors;
  if (!Array.isArray(issues)) return [];
  return issues.flatMap((issue) => {
    const { path, message } = (issue ?? {}) as { path?: unknown; message?: unknown };
    if (typeof message !== 'string') return [];
    return [{ path: Array.isArray(path) ? path.join('.') : '', message }];
  });
}
