import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Environment setup
    environment: 'node',
    globals: true,
    setupFiles: [path.resolve(__dirname, 'src/__tests__/setup.ts')],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '.mastra/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },

    // Test file patterns
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules/', 'dist/', '.mastra/'],

    // Timeout configuration (integration tests may need longer)
    testTimeout: 15000,
    hookTimeout: 15000,

    // Output
    reporters: ['verbose'],
  },
});
