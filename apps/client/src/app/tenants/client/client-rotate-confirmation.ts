/**
 * Question to confirm before a client's secret is rotated. It tells a caller
 * signed in with that client that their session moves to the new secret.
 */
export function clientRotateConfirmation(clientId: string, signedInClientId?: string): string {
  const paragraphs = [
    `Are you sure you want to rotate the secret for "${clientId}"?`,
    'The current secret stops working at once, and so do tokens already issued with it. If your instance offers single sign-on (Keycloak), those tokens stay valid until they expire. Save the new secret: you cannot see it again.',
  ];
  if (clientId === signedInClientId) {
    paragraphs.push(
      'You are signed in with this client. Your session continues with the new secret, which this browser does not store: after a reload, you need the new secret to log in again once the session expires.'
    );
  }
  return paragraphs.join('\n\n');
}
