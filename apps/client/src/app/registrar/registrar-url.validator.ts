import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * The backend appends API and OIDC paths to the registrar and OIDC URLs, so
 * both must be base URLs: no query, no fragment (not even a trailing `?` or
 * `#`) and no credentials. Mirrors the backend rule. A value that is not an
 * absolute http(s) URL passes; `httpUrlValidator` reports it. The error key
 * is `registrarBaseUrl`.
 */
export function registrarBaseUrlValidator(control: AbstractControl): ValidationErrors | null {
  const value = `${control.value ?? ''}`.trim();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const valid =
    url.username === '' && url.password === '' && !value.includes('?') && !value.includes('#');
  return valid ? null : { registrarBaseUrl: true };
}
