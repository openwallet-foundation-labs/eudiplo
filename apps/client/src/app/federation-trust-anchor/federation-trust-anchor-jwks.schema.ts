import createFederationTrustAnchorSchemaObj from '../../../../../schemas/CreateFederationTrustAnchorDto.schema.json';

/**
 * The `jwks` member of a federation trust anchor, which the Web Client edits on its own next
 * to the form fields. Monaco matches it by the `FederationTrustAnchorJwks` file name.
 */
export const federationTrustAnchorJwksSchemaObj = {
  ...createFederationTrustAnchorSchemaObj.properties.jwks,
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://raw.githubusercontent.com/EUDIPLO/eudiplo/refs/heads/main/schemas/FederationTrustAnchorJwks.schema.json',
  title: 'FederationTrustAnchorJwks',
};
