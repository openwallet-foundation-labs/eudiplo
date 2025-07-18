// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            'eslint.config.mjs',
            'src/registrar/generated/*',
            'test/webhook/.wrangler/*',
            'test/webhook/node_modules/*',
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
            },
            sourceType: 'commonjs',
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-floating-promises': 'warn',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            // Enforce relative imports - prevent absolute imports from src directory
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                'src/*',
                                'app/*',
                                'auth/*',
                                'crypto/*',
                                'database/*',
                                'health/*',
                                'issuer/*',
                                'registrar/*',
                                'session/*',
                                'utils/*',
                                'verifier/*',
                                'well-known/*',
                            ],
                            message:
                                'Use relative imports instead of absolute imports. Use "./relative/path" or "../relative/path".',
                        },
                    ],
                },
            ],
        },
    },
);
