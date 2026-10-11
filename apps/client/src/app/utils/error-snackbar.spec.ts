import type { MatSnackBar } from '@angular/material/snack-bar';
import { describe, expect, it, vi } from 'vitest';

import { errorSnackBarDuration, openErrorSnackBar } from './error-snackbar';

describe('errorSnackBarDuration', () => {
  it('keeps a short message for 5 s', () => {
    expect(errorSnackBarDuration('Failed to load keys')).toBe(5000);
  });

  it('gives a long backend reason time to be read, and keeps a longer one open', () => {
    const conflict =
      "Failed to save configuration: Tenant 'tenant' is file-managed by provisioning. " +
      'Detach it before changing it through the API or UI.';

    expect(errorSnackBarDuration(conflict)).toBe(conflict.length * 80);
    expect(errorSnackBarDuration('x'.repeat(187))).toBe(14960);
    // 0 keeps the snackbar open until it is closed.
    expect(errorSnackBarDuration('x'.repeat(188))).toBe(0);
  });
});

describe('openErrorSnackBar', () => {
  it('opens the message with the action and a matching duration', () => {
    const snackBar = { open: vi.fn() };

    openErrorSnackBar(snackBar as unknown as MatSnackBar, 'Failed to rotate key chain', 'Dismiss', {
      panelClass: ['error-snackbar'],
    });

    expect(snackBar.open).toHaveBeenCalledWith('Failed to rotate key chain', 'Dismiss', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });
  });
});
