import { createClient } from '@hey-api/openapi-ts';

const url = process.env.VAULT_URL || 'http://localhost:8200';
const token = process.env.VAULT_TOKEN || 'myroot';

createClient({
    input: {
        path: `${url}/v1/sys/internal/specs/openapi`,
        fetch: {
            headers: {
                'X-Vault-Token': token,
            },
        },
    },
    output: 'src/crypto/key/vault',
    plugins: ['@hey-api/client-fetch'],
})
    .then(() => {
        console.log('Vault client generated successfully.');
    })
    .catch((error) => {
        console.error('Error generating Vault client:', error);
    });
