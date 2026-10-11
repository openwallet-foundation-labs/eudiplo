import type {
  MatSnackBar,
  MatSnackBarConfig,
  MatSnackBarRef,
  TextOnlySnackBar,
} from '@angular/material/snack-bar';

/**
 * How long an error snackbar stays: 5 s, longer for a message that carries the
 * backend's reason (about 80 ms per character). A message too long to read in
 * 15 s stays until it is closed, which a duration of 0 means.
 */
export function errorSnackBarDuration(message: string): number {
  const readingTime = message.length * 80;
  return readingTime > 15000 ? 0 : Math.max(5000, readingTime);
}

/**
 * Opens a snackbar for a failed action, long enough to read the message.
 * `config` overrides the defaults, for example to add a panel class.
 */
export function openErrorSnackBar(
  snackBar: MatSnackBar,
  message: string,
  action = 'Close',
  config: MatSnackBarConfig = {}
): MatSnackBarRef<TextOnlySnackBar> {
  return snackBar.open(message, action, { duration: errorSnackBarDuration(message), ...config });
}
