import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['**/*.e2e-spec.ts'],
        environment: 'node',
        globals: true, // optional: enables Jest-style globals like `describe`, `expect`
    },
});
