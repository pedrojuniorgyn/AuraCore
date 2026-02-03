/**
 * Strategic Module Page Objects
 * 
 * Page Object Model implementation for Strategic module E2E tests.
 * Encapsulates page interactions and selectors.
 * 
 * @module e2e/pages/strategic-pages
 * @since E9 - Strategic Module E2E Tests
 */

import { type Page, type Locator, expect } from '@playwright/test';

// ============================================================================
// Dashboard Page
// ============================================================================

export class DashboardPage {
  readonly page: Page;
  readonly healthScoreWidget: Locator;
  readonly alertsWidget: Locator;
  readonly editButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly addWidgetButton: Locator;
  readonly widgetPicker: Locator;
  readonly refreshButton: Locator;
  readonly gridContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.healthScoreWidget = page.locator('[data-tour="health-score"], [data-widget-type="health-score"]');
    this.alertsWidget = page.locator('[data-tour="alerts"], [data-widget-type="alerts"]');
    this.editButton = page.locator('button:has-text("Personalizar"), button:has-text("Editar"), [data-tour="customize"]');
    this.saveButton = page.locator('button:has-text("Salvar")');
    this.cancelButton = page.locator('button:has-text("Cancelar")');
    this.addWidgetButton = page.locator('button:has-text("Adicionar Widget"), button:has-text("Add Widget")');
    this.widgetPicker = page.locator('[data-testid="widget-picker"], [role="dialog"]');
    this.refreshButton = page.locator('button[title="Atualizar dados"], button[aria-label="Refresh"]');
    this.gridContainer = page.locator('[data-testid="dashboard-grid"], .react-grid-layout');
  }

  async goto(): Promise<void> {
    await this.page.goto('/strategic/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async enterEditMode(): Promise<void> {
    await this.editButton.click();
    await expect(this.addWidgetButton).toBeVisible({ timeout: 5000 });
  }

  async exitEditMode(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.addWidgetButton).not.toBeVisible({ timeout: 5000 });
  }

  async saveLayout(): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/api/strategic/dashboard') && resp.request().method() === 'PUT',
    );
    await this.saveButton.click();
    await responsePromise;
    await expect(this.saveButton).not.toBeVisible({ timeout: 5000 });
  }

  async addWidget(widgetType: string): Promise<void> {
    await this.addWidgetButton.click();
    await expect(this.widgetPicker).toBeVisible();
    await this.widgetPicker.locator(`[data-widget-type="${widgetType}"], button:has-text("${widgetType}")`).click();
  }

  async removeWidget(widgetId: string): Promise<void> {
    const widget = this.page.locator(`[data-widget-id="${widgetId}"]`);
    await widget.hover();
    await widget.locator('button[aria-label="Remover"], button[aria-label="Remove"]').click();
  }

  async refreshData(): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/api/strategic/dashboard/data') && resp.status() === 200,
    );
    await this.refreshButton.click();
    await responsePromise;
  }

  async getHealthScore(): Promise<string | null> {
    return await this.healthScoreWidget.textContent();
  }

  async getAlertsCount(): Promise<number> {
    const countText = await this.alertsWidget.locator('[data-testid="alerts-count"]').textContent();
    return parseInt(countText || '0', 10);
  }
}

// ============================================================================
// KPIs Page
// ============================================================================

export class KpisPage {
  readonly page: Page;
  readonly createButton: Locator;
  readonly kpiList: Locator;
  readonly searchInput: Locator;
  readonly perspectiveFilter: Locator;
  readonly kpiCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.locator('button:has-text("Novo KPI"), button:has-text("New KPI")');
    this.kpiList = page.locator('[data-testid="kpi-list"], .kpi-list');
    this.searchInput = page.locator('input[placeholder*="Buscar"], input[placeholder*="Search"]');
    this.perspectiveFilter = page.locator('[data-testid="perspective-filter"], select[name="perspective"]');
    this.kpiCards = page.locator('[data-testid="kpi-card"], .kpi-card');
  }

  async goto(): Promise<void> {
    await this.page.goto('/strategic/kpis');
    await this.page.waitForLoadState('networkidle');
  }

  async createKpi(data: {
    name: string;
    code: string;
    perspective: string;
    target: number;
    unit: string;
  }): Promise<void> {
    await this.createButton.click();
    
    await this.page.fill('input[name="name"]', data.name);
    await this.page.fill('input[name="code"]', data.code);
    await this.page.selectOption('select[name="perspective"]', data.perspective);
    await this.page.fill('input[name="targetValue"]', String(data.target));
    await this.page.fill('input[name="unit"]', data.unit);
    
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/api/strategic/kpis') && resp.status() === 201,
    );
    await this.page.click('button:has-text("Salvar"), button[type="submit"]');
    await responsePromise;
  }

  async searchKpi(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.page.waitForTimeout(500); // Debounce
  }

  async filterByPerspective(perspective: string): Promise<void> {
    await this.perspectiveFilter.click();
    await this.page.click(`[data-value="${perspective}"], option[value="${perspective}"]`);
  }

  async getKpiCount(): Promise<number> {
    return await this.kpiCards.count();
  }

  async clickKpi(name: string): Promise<void> {
    await this.kpiCards.filter({ hasText: name }).first().click();
  }

  async editKpi(name: string, newTarget: number): Promise<void> {
    await this.clickKpi(name);
    await this.page.click('button:has-text("Editar")');
    await this.page.fill('input[name="targetValue"]', String(newTarget));
    await this.page.click('button:has-text("Salvar")');
  }

  async recordMeasurement(name: string, value: number): Promise<void> {
    await this.clickKpi(name);
    await this.page.click('button:has-text("Registrar Valor")');
    await this.page.fill('input[name="value"]', String(value));
    await this.page.click('button:has-text("Confirmar")');
  }
}

// ============================================================================
// Action Plans Page
// ============================================================================

export class ActionPlansPage {
  readonly page: Page;
  readonly createButton: Locator;
  readonly planList: Locator;
  readonly planCards: Locator;
  readonly wizardModal: Locator;
  readonly statusFilter: Locator;
  readonly kanbanBoard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.locator('button:has-text("Novo Plano"), button:has-text("New Plan")');
    this.planList = page.locator('[data-testid="action-plan-list"], .action-plan-list');
    this.planCards = page.locator('[data-testid="plan-card"], .plan-card');
    this.wizardModal = page.locator('[data-testid="action-plan-wizard"], [role="dialog"]');
    this.statusFilter = page.locator('[data-testid="status-filter"]');
    this.kanbanBoard = page.locator('[data-testid="kanban-board"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/strategic/action-plans');
    await this.page.waitForLoadState('networkidle');
  }

  async createPlan(data: {
    title: string;
    what: string;
    why: string;
    where: string;
    who: string;
    when: string;
    how: string;
    howMuch?: string;
  }): Promise<void> {
    await this.createButton.click();
    await expect(this.wizardModal).toBeVisible();

    // Step 1: Basic Info
    await this.page.fill('input[name="title"]', data.title);
    await this.page.click('button:has-text("Próximo"), button:has-text("Next")');

    // Step 2: 5W2H
    await this.page.fill('textarea[name="what"]', data.what);
    await this.page.fill('textarea[name="why"]', data.why);
    await this.page.fill('input[name="where"]', data.where);
    await this.page.fill('input[name="who"]', data.who);
    await this.page.fill('input[name="when"]', data.when);
    await this.page.fill('textarea[name="how"]', data.how);
    if (data.howMuch) {
      await this.page.fill('input[name="howMuch"]', data.howMuch);
    }
    await this.page.click('button:has-text("Próximo"), button:has-text("Next")');

    // Step 3: Confirm
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/api/strategic/action-plans') && resp.status() === 201,
    );
    await this.page.click('button:has-text("Criar Plano"), button:has-text("Create")');
    await responsePromise;
  }

  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.click();
    await this.page.click(`[data-status="${status}"], text=${status}`);
  }

  async updatePlanStatus(planTitle: string, newStatus: string): Promise<void> {
    await this.planCards.filter({ hasText: planTitle }).first().click();
    await this.page.click('[data-testid="status-dropdown"]');
    await this.page.click(`text=${newStatus}`);
  }

  async addTask(planTitle: string, taskTitle: string): Promise<void> {
    await this.planCards.filter({ hasText: planTitle }).first().click();
    await this.page.click('button:has-text("Nova Tarefa")');
    await this.page.fill('input[name="taskTitle"]', taskTitle);
    await this.page.click('button:has-text("Adicionar")');
  }

  async getPlanCount(): Promise<number> {
    return await this.planCards.count();
  }
}

// ============================================================================
// PDCA Page
// ============================================================================

export class PdcaPage {
  readonly page: Page;
  readonly createButton: Locator;
  readonly cycleList: Locator;
  readonly cycleCards: Locator;
  readonly kanbanBoard: Locator;
  readonly phaseColumns: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.locator('button:has-text("Novo Ciclo"), button:has-text("New Cycle")');
    this.cycleList = page.locator('[data-testid="pdca-list"]');
    this.cycleCards = page.locator('[data-testid="pdca-card"], .pdca-card');
    this.kanbanBoard = page.locator('[data-testid="pdca-kanban"]');
    this.phaseColumns = page.locator('[data-phase]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/strategic/pdca');
    await this.page.waitForLoadState('networkidle');
  }

  async createCycle(data: {
    title: string;
    description: string;
    targetDate: string;
    kpiTarget?: number;
  }): Promise<void> {
    await this.createButton.click();
    
    await this.page.fill('input[name="title"]', data.title);
    await this.page.fill('textarea[name="description"]', data.description);
    await this.page.fill('input[name="targetDate"]', data.targetDate);
    if (data.kpiTarget) {
      await this.page.fill('input[name="kpiTarget"]', String(data.kpiTarget));
    }

    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/api/strategic/pdca') && resp.status() === 201,
    );
    await this.page.click('button:has-text("Criar"), button[type="submit"]');
    await responsePromise;
  }

  async advancePhase(cycleTitle: string): Promise<void> {
    await this.cycleCards.filter({ hasText: cycleTitle }).first().click();
    await this.page.click('button:has-text("Avançar Fase")');
  }

  async addAction(cycleTitle: string, action: string): Promise<void> {
    await this.cycleCards.filter({ hasText: cycleTitle }).first().click();
    await this.page.click('button:has-text("Nova Ação")');
    await this.page.fill('textarea[name="action"]', action);
    await this.page.click('button:has-text("Adicionar")');
  }

  async getCurrentPhase(cycleTitle: string): Promise<string | null> {
    const card = this.cycleCards.filter({ hasText: cycleTitle }).first();
    return await card.locator('[data-current-phase]').getAttribute('data-current-phase');
  }

  async getCycleCount(): Promise<number> {
    return await this.cycleCards.count();
  }
}

// ============================================================================
// Reports Page
// ============================================================================

export class ReportsPage {
  readonly page: Page;
  readonly createButton: Locator;
  readonly reportList: Locator;
  readonly reportCards: Locator;
  readonly builderModal: Locator;
  readonly previewModal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.locator('button:has-text("Novo Relatório"), button:has-text("New Report")');
    this.reportList = page.locator('[data-testid="report-list"]');
    this.reportCards = page.locator('[data-testid="report-card"], .report-card');
    this.builderModal = page.locator('[data-testid="report-builder"], [role="dialog"]');
    this.previewModal = page.locator('[data-testid="report-preview"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/strategic/reports');
    await this.page.waitForLoadState('networkidle');
  }

  async createReport(data: {
    name: string;
    type: string;
    frequency: string;
    recipients: string[];
  }): Promise<void> {
    await this.createButton.click();
    await expect(this.builderModal).toBeVisible();

    // Step 1: Content
    await this.page.fill('input[name="name"]', data.name);
    await this.page.click('button:has-text("Próximo")');

    // Step 2: Format
    await this.page.click(`[data-format="${data.type}"], button:has-text("${data.type.toUpperCase()}")`);
    await this.page.click('button:has-text("Próximo")');

    // Step 3: Schedule
    await this.page.click(`[data-frequency="${data.frequency}"], button:has-text("${data.frequency}")`);
    await this.page.click('button:has-text("Próximo")');

    // Step 4: Recipients
    for (const email of data.recipients) {
      await this.page.fill('input[name="email"], input[placeholder*="email"]', email);
      await this.page.click('button:has-text("Adicionar")');
    }

    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/api/strategic/reports') && resp.status() === 201,
    );
    await this.page.click('button:has-text("Salvar"), button:has-text("Create")');
    await responsePromise;
  }

  async generateReport(reportName: string): Promise<void> {
    const card = this.reportCards.filter({ hasText: reportName }).first();
    
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/generate') && resp.status() === 200,
    );
    await card.locator('button:has-text("Gerar")').click();
    await responsePromise;
  }

  async previewReport(reportName: string): Promise<void> {
    const card = this.reportCards.filter({ hasText: reportName }).first();
    await card.locator('button:has-text("Preview")').click();
    await expect(this.previewModal).toBeVisible();
  }

  async toggleSchedule(reportName: string): Promise<void> {
    const card = this.reportCards.filter({ hasText: reportName }).first();
    const toggleButton = card.locator('button:has-text("Pausar"), button:has-text("Ativar")');
    await toggleButton.click();
  }

  async getReportCount(): Promise<number> {
    return await this.reportCards.count();
  }
}

// ============================================================================
// Integrations Page
// ============================================================================

export class IntegrationsPage {
  readonly page: Page;
  readonly integrationCards: Locator;
  readonly configModal: Locator;
  readonly logsPanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.integrationCards = page.locator('[data-testid="integration-card"], .integration-card');
    this.configModal = page.locator('[data-testid="integration-config"], [role="dialog"]');
    this.logsPanel = page.locator('[data-testid="integration-logs"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/strategic/integrations');
    await this.page.waitForLoadState('networkidle');
  }

  async configureIntegration(name: string, webhookUrl: string): Promise<void> {
    const card = this.integrationCards.filter({ hasText: name }).first();
    await card.locator('button:has-text("Configurar")').click();
    
    await expect(this.configModal).toBeVisible();
    await this.page.fill('input[name="webhookUrl"]', webhookUrl);
    
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/api/strategic/integrations') && resp.status() === 200,
    );
    await this.page.click('button:has-text("Salvar")');
    await responsePromise;
  }

  async toggleIntegration(name: string): Promise<void> {
    const card = this.integrationCards.filter({ hasText: name }).first();
    await card.locator('[role="switch"], input[type="checkbox"]').click();
  }

  async testConnection(name: string): Promise<boolean> {
    const card = this.integrationCards.filter({ hasText: name }).first();
    
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/test') && resp.status() === 200,
    );
    await card.locator('button:has-text("Testar")').click();
    const response = await responsePromise;
    const data = await response.json();
    return data.success;
  }

  async viewLogs(name: string): Promise<void> {
    const card = this.integrationCards.filter({ hasText: name }).first();
    await card.locator('button:has-text("Logs")').click();
    await expect(this.logsPanel).toBeVisible();
  }

  async getIntegrationStatus(name: string): Promise<string | null> {
    const card = this.integrationCards.filter({ hasText: name }).first();
    return await card.locator('[data-status]').getAttribute('data-status');
  }
}

// ============================================================================
// Goals Page
// ============================================================================

export class GoalsPage {
  readonly page: Page;
  readonly createButton: Locator;
  readonly goalList: Locator;
  readonly goalCards: Locator;
  readonly strategicMap: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.locator('button:has-text("Novo Objetivo"), button:has-text("New Goal")');
    this.goalList = page.locator('[data-testid="goal-list"]');
    this.goalCards = page.locator('[data-testid="goal-card"], .goal-card');
    this.strategicMap = page.locator('[data-testid="strategic-map"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/strategic/goals');
    await this.page.waitForLoadState('networkidle');
  }

  async createGoal(data: {
    title: string;
    description: string;
    perspective: string;
    targetValue: number;
    unit: string;
    dueDate: string;
  }): Promise<void> {
    await this.createButton.click();
    
    await this.page.fill('input[name="title"]', data.title);
    await this.page.fill('textarea[name="description"]', data.description);
    await this.page.selectOption('select[name="perspective"]', data.perspective);
    await this.page.fill('input[name="targetValue"]', String(data.targetValue));
    await this.page.fill('input[name="unit"]', data.unit);
    await this.page.fill('input[name="dueDate"]', data.dueDate);

    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/api/strategic/goals') && resp.status() === 201,
    );
    await this.page.click('button:has-text("Salvar"), button[type="submit"]');
    await responsePromise;
  }

  async linkKpiToGoal(goalTitle: string, kpiCode: string): Promise<void> {
    await this.goalCards.filter({ hasText: goalTitle }).first().click();
    await this.page.click('button:has-text("Vincular KPI")');
    await this.page.click(`text=${kpiCode}`);
    await this.page.click('button:has-text("Confirmar")');
  }

  async viewStrategicMap(): Promise<void> {
    await this.page.goto('/strategic/map');
    await expect(this.strategicMap).toBeVisible();
  }

  async getGoalCount(): Promise<number> {
    return await this.goalCards.count();
  }
}
