import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, './tests/setup.ts')],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**'],
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'components/**/*.{ts,tsx}',
        'lib/**/*.ts',
        'app/routes/api/**/*.ts',
      ],
      exclude: [
        'node_modules/**',
        '**/*.test.{ts,tsx}',
        '**/*.config.ts',
        'components/ui/**', // shadcn components - already tested
        'tests/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
