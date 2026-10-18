/**
 * Asks before deleting a key chain. The backend refuses to delete a key chain that a
 * configuration names and says which ones, so the question says so instead of listing them
 * itself. Configurations that name no key chain use the default of the usage type, which the
 * backend does not count, so the question warns about them.
 */
export function keyChainDeleteQuestion(id: string, description?: string): string {
  const name = description ? `"${description}" (${id})` : `"${id}"`;
  return (
    `Delete key chain ${name}? If a configuration names it, the delete is refused and the` +
    ' configurations are named. Configurations that name no key chain switch to another key' +
    ' chain of this usage type, or fail if there is none. This cannot be undone.'
  );
}
