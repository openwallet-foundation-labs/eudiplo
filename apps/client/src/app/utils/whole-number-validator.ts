import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Accepts a whole number, for fields the backend validates with `.int()`.
 * An empty value passes, so combine it with `Validators.required` where the
 * field must be set. The error key is `integer`.
 */
export function wholeNumberValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === '') return null;
  return Number.isInteger(value) ? null : { integer: true };
}
