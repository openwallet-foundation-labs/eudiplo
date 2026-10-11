import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * The backend appends API and OIDC paths to the registrar and OIDC URLs, so
 * both must be http(s) base URLs: no query, no fragment (not even a trailing
 * `?` or `#`) and no credentials. Mirrors the backend rule.
 */
export function registrarBaseUrlValidator(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (typeof value !== 'string' || value === '') return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { registrarBaseUrl: true };
  }
  const valid =
    (url.protocol === 'https:' || url.protocol === 'http:') &&
    url.username === '' &&
    url.password === '' &&
    !value.includes('?') &&
    !value.includes('#');
  return valid ? null : { registrarBaseUrl: true };
}
