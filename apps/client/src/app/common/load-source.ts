import type { MatSnackBar } from '@angular/material/snack-bar';

import { LabelledFailure, getApiErrorMessage, joinFailures } from '../utils/error-message';
import { openErrorSnackBar } from '../utils/error-snackbar';

/** Load state of one data source of a page, so an empty select is not mistaken for "none exist". */
export type SourceLoadState = 'loading' | 'loaded' | 'failed';

/**
 * Runs the loader of one source, named by `label`, and records its state in
 * `state`; returns the failure, for {@link reportSourceFailures}.
 */
export async function loadSource<K extends string>(
  state: Record<K, SourceLoadState>,
  source: K,
  label: string,
  load: () => Promise<void>
): Promise<LabelledFailure | undefined> {
  state[source] = 'loading';
  try {
    await load();
    state[source] = 'loaded';
    return undefined;
  } catch (error) {
    console.error(`Failed to load ${label}:`, error);
    state[source] = 'failed';
    return { label, error };
  }
}

/**
 * One message naming every source that failed to load, empty when none did;
 * the sources the backend did not answer share one message, so its hint
 * appears once.
 */
function sourceFailuresMessage(results: (LabelledFailure | undefined)[]): string {
  const failures = results.filter((result) => result !== undefined);
  return joinFailures(
    failures,
    ({ label, error }) => {
      const fallback = `Failed to load ${label}`;
      // A backend message that starts with "Failed to" replaces the fallback, so name the source again.
      const message = getApiErrorMessage(error, fallback);
      return message.startsWith(fallback) ? message : `${fallback}: ${message}`;
    },
    (labels) => `Failed to load ${labels}`
  );
}

/** Names every source that failed to load in one snackbar, if any did. */
export function reportSourceFailures(
  snackBar: MatSnackBar,
  results: (LabelledFailure | undefined)[]
): void {
  const message = sourceFailuresMessage(results);
  if (message) {
    openErrorSnackBar(snackBar, message);
  }
}
