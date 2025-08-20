import { AbstractControl, ValidationErrors } from '@angular/forms';
import Ajv from 'ajv';

export function jsonSchemaValidatorFactory(schema: object) {
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    try {
      const json = typeof value === 'string' ? JSON.parse(value) : value;
      const valid = validate(json);
      return valid ? null : { invalidSchema: ajv.errorsText(validate.errors) };
    } catch {
      return { invalidJson: true };
    }
  };
}
