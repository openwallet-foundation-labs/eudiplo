import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { httpUrlValidator } from './http-url-validator';

function errors(value: unknown) {
  return httpUrlValidator(new FormControl(value));
}

describe('httpUrlValidator', () => {
  it('accepts absolute http and https URLs', () => {
    expect(errors('https://registrar.example/api')).toBeNull();
    expect(errors('http://127.0.0.1:8080/realms/registrar')).toBeNull();
  });

  it('ignores surrounding whitespace', () => {
    expect(errors('  https://registrar.example/api ')).toBeNull();
  });

  it('leaves an empty value to Validators.required', () => {
    expect(errors('')).toBeNull();
    expect(errors(null)).toBeNull();
  });

  it('rejects a URL without a scheme', () => {
    expect(errors('registrar.example/api')).toEqual({ url: true });
  });

  it('rejects other schemes', () => {
    expect(errors('mailto:auth@example.org')).toEqual({ url: true });
    expect(errors('ftp://registrar.example/api')).toEqual({ url: true });
  });
});
