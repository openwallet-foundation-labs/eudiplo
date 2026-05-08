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
  if (!extracted) {
    return fallback;
  }

  if (extracted.toLowerCase() === '[object object]') {
    return fallback;
  }

  if (extracted.toLowerCase().startsWith('failed to')) {
    return extracted;
  }

  return `${fallback}: ${extracted}`;
}
