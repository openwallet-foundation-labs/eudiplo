import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Accepts an absolute `http` or `https` URL, for fields that name an endpoint
 * the backend calls. The backend's `z.url()` accepts any scheme; this check is
 * stricter on purpose. Surrounding whitespace is ignored, as the backend trims
 * it too; send the value trimmed. An empty value passes, so combine it with
 * `Validators.required`. The error key is `url`.
 */
export function httpUrlValidator(control: AbstractControl): ValidationErrors | null {
  const value = `${control.value ?? ''}`.trim();
  if (!value) return null;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol) ? null : { url: true };
  } catch {
    return { url: true };
  }
}
