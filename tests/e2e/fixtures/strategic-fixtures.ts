/**
 * Strategic Module E2E Test Fixtures
 * 
 * Provides reusable test fixtures, authentication, and test data
 * for the Strategic module E2E tests.
 * 
 * @module e2e/fixtures/strategic-fixtures
 * @since E9 - Strategic Module E2E Tests
 */

/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, type Page } from '@playwright/test';
import { 
  DashboardPage, 
  KpisPage, 
  ActionPlansPage, 
  ReportsPage,
  PdcaPage,
  IntegrationsPage,
  GoalsPage,
} from '../pages/strategic-pages';

// ============================================================================
// Types
// ============================================================================

type StrategicFixtures = {
  /** Dashboard page object */
  dashboardPage: DashboardPage;
  /** KPIs page object */
  kpisPage: KpisPage;
  /** Action Plans page object */
  actionPlansPage: ActionPlansPage;
  /** Reports page object */
  reportsPage: ReportsPage;
  /** PDCA page object */
  pdcaPage: PdcaPage;
  /** Integrations page object */
  integrationsPage: IntegrationsPage;
  /** Goals page object */
  goalsPage: GoalsPage;
  /** Authenticated page fixture */
  authenticatedPage: Page;
};

// ============================================================================
// Authentication Helper
// ============================================================================

async function authenticateUser(page: Page): Promise<void> {
  // Navigate to login
  await page.goto('/auth/signin');
  
  // Wait for form to load
  await page.waitForSelector('input[name="email"], input[type="email"]', { 
    state: 'visible',
    timeout: 10000,
  });
  
  // Fill credentials
  const email = process.env.TEST_USER_EMAIL || 'test@auracore.com';
  const password = process.env.TEST_USER_PASSWORD || 'testpassword123';
  
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard or main page
  await page.waitForURL(/.*\/(dashboard|strategic).*/, { timeout: 15000 });
}

// ============================================================================
// Extended Test with Fixtures
// ============================================================================

export const test = base.extend<StrategicFixtures>({
  // Authenticated page - performs login before each test
  authenticatedPage: async ({ page }, use) => {
    await authenticateUser(page);
    await use(page);
  },

  // Dashboard Page Object
  dashboardPage: async ({ page }, use) => {
    await authenticateUser(page);
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  // KPIs Page Object
  kpisPage: async ({ page }, use) => {
    await authenticateUser(page);
    const kpisPage = new KpisPage(page);
    await use(kpisPage);
  },

  // Action Plans Page Object
  actionPlansPage: async ({ page }, use) => {
    await authenticateUser(page);
    const actionPlansPage = new ActionPlansPage(page);
    await use(actionPlansPage);
  },

  // Reports Page Object
  reportsPage: async ({ page }, use) => {
    await authenticateUser(page);
    const reportsPage = new ReportsPage(page);
    await use(reportsPage);
  },

  // PDCA Page Object
  pdcaPage: async ({ page }, use) => {
    await authenticateUser(page);
    const pdcaPage = new PdcaPage(page);
    await use(pdcaPage);
  },

  // Integrations Page Object
  integrationsPage: async ({ page }, use) => {
    await authenticateUser(page);
    const integrationsPage = new IntegrationsPage(page);
    await use(integrationsPage);
  },

  // Goals Page Object
  goalsPage: async ({ page }, use) => {
    await authenticateUser(page);
    const goalsPage = new GoalsPage(page);
    await use(goalsPage);
  },
});

// Re-export expect
export { expect };

// ============================================================================
// Test Data
// ============================================================================

export const testData = {
  kpi: {
    name: 'Taxa de Entrega no Prazo',
    code: 'OTD-001',
    perspective: 'customer',
    target: 95,
    unit: '%',
    polarity: 'UP',
    frequency: 'MONTHLY',
    alertThreshold: 10,
    criticalThreshold: 20,
  },
  
  actionPlan: {
    title: 'Melhorar processo de expedição',
    what: 'Implementar sistema de rastreamento em tempo real',
    why: 'Reduzir atrasos e aumentar satisfação do cliente',
    where: 'Centro de Distribuição SP',
    who: 'João Silva',
    when: '2026-02-28',
    how: 'Integrar sistema GPS aos veículos e dashboard de monitoramento',
    howMuch: 'R$ 50.000,00',
  },
  
  pdcaCycle: {
    title: 'Redução de custos operacionais',
    description: 'Ciclo PDCA para identificar e eliminar desperdícios',
    targetDate: '2026-03-31',
    kpiTarget: 15, // 15% de redução
  },
  
  report: {
    name: 'Relatório Semanal de KPIs',
    type: 'pdf',
    frequency: 'weekly',
    recipients: ['gestor@empresa.com', 'diretor@empresa.com'],
    sections: ['kpis', 'action-plans', 'pdca'],
  },
  
  integration: {
    slack: {
      name: 'Slack',
      webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXX',
      channel: '#strategic-alerts',
    },
    teams: {
      name: 'Microsoft Teams',
      webhookUrl: 'https://outlook.office.com/webhook/xxxxx',
    },
  },
  
  goal: {
    title: 'Aumentar market share em 10%',
    description: 'Objetivo estratégico para o ano fiscal',
    perspective: 'financial',
    targetValue: 10,
    unit: '%',
    dueDate: '2026-12-31',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Wait for API response with specific status
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  status: number = 200,
): Promise<void> {
  await page.waitForResponse(
    (resp) => {
      const matchesUrl = typeof urlPattern === 'string' 
        ? resp.url().includes(urlPattern)
        : urlPattern.test(resp.url());
      return matchesUrl && resp.status() === status;
    },
    { timeout: 15000 },
  );
}

/**
 * Fill form field with label
 */
export async function fillFormField(
  page: Page,
  label: string,
  value: string,
): Promise<void> {
  const field = page.locator(`label:has-text("${label}") + input, label:has-text("${label}") ~ input, [aria-label="${label}"]`).first();
  await field.fill(value);
}

/**
 * Select option from dropdown
 */
export async function selectOption(
  page: Page,
  label: string,
  value: string,
): Promise<void> {
  const select = page.locator(`label:has-text("${label}") + select, label:has-text("${label}") ~ select`).first();
  await select.selectOption(value);
}

/**
 * Click button with text
 */
export async function clickButton(
  page: Page,
  text: string,
): Promise<void> {
  await page.locator(`button:has-text("${text}")`).first().click();
}

/**
 * Assert toast message appears
 */
export async function expectToast(
  page: Page,
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'success',
): Promise<void> {
  const toast = page.locator(`[data-sonner-toast][data-type="${type}"], .toast-${type}, [role="status"]`);
  await expect(toast.filter({ hasText: message })).toBeVisible({ timeout: 5000 });
}

/**
 * Take screenshot with descriptive name
 */
export async function takeScreenshot(
  page: Page,
  name: string,
): Promise<void> {
  await page.screenshot({ 
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}
