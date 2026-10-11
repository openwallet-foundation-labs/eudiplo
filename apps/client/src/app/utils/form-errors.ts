import { type AbstractControl, FormControl } from '@angular/forms';

import { getApiErrorMessage, getValidationIssues } from './error-message';

/**
 * Puts each issue of a `400 Validation failed` response under the form control
 * at its path, until that field is edited, and returns the message for the
 * snackbar: what failed, and the issues no field of the form shows.
 * `controlPath` turns a request path into the form path where they differ,
 * or into null for a control the form does not show. Only an enabled field
 * shows an issue; one at a group, a list or a disabled field is listed.
 * Any other error gives {@link getApiErrorMessage}.
 */
export function showIssuesAtFields(
  form: AbstractControl,
  error: unknown,
  fallback: string,
  controlPath: (path: string) => string | null = (path) => path
): string {
  const issues = getValidationIssues(error);
  if (!issues.length) return getApiErrorMessage(error, fallback);

  const others = issues.filter(({ path, message }) => {
    const target = path ? controlPath(path) : null;
    const control = target ? form.get(target) : null;
    if (!(control instanceof FormControl) || control.disabled) return true;
    const earlier: unknown = control.getError('server');
    const server = typeof earlier === 'string' ? `${earlier}; ${message}` : message;
    control.setErrors({ ...control.errors, server });
    control.markAsTouched();
    return false;
  });

  const parts = [`${fallback}.`];
  if (others.length < issues.length) parts.push('Check the highlighted fields.');
  if (others.length) {
    parts.push(
      others.map(({ path, message }) => (path ? `${path}: ${message}` : message)).join('; ')
    );
  }
  return parts.join(' ');
}

/**
 * Message under a form field: the backend's issue for it, if any, else the
 * message of the local validator that failed.
 */
export function fieldErrorMessage(
  control: AbstractControl | null | undefined,
  localMessage = ''
): string {
  const server: unknown = control?.getError('server');
  return typeof server === 'string' ? server : localMessage;
}
