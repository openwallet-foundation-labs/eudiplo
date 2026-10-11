/** The backend's message from an SDK error body or an `Error`, if it has one. */
export function apiErrorDetail(error: unknown): string | undefined {
  const firstString = (value: unknown): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string') {
      const text = value.trim();
      // The SDK throws a body that is not JSON as text; of a proxy's HTML error
      // page only the title says something, such as "502 Bad Gateway".
      return text.startsWith('<')
        ? /<title>([^<]+)<\/title>/i.exec(text)?.[1].trim()
        : text || undefined;
    }

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
 * `fallback`, plus the validation issues; a hint when the backend could not
 * be reached; else `fallback`. A backend message that starts with "Failed to"
 * already says what failed and is returned without the prefix. `allIssues`
 * names every validation issue, for a form that shows none of them at a
 * field; otherwise the first three are named.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback: string,
  { allIssues = false }: { allIssues?: boolean } = {}
): string {
  if (isNetworkError(error)) {
    return unreachableMessage(fallback);
  }

  const extracted = apiErrorDetail(error);
  const issue = validationIssueSummary(error, allIssues ? Infinity : SHOWN_ISSUES);
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
 * The message as a sentence, for text that goes on after it, so a backend
 * message that already ends with a period does not get a second one.
 */
export function asSentence(message: string): string {
  let end = message.length;
  while (end > 0 && message[end - 1] === '.') end--;
  return `${message.slice(0, end)}.`;
}

/** How many issues of a `400 Validation failed` response the message names. */
const SHOWN_ISSUES = 3;

/**
 * The issues of a `400 Validation failed` response as `path: message`, the
 * first {@link SHOWN_ISSUES} of them, so the user sees which fields were rejected.
 */
function validationIssueSummary(error: unknown, limit: number): string | undefined {
  const issues = getValidationIssues(error);
  if (issues.length === 0) return undefined;

  const shown = issues
    .slice(0, limit)
    .map(({ path, message }) => (path ? `${path}: ${message}` : message))
    .join('; ');
  const hidden = issues.length - limit;
  return hidden > 0 ? `${shown}; ${hidden} more` : shown;
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

const listFormat = new Intl.ListFormat('en', { type: 'conjunction' });

/** A failed call, named by `label`, for example "trust lists" or a resource key. */
export interface LabelledFailure {
  label: string;
  error: unknown;
}

/**
 * Splits failed calls so a list of them gives the unreachable hint once:
 * `unreachable` names every call the backend did not answer, `describe`
 * turning their joined labels into the start of the message, for example
 * "Could not load key chains and trust lists: the backend could not be
 * reached. …"; `other` keeps the remaining failures in their order.
 */
export function groupUnreachable<T extends LabelledFailure>(
  failures: T[],
  describe: (labels: string) => string
): { unreachable?: string; other: T[] } {
  const labels = failures
    .filter((failure) => isNetworkError(failure.error))
    .map((failure) => failure.label);
  return {
    unreachable: labels.length
      ? unreachableMessage(describe(listFormat.format(labels)))
      : undefined,
    other: failures.filter((failure) => !isNetworkError(failure.error)),
  };
}

/**
 * The reasons of several failed calls in one text, joined with "; ": `reason`
 * gives the reason of each call the backend answered, and the calls it did not
 * answer share one reason at the end, as in {@link groupUnreachable}.
 */
export function joinFailures<T extends LabelledFailure>(
  failures: T[],
  reason: (failure: T) => string,
  describe: (labels: string) => string
): string {
  const { unreachable, other } = groupUnreachable(failures, describe);
  const reasons = other.map(reason);
  // Last, so its closing period does not run into a separator.
  if (unreachable) reasons.push(unreachable);
  return reasons.join('; ');
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
