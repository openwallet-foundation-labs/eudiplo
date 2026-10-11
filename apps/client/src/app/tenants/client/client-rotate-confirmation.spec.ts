import { describe, expect, it } from 'vitest';

import { clientRotateConfirmation } from './client-rotate-confirmation';

describe('clientRotateConfirmation', () => {
  it('names the client and the consequence', () => {
    expect(clientRotateConfirmation('offer-client', 'admin')).toBe(
      'Are you sure you want to rotate the secret for "offer-client"?\n\n' +
        'The current secret stops working at once, and so do tokens already issued with it. If your instance offers single sign-on (Keycloak), those tokens stay valid until they expire. Save the new secret: you cannot see it again.'
    );
  });

  it('warns when the caller is signed in with the client', () => {
    expect(clientRotateConfirmation('admin', 'admin')).toContain(
      'You are signed in with this client.'
    );
  });

  it('does not warn when the signed-in client is unknown', () => {
    expect(clientRotateConfirmation('admin', undefined)).not.toContain('You are signed in');
  });
});
