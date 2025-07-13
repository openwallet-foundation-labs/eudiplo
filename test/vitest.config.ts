import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['**/*.e2e-spec.ts'],
        globals: true,
        root: './',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            reportsDirectory: './coverage-e2e',
            exclude: [
                'node_modules/',
                'test/',
                'dist/',
                '**/*.d.ts',
                '**/*.config.ts',
                '**/*.config.js',
                '**/main.ts',
            ],
            include: ['**/src/**/*.ts'],
            all: true,
        },
    },
    plugins: [swc.vite()],
});
