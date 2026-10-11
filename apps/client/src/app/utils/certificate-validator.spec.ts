import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { certificateBase64, certificateValidator } from './certificate-validator';

function errors(value: unknown) {
  return certificateValidator(new FormControl(value));
}

const pem = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJ
AKHHIgKwA4jA
-----END CERTIFICATE-----
`;

describe('certificateValidator', () => {
  it('accepts base64 DER, with or without line breaks', () => {
    expect(errors('MIIBkTCB+wIJAKHHIgKwA4jA')).toBeNull();
    expect(errors('MIIBkTCB+wIJ\nAKHHIgKwA4jA')).toBeNull();
    expect(errors('MIIBkQ==')).toBeNull();
  });

  it('accepts PEM', () => {
    expect(errors(pem)).toBeNull();
  });

  it('leaves an empty value to Validators.required', () => {
    expect(errors('')).toBeNull();
    expect(errors(null)).toBeNull();
  });

  it('rejects characters outside base64', () => {
    expect(errors('not a certificate')).toEqual({ certificate: true });
    expect(errors('MIIB-kTCB')).toEqual({ certificate: true });
  });

  it('rejects a length that is not a multiple of 4', () => {
    expect(errors('MIIBkTC')).toEqual({ certificate: true });
  });

  it('rejects a value that is only whitespace or PEM armor', () => {
    expect(errors('   ')).toEqual({ certificate: true });
    expect(errors('-----BEGIN CERTIFICATE-----\n-----END CERTIFICATE-----')).toEqual({
      certificate: true,
    });
  });
});

describe('certificateBase64', () => {
  it('drops the PEM armor and whitespace', () => {
    expect(certificateBase64(pem)).toBe('MIIBkTCB+wIJAKHHIgKwA4jA');
    expect(certificateBase64(' MIIBkTCB\n+wIJ ')).toBe('MIIBkTCB+wIJ');
  });
});
