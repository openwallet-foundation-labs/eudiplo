import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'http://localhost:3000/api/docs-json',
  output: {
    path: './src/api',
  },
  plugins: [
    {
      name: '@hey-api/client-fetch',
      throwOnError: true,
    },
    '@hey-api/schemas',
    {
      name: '@hey-api/sdk',
    },
    {
      enums: 'javascript',
      name: '@hey-api/typescript',
    },
  ],
});
