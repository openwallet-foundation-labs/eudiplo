import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input:
    'http://localhost:3000/api-json',
  output: {
    format: 'prettier',
    lint: 'eslint',
    path: './src/api',
  },
  plugins: [
    {
      name: '@hey-api/client-angular',
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
