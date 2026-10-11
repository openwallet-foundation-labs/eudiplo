import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { fieldErrorMessage, showIssuesAtFields } from './form-errors';

function form() {
  return new FormGroup({
    url: new FormControl('http://example.com', Validators.required),
    authHeaderName: new FormControl(''),
    entities: new FormArray([new FormGroup({ infoName: new FormControl('Example') })]),
  });
}

function rejected(...issues: { path: (string | number)[]; message: string }[]) {
  return { statusCode: 400, message: 'Validation failed', errors: issues };
}

describe('showIssuesAtFields', () => {
  it('puts each issue under its field until the field is edited', () => {
    const group = form();

    const message = showIssuesAtFields(
      group,
      rejected(
        { path: ['url'], message: 'Must be an https URL' },
        { path: ['entities', 0, 'info', 'name'], message: 'Too long' }
      ),
      'Failed to save trust list',
      (path) => path.replace(/^entities\.(\d+)\.info\.name$/, 'entities.$1.infoName')
    );

    expect(message).toBe('Failed to save trust list. Check the highlighted fields.');
    expect(fieldErrorMessage(group.get('url'), 'URL is required')).toBe('Must be an https URL');
    expect(group.get('url')?.touched).toBe(true);
    expect(fieldErrorMessage(group.get('entities.0.infoName'))).toBe('Too long');

    group.get('url')?.setValue('https://example.com');
    expect(group.get('url')?.valid).toBe(true);
  });

  it('lists the issues no field shows', () => {
    const group = form();
    const message = showIssuesAtFields(
      group,
      rejected(
        { path: ['url'], message: 'Must be an https URL' },
        { path: ['auth', 'type'], message: 'Invalid option' },
        { path: ['authHeaderName'], message: 'Required' },
        { path: [], message: 'Unrecognized key: "extra"' }
      ),
      'Failed to create webhook endpoint',
      // As if the header name field were hidden.
      (path) => (path === 'authHeaderName' ? null : path)
    );

    expect(message).toBe(
      'Failed to create webhook endpoint. Check the highlighted fields. ' +
        'auth.type: Invalid option; authHeaderName: Required; Unrecognized key: "extra"'
    );
    expect(group.get('authHeaderName')?.errors).toBeNull();
  });

  it('lists issues at a group, a list or a disabled field instead of claiming to highlight them', () => {
    const group = form();
    group.get('url')?.disable();

    const message = showIssuesAtFields(
      group,
      rejected(
        { path: ['entities'], message: 'At least one entity' },
        { path: ['entities', 0], message: 'Unrecognized key: "extra"' },
        { path: ['url'], message: 'Must be an https URL' }
      ),
      'Failed to save trust list'
    );

    expect(message).toBe(
      'Failed to save trust list. entities: At least one entity; ' +
        'entities.0: Unrecognized key: "extra"; url: Must be an https URL'
    );
  });

  it('gives the usual message for other errors', () => {
    expect(
      showIssuesAtFields(form(), { statusCode: 409, message: 'Already exists' }, 'Failed to save')
    ).toBe('Failed to save: Already exists');
  });
});

describe('fieldErrorMessage', () => {
  it("prefers the backend's issue over the local message", () => {
    const control = new FormControl('', Validators.required);

    expect(fieldErrorMessage(control, 'URL is required')).toBe('URL is required');
    control.setErrors({ server: 'Must be an https URL' });
    expect(fieldErrorMessage(control, 'URL is required')).toBe('Must be an https URL');
  });

  it('keeps every issue at the same field', () => {
    const group = form();

    showIssuesAtFields(
      group,
      rejected(
        { path: ['url'], message: 'Must be an https URL' },
        { path: ['url'], message: 'Must not point to a private address' }
      ),
      'Failed to save'
    );

    expect(fieldErrorMessage(group.get('url'))).toBe(
      'Must be an https URL; Must not point to a private address'
    );
  });
});
