import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração do Playwright para testes E2E
 * 
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // Apenas arquivos .spec.ts (ignorar .test.ts do Vitest)
  testMatch: '**/*.spec.ts',
  
  // Timeout para cada teste (30s)
  timeout: 30 * 1000,
  
  // Expect timeout (5s)
  expect: {
    timeout: 5000,
  },
  
  // Executar testes em paralelo
  fullyParallel: true,
  
  // Falhar build se houver testes pulados em CI
  forbidOnly: !!process.env.CI,
  
  // Retry: 2x em CI, 0x local
  retries: process.env.CI ? 2 : 0,
  
  // Workers: todos os CPUs em CI, metade local
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter: HTML local, GitHub Actions em CI
  reporter: process.env.CI ? 'github' : 'html',
  
  // Configurações compartilhadas
  use: {
    // Base URL para navegação relativa
    baseURL: 'http://localhost:3000',
    
    // Coletar traces apenas em falhas
    trace: 'on-first-retry',
    
    // Screenshots apenas em falhas
    screenshot: 'only-on-failure',
    
    // Video apenas em retry
    video: 'retain-on-failure',
  },

  // Projetos (browsers)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Descomentar para testar em outros browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Mobile
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Servidor de desenvolvimento
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutos para iniciar
  },
});
