import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { getHttpErrorMessage, getValidationIssues } from './error-message';

function badRequest(errors: unknown) {
  return new HttpErrorResponse({
    status: 400,
    error: { statusCode: 400, message: 'Validation failed', errors },
  });
}

describe('getValidationIssues', () => {
  it('returns the path and message of each issue', () => {
    expect(
      getValidationIssues(
        badRequest([
          { path: ['oidcUrl'], message: 'Invalid URL', code: 'invalid_format' },
          { path: ['display', 0, 'name'], message: 'Required', code: 'invalid_type' },
        ])
      )
    ).toEqual([
      { path: 'oidcUrl', message: 'Invalid URL' },
      { path: 'display.0.name', message: 'Required' },
    ]);
  });

  it('gives an empty path for an issue of the body itself', () => {
    expect(
      getValidationIssues(
        badRequest([{ path: [], message: 'Unrecognized key: "extra"', code: 'unrecognized_keys' }])
      )
    ).toEqual([{ path: '', message: 'Unrecognized key: "extra"' }]);
  });

  it('reads the response body the SDK throws', () => {
    expect(
      getValidationIssues({
        statusCode: 400,
        message: 'Validation failed',
        errors: [{ path: ['id'], message: 'Required', code: 'invalid_type' }],
      })
    ).toEqual([{ path: 'id', message: 'Required' }]);
  });

  it('drops issues without a message', () => {
    expect(getValidationIssues(badRequest([{ path: ['a'] }, null, 'text']))).toEqual([]);
  });

  it('returns nothing for other errors', () => {
    expect(getValidationIssues(badRequest(undefined))).toEqual([]);
    expect(
      getValidationIssues(new HttpErrorResponse({ status: 400, error: { message: 'Bad' } }))
    ).toEqual([]);
    expect(getValidationIssues(new Error('network'))).toEqual([]);
    expect(getValidationIssues(null)).toEqual([]);
  });
});

describe('getHttpErrorMessage', () => {
  it("prefers the backend's message", () => {
    expect(
      getHttpErrorMessage(
        new HttpErrorResponse({
          status: 403,
          statusText: 'Forbidden',
          error: { statusCode: 403, message: 'Forbidden resource' },
        }),
        'Failed to delete configuration'
      )
    ).toBe('Failed to delete configuration: Forbidden resource');
  });

  it('says when the backend could not be reached', () => {
    expect(getHttpErrorMessage(new HttpErrorResponse({ status: 0 }), 'Failed to save')).toBe(
      'Failed to save: the backend could not be reached. Check the connection and try again.'
    );
  });

  it("falls back to Angular's message, which names the status", () => {
    expect(
      getHttpErrorMessage(
        new HttpErrorResponse({ status: 502, statusText: 'Bad Gateway', error: '<html>' }),
        'Failed to load'
      )
    ).toContain('502 Bad Gateway');
  });
});
