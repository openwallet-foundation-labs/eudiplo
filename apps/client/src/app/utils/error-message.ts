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

/**
 * Message for a failed SDK call: the backend's message prefixed with
 * `fallback`, plus the first validation issue; a hint when the backend could
 * not be reached; else `fallback`. A backend message that starts with
 * "Failed to" already says what failed and is returned without the prefix.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isNetworkError(error)) {
    return unreachableMessage(fallback);
  }

  const extracted = apiErrorDetail(error);
  const issue = firstValidationIssue(error);
  if (!extracted) {
    return issue ? `${fallback}: ${issue}` : fallback;
  }

  const message = issue ? `${extracted} (${issue})` : extracted;
  if (extracted.toLowerCase().startsWith('failed to')) {
    return message;
  }

  return `${fallback}: ${message}`;
}

/**
 * The first issue of a `400 Validation failed` response as `path: message`,
 * so the user sees which field was rejected.
 */
function firstValidationIssue(error: unknown): string | undefined {
  const issues = getValidationIssues(error);
  if (issues.length === 0) return undefined;

  const [{ path, message }] = issues;
  const first = path ? `${path}: ${message}` : message;
  return issues.length > 1 ? `${first}; ${issues.length - 1} more` : first;
}

/** True when the SDK error is the backend's error body with this HTTP status. */
export function hasHttpStatus(error: unknown, status: number): boolean {
  return (error as { statusCode?: unknown } | null | undefined)?.statusCode === status;
}

/**
 * Message for a failed `HttpClient` request: the backend's message, a hint
 * when the backend could not be reached, else Angular's message, which names
 * the status.
 */
export function getHttpErrorMessage(error: unknown, fallback: string): string {
  const response = error as { status?: unknown; error?: { message?: unknown } | null } | null;
  if (response?.status === 0) {
    return unreachableMessage(fallback);
  }
  const body = response?.error;
  return getApiErrorMessage(typeof body?.message === 'string' ? body : error, fallback);
}

function unreachableMessage(fallback: string): string {
  return `${fallback}: the backend could not be reached. Check the connection and try again.`;
}

/**
 * Messages of the `TypeError` that `fetch` rejects with when the request got
 * no response (offline, DNS, refused connection, CORS). Other `TypeError`s,
 * such as a bug in the calling code, keep their message.
 */
const NETWORK_ERROR_MESSAGES = [
  /^Failed to fetch( \(.+\))?$/, // Chrome, optionally naming the host
  /^NetworkError when attempting to fetch resource\.$/, // Firefox
  /^Load failed( \(.+\))?$/, // Safari
  /^The Internet connection appears to be offline\.$/, // Safari 16
];

/** True when `fetch` rejected because the backend could not be reached. */
function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    NETWORK_ERROR_MESSAGES.some((pattern) => pattern.test(error.message))
  );
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
