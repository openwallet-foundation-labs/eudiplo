import { describe, expect, it } from 'vitest';

import { authControlPath } from './auth-display.util';

describe('authControlPath', () => {
  it.each([
    ['auth', 'authType'],
    ['auth.type', 'authType'],
    ['auth.config.headerName', 'authHeaderName'],
    ['auth.config.value', 'authHeaderValue'],
    ['url', 'url'],
  ])('puts an issue at %s under %s', (path, control) => {
    expect(authControlPath(path)).toBe(control);
  });
});
