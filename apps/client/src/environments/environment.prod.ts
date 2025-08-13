export const environment = {
  production: true,
  oidc: {
    oidcUrl: 'https://your-keycloak-prod.com/auth/realms/your-realm/protocol/openid-connect/token',
    clientId: 'your-prod-client-id',
    clientSecret: 'your-prod-client-secret',
  },
  api: {
    baseUrl: 'https://your-api-prod.com',
  },
};
