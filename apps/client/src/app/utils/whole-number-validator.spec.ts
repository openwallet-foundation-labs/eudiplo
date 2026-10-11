import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { wholeNumberValidator } from './whole-number-validator';

function errors(value: unknown) {
  return wholeNumberValidator(new FormControl(value));
}

describe('wholeNumberValidator', () => {
  it('accepts whole numbers', () => {
    expect(errors(3600)).toBeNull();
    expect(errors(0)).toBeNull();
  });

  it('leaves an empty value to Validators.required', () => {
    expect(errors(null)).toBeNull();
    expect(errors('')).toBeNull();
  });

  it('rejects decimals', () => {
    expect(errors(1.5)).toEqual({ integer: true });
  });
});
