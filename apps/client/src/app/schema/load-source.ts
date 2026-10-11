import { getApiErrorMessage } from '../utils/error-message';

/** Load state of one data source of a page, so an empty select is not mistaken for "none exist". */
export type SourceLoadState = 'loading' | 'loaded' | 'failed';

/**
 * Runs the loader of one source and records its state in `state`; returns the
 * error message on failure, naming the source.
 */
export async function loadSource<K extends string>(
  state: Record<K, SourceLoadState>,
  source: K,
  fallback: string,
  load: () => Promise<void>
): Promise<string | undefined> {
  state[source] = 'loading';
  try {
    await load();
    state[source] = 'loaded';
    return undefined;
  } catch (error) {
    console.error(`${fallback}:`, error);
    state[source] = 'failed';
    // A message such as "Failed to fetch" replaces the fallback, so name the source again.
    const message = getApiErrorMessage(error, fallback);
    return message.startsWith(fallback) ? message : `${fallback}: ${message}`;
  }
}
