import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import {
  asSentence,
  getApiErrorMessage,
  getHttpErrorMessage,
  getValidationIssues,
  groupUnreachable,
  joinFailures,
} from './error-message';

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
    ).toBe('Failed to save: Validation failed (oidcUrl: Invalid URL; display.0.name: Required)');
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

  it('keeps a backend message that already says what failed', () => {
    expect(
      getApiErrorMessage(
        { statusCode: 502, message: 'Failed to create access certificate' },
        'Failed to load'
      )
    ).toBe('Failed to create access certificate');
  });

  it.each([
    ['Chrome', 'Failed to fetch'],
    ['Chrome naming the host', 'Failed to fetch (localhost)'],
    ['Firefox', 'NetworkError when attempting to fetch resource.'],
    ['Safari', 'Load failed'],
    ['Safari naming the host', 'Load failed (localhost)'],
    ['Safari 16', 'The Internet connection appears to be offline.'],
  ])('says when the backend could not be reached (%s)', (_browser, message) => {
    expect(getApiErrorMessage(new TypeError(message), 'Failed to delete client')).toBe(
      'Failed to delete client: the backend could not be reached. Check the connection and try again.'
    );
  });

  it('counts only a TypeError from fetch as a network failure', () => {
    expect(getApiErrorMessage(new Error('Failed to fetch'), 'Failed to load')).toBe(
      'Failed to fetch'
    );
  });

  it.each([
    [
      "Cannot read properties of undefined (reading 'id')",
      "Failed to delete client: Cannot read properties of undefined (reading 'id')",
    ],
    [
      'Failed to fetch dynamically imported module: https://x/chunk.js',
      'Failed to fetch dynamically imported module: https://x/chunk.js',
    ],
  ])('keeps the message of a TypeError that is not a network failure: %s', (message, expected) => {
    expect(getApiErrorMessage(new TypeError(message), 'Failed to delete client')).toBe(expected);
  });

  it('shows only the title of an HTML error page', () => {
    expect(
      getApiErrorMessage(
        '<html><head><title>413 Request Entity Too Large</title></head><body><h1>413</h1></body></html>',
        'Upload failed'
      )
    ).toBe('Upload failed: 413 Request Entity Too Large');
    expect(getApiErrorMessage('<html><body>Bad Gateway</body></html>', 'Failed to load keys')).toBe(
      'Failed to load keys'
    );
  });

  it('shows a plain-text error body', () => {
    expect(getApiErrorMessage('Bad Gateway', 'Failed to load keys')).toBe(
      'Failed to load keys: Bad Gateway'
    );
  });

  it('shows the message of a 409 the SDK throws', () => {
    expect(
      getApiErrorMessage(
        {
          statusCode: 409,
          error: 'Conflict',
          message:
            "Tenant 'tenant' is file-managed by provisioning. Detach it before changing it through the API or UI.",
        },
        'Failed to save configuration'
      )
    ).toBe(
      "Failed to save configuration: Tenant 'tenant' is file-managed by provisioning. Detach it before changing it through the API or UI."
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
      'Failed to publish: Validation failed (config.tags.0: Invalid option; config.category: Invalid option)'
    );
  });

  it('names exactly three issues without counting more', () => {
    const errors = ['a', 'b', 'c'].map((path) => ({ path: [path], message: 'Required' }));

    expect(getApiErrorMessage({ message: 'Validation failed', errors }, 'Failed to save')).toBe(
      'Failed to save: Validation failed (a: Required; b: Required; c: Required)'
    );
  });

  it('names every issue for a form that shows none at a field', () => {
    const errors = ['a', 'b', 'c', 'd'].map((path) => ({ path: [path], message: 'Required' }));

    expect(
      getApiErrorMessage({ message: 'Validation failed', errors }, 'Failed to save', {
        allIssues: true,
      })
    ).toBe(
      'Failed to save: Validation failed (a: Required; b: Required; c: Required; d: Required)'
    );
  });

  it('names three issues and counts the rest', () => {
    const errors = ['a', 'b', 'c', 'd', 'e'].map((path) => ({ path: [path], message: 'Required' }));

    expect(getApiErrorMessage({ message: 'Validation failed', errors }, 'Failed to save')).toBe(
      'Failed to save: Validation failed (a: Required; b: Required; c: Required; 2 more)'
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

describe('asSentence', () => {
  it('ends the message with one period', () => {
    expect(asSentence('Could not load trust lists: Use a tenant-bound account.')).toBe(
      'Could not load trust lists: Use a tenant-bound account.'
    );
    expect(asSentence('Could not load trust lists')).toBe('Could not load trust lists.');
  });
});

describe('groupUnreachable', () => {
  const unreachable = new TypeError('Failed to fetch');
  const forbidden = { statusCode: 403, message: 'Forbidden resource' };
  const describeLoad = (labels: string) => `Could not load ${labels}`;

  it('names every call the backend did not answer in one message', () => {
    expect(
      groupUnreachable(
        [
          { label: 'key chains', error: unreachable },
          { label: 'trust lists', error: forbidden },
          { label: 'credential configs', error: new TypeError('Load failed') },
          { label: 'registrar config', error: unreachable },
        ],
        describeLoad
      )
    ).toEqual({
      unreachable:
        'Could not load key chains, credential configs, and registrar config: ' +
        'the backend could not be reached. Check the connection and try again.',
      other: [{ label: 'trust lists', error: forbidden }],
    });
  });

  it('names a single call without a list', () => {
    expect(groupUnreachable([{ label: 'trust lists', error: unreachable }], describeLoad)).toEqual({
      unreachable:
        'Could not load trust lists: the backend could not be reached. Check the connection and try again.',
      other: [],
    });
  });

  it('keeps every failure when the backend answered them all', () => {
    const failures = [
      { label: 'key chains', error: forbidden },
      {
        label: 'trust lists',
        error: new TypeError("Cannot read properties of undefined (reading 'id')"),
      },
    ];

    expect(groupUnreachable(failures, describeLoad)).toEqual({
      unreachable: undefined,
      other: failures,
    });
  });
});

describe('joinFailures', () => {
  const reason = ({ label, error }: { label: string; error: unknown }) =>
    `${label}: ${(error as { message: string }).message}`;

  it('gives the reasons of the backend first and the unreachable calls once, last', () => {
    expect(
      joinFailures(
        [
          { label: 'a', error: new TypeError('Failed to fetch') },
          { label: 'b', error: { statusCode: 404, message: 'Not found' } },
          { label: 'c', error: new TypeError('Failed to fetch') },
        ],
        reason,
        (labels) => labels
      )
    ).toBe(
      'b: Not found; a and c: the backend could not be reached. Check the connection and try again.'
    );
  });

  it('joins only the reasons when the backend answered every call', () => {
    expect(
      joinFailures(
        [
          { label: 'a', error: { message: 'Forbidden resource' } },
          { label: 'b', error: { message: 'Not found' } },
        ],
        reason,
        (labels) => labels
      )
    ).toBe('a: Forbidden resource; b: Not found');
  });
});
