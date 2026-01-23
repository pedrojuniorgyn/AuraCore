import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // E14.6: Configuração de pool para evitar worker memory crashes
    pool: 'forks',
    poolOptions: {
      forks: {
        // Limitar workers para reduzir consumo de memória
        maxForks: 4,
        minForks: 1,
        // Isolar cada arquivo de teste para evitar memory leaks
        isolate: true,
      },
    },
    // Timeout configurado para operações longas
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/modules/**/*.ts', 'src/shared/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/index.ts', '**/node_modules/**'],
      thresholds: {
        global: { branches: 80, functions: 80, lines: 80, statements: 80 }
      }
    },
    include: [
      'tests/**/*.{test,spec}.{ts,tsx}',
      'src/**/*.{test,spec}.{ts,tsx}'
    ],
    exclude: [
      'node_modules/**',
      '**/node_modules/**',
      'mcp-server/node_modules/**',
      '.next/**',
      'dist/**'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@shared': path.resolve(__dirname, './src/shared')
    }
  }
});

