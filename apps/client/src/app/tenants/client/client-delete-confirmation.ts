/**
 * Question to confirm before a client is deleted. It warns when the caller is
 * signed in with that client, because deleting it ends the caller's own access.
 */
export function clientDeleteConfirmation(clientId: string, signedInClientId?: string): string {
  const paragraphs = [
    `Are you sure you want to delete client "${clientId}"?`,
    'Services can no longer sign in with this client, and tokens already issued to it stop working unless a client with this ID is created again. If your instance offers single sign-on (Keycloak), those tokens stay valid until they expire. This cannot be undone.',
  ];
  if (clientId === signedInClientId) {
    paragraphs.push(
      'You are signed in with this client. Deleting it signs you out, and you cannot sign in with it again.'
    );
  }
  return paragraphs.join('\n\n');
}
