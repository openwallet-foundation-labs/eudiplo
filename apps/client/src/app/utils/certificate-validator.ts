import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Reduces a certificate in base64 DER or PEM to its base64 DER body: drops the
 * PEM armor and all whitespace, as the backend does before it checks an x509
 * trusted authority. Send this instead of the raw value.
 */
export function certificateBase64(value: string): string {
  return value
    .replaceAll('-----BEGIN CERTIFICATE-----', '')
    .replaceAll('-----END CERTIFICATE-----', '')
    .replace(/\s/g, '');
}

/**
 * Accepts a certificate in base64 DER or PEM by the rule the backend applies
 * to x509 trusted authorities: after `certificateBase64`, only base64
 * characters and a length that is a multiple of 4. It does not parse the
 * certificate. An empty value passes, so combine it with
 * `Validators.required`. The error key is `certificate`.
 */
export function certificateValidator(control: AbstractControl): ValidationErrors | null {
  const value = `${control.value ?? ''}`;
  if (!value) return null;
  const base64 = certificateBase64(value);
  return base64 && /^[A-Za-z0-9+/]*={0,2}$/.test(base64) && base64.length % 4 === 0
    ? null
    : { certificate: true };
}
