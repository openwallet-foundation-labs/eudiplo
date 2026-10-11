import type { FormGroup } from '@angular/forms';

export function getApiKeyAuthType(auth?: { type?: string }): string {
  return auth?.type === 'apiKey' ? 'API Key' : 'None';
}

export interface AuthFormValue {
  authType: 'apiKey' | 'none';
  authHeaderName: string;
  authHeaderValue: string;
}

export function buildAuthConfig(
  auth: AuthFormValue
): { type: 'apiKey'; config: { headerName: string; value: string } } | { type: 'none' } {
  return auth.authType === 'apiKey'
    ? {
        type: 'apiKey',
        config: {
          headerName: auth.authHeaderName,
          value: auth.authHeaderValue,
        },
      }
    : { type: 'none' };
}

export function toAuthFormValue(auth?: {
  type?: string;
  config?: { headerName?: string; value?: string };
}): AuthFormValue {
  return {
    authType: auth?.type === 'apiKey' ? 'apiKey' : 'none',
    authHeaderName: auth?.type === 'apiKey' ? auth?.config?.headerName || '' : '',
    authHeaderValue: auth?.type === 'apiKey' ? auth?.config?.value || '' : '',
  };
}

export function getApiKeyHeaderName(auth?: {
  type?: string;
  config?: { headerName?: string };
}): string | null {
  if (auth?.type === 'apiKey') {
    return auth.config?.headerName || null;
  }

  return null;
}

/** The auth form control for a request path the backend names in a validation issue. */
export function authControlPath(path: string): string {
  const controls: Record<string, string> = {
    auth: 'authType',
    'auth.type': 'authType',
    'auth.config.headerName': 'authHeaderName',
    'auth.config.value': 'authHeaderValue',
  };
  return controls[path] ?? path;
}

/**
 * Clears the backend's issues of the header fields when the auth type changes,
 * so a field that is hidden now does not keep Save disabled.
 */
export function clearAuthFieldIssuesOnTypeChange(form: FormGroup): void {
  form.get('authType')!.valueChanges.subscribe(() => {
    for (const name of ['authHeaderName', 'authHeaderValue']) {
      form.get(name)?.updateValueAndValidity();
    }
  });
}
