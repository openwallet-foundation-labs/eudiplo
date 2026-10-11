import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { registrarBaseUrlValidator } from './registrar-url.validator';

describe('registrarBaseUrlValidator', () => {
  const check = (value: string) => registrarBaseUrlValidator(new FormControl(value));

  it('accepts http(s) base URLs', () => {
    expect(check('https://sandbox.eudi-wallet.org/api')).toBeNull();
    expect(check('http://keycloak:8080/realms/registrar')).toBeNull();
  });

  it('rejects a query, a fragment or credentials', () => {
    expect(check('https://registrar.example/api?')).toEqual({ registrarBaseUrl: true });
    expect(check('https://auth.example/realms/x#/')).toEqual({ registrarBaseUrl: true });
    expect(check('https://user:secret@registrar.example')).toEqual({ registrarBaseUrl: true });
  });

  it('leaves empty values, non-URLs and other schemes to the other validators', () => {
    expect(check('')).toBeNull();
    expect(check('registrar.example')).toBeNull();
    expect(check('ftp://registrar.example')).toBeNull();
  });
});
