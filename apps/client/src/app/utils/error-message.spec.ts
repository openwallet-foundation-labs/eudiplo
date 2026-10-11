import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from './error-message';

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

  it('ignores an errors field that is not a list of issues', () => {
    expect(getApiErrorMessage({ message: 'Bad Request', errors: ['plain string'] }, 'Failed')).toBe(
      'Failed: Bad Request'
    );
  });

  it('adds the validation issue to a message that already says what failed', () => {
    expect(
      getApiErrorMessage(
        { message: 'Failed to parse', errors: [{ path: 'config', message: 'Required' }] },
        'Failed to load'
      )
    ).toBe('Failed to parse (config: Required)');
  });
});
