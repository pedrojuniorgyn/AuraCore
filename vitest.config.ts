import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Configuração Vitest para AuraCore
 * 
 * E14.6-FIX: Otimização de memória para grande codebase (2600+ testes)
 * 
 * IMPORTANTE: O Vitest 4 com Node.js 25+ pode apresentar erro de worker OOM
 * durante cleanup após a execução de todos os testes. Este é um problema 
 * conhecido que afeta apenas o encerramento, não os resultados dos testes.
 * 
 * Configuração aplicada:
 * - NODE_OPTIONS='--max-old-space-size=8192' no package.json
 * - Timeouts aumentados para operações longas
 * 
 * Se o CI/CD falhar por worker OOM com todos os testes passando,
 * considerar: dividir testes em grupos ou atualizar Vitest.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // E14.6-FIX: Timeouts para operações longas
    testTimeout: 30000,
    hookTimeout: 30000,
    // E13.1-FIX: Pool forks. Memória via NODE_OPTIONS no package.json (--max-old-space-size=8192)
    pool: 'forks',
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
      'dist/**',
      // E2E tests use Playwright - must be run via playwright test, not vitest
      'tests/e2e/**',
    ]
  },
  resolve: {
    alias: [
      // Mais específico primeiro: @/tests antes de @
      { find: '@/tests', replacement: path.resolve(__dirname, './tests') },
      { find: '@tests', replacement: path.resolve(__dirname, './tests') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: '@modules', replacement: path.resolve(__dirname, './src/modules') },
      { find: '@shared', replacement: path.resolve(__dirname, './src/shared') },
    ]
  }
});

