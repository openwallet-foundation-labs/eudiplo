import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { getApiErrorMessage, getHttpErrorMessage, getValidationIssues } from './error-message';

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

  it('names no field when the path is not a list', () => {
    expect(getValidationIssues({ errors: [{ path: 'config', message: 'Required' }] })).toEqual([
      { path: '', message: 'Required' },
    ]);
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

  it('names the first field a 400 response rejected', () => {
    expect(
      getHttpErrorMessage(
        badRequest([
          { path: ['oidcUrl'], message: 'Invalid URL', code: 'invalid_format' },
          { path: ['display', 0, 'name'], message: 'Required', code: 'invalid_type' },
        ]),
        'Failed to save'
      )
    ).toBe('Failed to save: Validation failed (oidcUrl: Invalid URL; 1 more)');
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

describe('getApiErrorMessage', () => {
  it('prefixes the backend message with the fallback', () => {
    expect(getApiErrorMessage({ statusCode: 403, message: 'Forbidden resource' }, 'Failed')).toBe(
      'Failed: Forbidden resource'
    );
  });

  it('returns the fallback when the error carries no message', () => {
    expect(getApiErrorMessage({}, 'Failed to load')).toBe('Failed to load');
    expect(getApiErrorMessage(undefined, 'Failed to load')).toBe('Failed to load');
  });

  it('keeps a message that already says what failed', () => {
    expect(getApiErrorMessage(new Error('Failed to fetch'), 'Failed to load')).toBe(
      'Failed to fetch'
    );
  });

  it('names the field of the first validation issue', () => {
    const error = {
      statusCode: 400,
      message: 'Validation failed',
      errors: [
        { path: ['config', 'tags', 0], message: 'Invalid option', code: 'invalid_value' },
        { path: ['config', 'category'], message: 'Invalid option', code: 'invalid_value' },
      ],
    };

    expect(getApiErrorMessage(error, 'Failed to publish')).toBe(
      'Failed to publish: Validation failed (config.tags.0: Invalid option; 1 more)'
    );
  });

  it('shows a validation issue without a path and without a top-level message', () => {
    expect(
      getApiErrorMessage({ errors: [{ path: [], message: 'Required', code: 'custom' }] }, 'Failed')
    ).toBe('Failed: Required');
  });

  it('counts only issues with a message as more', () => {
    expect(
      getApiErrorMessage(
        { message: 'Validation failed', errors: [{ path: ['a'], message: 'Required' }, 'junk'] },
        'Failed'
      )
    ).toBe('Failed: Validation failed (a: Required)');
  });

  it('ignores an errors field that is not a list of issues', () => {
    expect(getApiErrorMessage({ message: 'Bad Request', errors: ['plain string'] }, 'Failed')).toBe(
      'Failed: Bad Request'
    );
  });

  it('adds the validation issue to a message that already says what failed', () => {
    expect(
      getApiErrorMessage(
        { message: 'Failed to parse', errors: [{ path: ['config'], message: 'Required' }] },
        'Failed to load'
      )
    ).toBe('Failed to parse (config: Required)');
  });
});
