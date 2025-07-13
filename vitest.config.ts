import { resolve } from 'path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        root: './',
        coverage: {
            provider: 'v8',
            reporter: ['json'],
            reportsDirectory: './coverage',
            exclude: [
                'node_modules/',
                'test/',
                'dist/',
                '**/*.d.ts',
                '**/*.config.ts',
                '**/*.config.js',
                'src/main.ts',
            ],
            include: ['src/**/*.ts'],
            thresholds: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80,
                },
            },
        },
    },
    plugins: [
        // This is required to build the test files with SWC
        swc.vite({
            // Explicitly set the module type to avoid inheriting this value from a `.swcrc` config file
            module: { type: 'es6' },
        }),
    ],
    resolve: {
        alias: {
            // Ensure Vitest correctly resolves TypeScript path aliases
            src: resolve(__dirname, './src'),
        },
    },
});
