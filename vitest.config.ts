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
      lines: 50,        // Target 50% line coverage initially
      functions: 50,
      branches: 50,
      statements: 50,
    },

    // Test file patterns
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules/', 'dist/', '.mastra/'],

    // Timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,

    // Output
    reporters: ['verbose'],
  },
});
