import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.mastra/**',
      'scripts/**',
      '*.config.js',
      '*.config.ts',
      '**/coverage/**',
    ],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-explicit-any': 'off', // Disabled: existing codebase uses any in some places
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // General rules
      'no-console': 'off', // Allow console for logging
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
];

