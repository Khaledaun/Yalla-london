import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      },
      include: [
        'lib/**/*.ts',
        'app/api/**/*.ts',
        'app/admin/**/*.tsx',
        'app/components/**/*.tsx'
      ],
      exclude: [
        'node_modules/**',
        'test/**',
        'e2e/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/*.d.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});