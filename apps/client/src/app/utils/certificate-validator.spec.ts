import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { certificateBase64, certificateValidator } from './certificate-validator';
import {
  OTHER_TEST_ROOT_CERTIFICATE_PEM,
  pemToBase64Der,
  TEST_ROOT_CERTIFICATE_PEM,
} from './certificate-validator.testing';

function errors(value: unknown) {
  return certificateValidator(new FormControl(value));
}

const root = pemToBase64Der(TEST_ROOT_CERTIFICATE_PEM);
const other = pemToBase64Der(OTHER_TEST_ROOT_CERTIFICATE_PEM);

function bytes(base64: string): number[] {
  return [...atob(base64)].map((c) => c.charCodeAt(0));
}

function base64(values: number[]): string {
  return btoa(String.fromCharCode(...values));
}

describe('certificateValidator', () => {
  it('accepts one certificate in base64 DER, with or without line breaks', () => {
    expect(errors(root)).toBeNull();
    expect(errors(other)).toBeNull();
    expect(errors(` ${root.replace(/.{64}/g, '$&\n')}\n`)).toBeNull();
  });

  it('accepts one PEM certificate', () => {
    expect(errors(TEST_ROOT_CERTIFICATE_PEM)).toBeNull();
    expect(errors(`\r\n${OTHER_TEST_ROOT_CERTIFICATE_PEM.replaceAll('\n', '\r\n')}`)).toBeNull();
  });

  it('leaves an empty value to Validators.required', () => {
    expect(errors('')).toBeNull();
    expect(errors(null)).toBeNull();
  });

  it('counts the certificates of a PEM chain, padded or not', () => {
    expect(errors(TEST_ROOT_CERTIFICATE_PEM + OTHER_TEST_ROOT_CERTIFICATE_PEM)).toEqual({
      multipleCertificates: { count: 2 },
    });
    expect(errors(`${OTHER_TEST_ROOT_CERTIFICATE_PEM}\n${TEST_ROOT_CERTIFICATE_PEM}`)).toEqual({
      multipleCertificates: { count: 2 },
    });
    expect(
      errors(
        TEST_ROOT_CERTIFICATE_PEM + OTHER_TEST_ROOT_CERTIFICATE_PEM + TEST_ROOT_CERTIFICATE_PEM
      )
    ).toEqual({ multipleCertificates: { count: 3 } });
  });

  it('counts certificates whose DER is written one after the other', () => {
    expect(errors(base64([...bytes(other), ...bytes(root)]))).toEqual({
      multipleCertificates: { count: 2 },
    });
    // Base64 joined without padding in between decodes to the same.
    expect(errors(root + other)).toEqual({ multipleCertificates: { count: 2 } });
  });

  it.each([
    ['whitespace', '   '],
    ['PEM armor without a body', '-----BEGIN CERTIFICATE-----\n-----END CERTIFICATE-----'],
    ['base64url characters', root.replaceAll('+', '-').replaceAll('/', '_')],
    ['a length that is not a multiple of 4', `${root}A`],
    ['base64 that is not DER', btoa('root certificate')],
    ['a truncated certificate', base64(bytes(root).slice(0, 300))],
    ['a certificate followed by one byte', base64([...bytes(root), 0x30])],
    ['a certificate followed by other bytes', base64([...bytes(root), 0x05, 0x00])],
    ['a DER SEQUENCE that is not a certificate', base64([0x30, 0x03, 0x02, 0x01, 0x01])],
    [
      'a certificate with a fourth field',
      base64([0x30, 0x82, 0x01, 0x72, ...bytes(root).slice(4), 0x05, 0x00]),
    ],
    ['an indefinite length', base64([0x30, 0x06, 0x30, 0x80, 0x30, 0x00, 0x03, 0x00])],
    [
      'more than four length bytes',
      base64([0x30, 0x85, 0, 0, 0, 1, 0x70, ...bytes(root).slice(4)]),
    ],
    ['padded base64 followed by more base64', other + root],
    ['text around a PEM block', `subject=CN = Test Root 2\n${TEST_ROOT_CERTIFICATE_PEM}`],
    [
      'a PEM block that is not closed',
      `${TEST_ROOT_CERTIFICATE_PEM}-----BEGIN CERTIFICATE-----\n${other}`,
    ],
    [
      'a PEM block of another type',
      TEST_ROOT_CERTIFICATE_PEM.replaceAll('CERTIFICATE', 'PUBLIC KEY'),
    ],
  ])('rejects %s', (_, value) => {
    expect(errors(value)).toEqual({ certificate: true });
  });

  it('stays fast on many PEM markers without an end', () => {
    const started = performance.now();

    expect(errors('-----BEGIN CERTIFICATE-----'.repeat(40_000))).toEqual({ certificate: true });
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe('certificateBase64', () => {
  it('reduces one certificate to its base64 DER', () => {
    expect(certificateBase64(TEST_ROOT_CERTIFICATE_PEM)).toBe(root);
    expect(certificateBase64(` ${other.replace(/.{64}/g, '$&\n')} `)).toBe(other);
  });

  it('leaves a value that is not a certificate to the backend', () => {
    expect(certificateBase64('not a certificate')).toBe('not a certificate');
  });
});
