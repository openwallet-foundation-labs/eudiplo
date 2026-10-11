export function getApiErrorMessage(error: unknown, fallback: string): string {
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
  const issue = firstValidationIssue(error);
  if (!extracted || extracted.toLowerCase() === '[object object]') {
    return issue ? `${fallback}: ${issue}` : fallback;
  }

  const message = issue ? `${extracted} (${issue})` : extracted;
  if (extracted.toLowerCase().startsWith('failed to')) {
    return message;
  }

  return `${fallback}: ${message}`;
}

/**
 * The first issue of a backend validation error body
 * (`{ message: 'Validation failed', errors: [{ path, message, code }] }`) as
 * `path: message`, so the user sees which field was rejected.
 */
function firstValidationIssue(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const issues = (error as Record<string, unknown>)['errors'];
  if (!Array.isArray(issues)) return undefined;

  const issue = issues.find(
    (entry): entry is { path?: unknown; message: string } =>
      !!entry &&
      typeof entry === 'object' &&
      typeof (entry as Record<string, unknown>)['message'] === 'string'
  );
  if (!issue) return undefined;

  const path = Array.isArray(issue.path)
    ? issue.path.join('.')
    : typeof issue.path === 'string'
      ? issue.path
      : '';
  const more = issues.length > 1 ? `; ${issues.length - 1} more` : '';
  return `${path ? `${path}: ` : ''}${issue.message}${more}`;
}
