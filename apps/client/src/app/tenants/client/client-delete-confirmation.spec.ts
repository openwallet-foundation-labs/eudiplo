import { describe, expect, it } from 'vitest';

import { clientDeleteConfirmation } from './client-delete-confirmation';

describe('clientDeleteConfirmation', () => {
  it('names the client and the consequence', () => {
    expect(clientDeleteConfirmation('offer-client', 'admin')).toBe(
      'Are you sure you want to delete client "offer-client"?\n\n' +
        'Services can no longer sign in with this client, but tokens already issued to it stay valid until they expire. This cannot be undone.'
    );
  });

  it('warns when the caller is signed in with the client', () => {
    expect(clientDeleteConfirmation('admin', 'admin')).toContain(
      'You are signed in with this client. Deleting it signs you out, and you cannot sign in with it again.'
    );
  });

  it('does not warn when the signed-in client is unknown', () => {
    expect(clientDeleteConfirmation('admin', undefined)).not.toContain('You are signed in');
  });
});
