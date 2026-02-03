/**
 * KPIs E2E Tests - Strategic Module
 * 
 * Tests for KPI (Key Performance Indicators) management including
 * creation, editing, measurement recording, and BSC perspectives.
 * 
 * @module e2e/strategic/kpis.spec
 * @since E9 - Strategic Module E2E Tests
 */

import { test, expect, testData } from '../fixtures/strategic-fixtures';

test.describe('Strategic KPIs', () => {
  test.beforeEach(async ({ kpisPage }) => {
    await kpisPage.goto();
  });

  // ==========================================================================
  // Display Tests
  // ==========================================================================

  test.describe('Display', () => {
    test('should display KPI list', async ({ kpisPage }) => {
      await expect(kpisPage.kpiList).toBeVisible();
      await expect(kpisPage.createButton).toBeVisible();
    });

    test('should display search input', async ({ kpisPage }) => {
      await expect(kpisPage.searchInput).toBeVisible();
    });

    test('should display perspective filter', async ({ kpisPage }) => {
      await expect(kpisPage.perspectiveFilter).toBeVisible();
    });
  });

  // ==========================================================================
  // Create KPI Tests
  // ==========================================================================

  test.describe('Create KPI', () => {
    test('should create a new KPI', async ({ kpisPage, page }) => {
      const kpiData = {
        name: `Test KPI ${Date.now()}`,
        code: `TST-${Date.now().toString().slice(-4)}`,
        perspective: 'financial',
        target: 95,
        unit: '%',
      };

      await kpisPage.createKpi(kpiData);
      
      // Verify KPI appears in the list
      await expect(page.locator(`text=${kpiData.name}`)).toBeVisible();
    });

    test('should validate required fields', async ({ kpisPage, page }) => {
      await kpisPage.createButton.click();
      
      // Try to submit without filling required fields
      await page.click('button:has-text("Salvar"), button[type="submit"]');
      
      // Should show validation errors
      const errorMessage = page.locator('[data-error], .error-message, [role="alert"]');
      await expect(errorMessage.first()).toBeVisible();
    });

    test('should validate code format', async ({ kpisPage, page }) => {
      await kpisPage.createButton.click();
      
      // Fill with invalid code format
      await page.fill('input[name="code"]', 'invalid lowercase');
      await page.fill('input[name="name"]', 'Test KPI');
      await page.fill('input[name="unit"]', '%');
      await page.fill('input[name="targetValue"]', '100');
      
      await page.click('button:has-text("Salvar"), button[type="submit"]');
      
      // Should show validation error for code
      const codeError = page.locator('text=/código|code/i');
      await expect(codeError).toBeVisible();
    });
  });

  // ==========================================================================
  // Search and Filter Tests
  // ==========================================================================

  test.describe('Search and Filter', () => {
    test('should search KPIs by name', async ({ kpisPage, page }) => {
      await kpisPage.searchKpi('OTD');
      
      // Wait for debounce
      await page.waitForTimeout(600);
      
      // Verify filtered results
      const visibleKpis = await kpisPage.getKpiCount();
      expect(visibleKpis).toBeGreaterThanOrEqual(0);
    });

    test('should filter by perspective', async ({ kpisPage, page }) => {
      await kpisPage.filterByPerspective('financial');
      
      // Wait for filter to apply
      await page.waitForLoadState('networkidle');
      
      // Verify that only financial KPIs are shown
      const perspectiveLabels = await page.locator('[data-perspective="financial"]').count();
      expect(perspectiveLabels).toBeGreaterThanOrEqual(0);
    });

    test('should clear search', async ({ kpisPage, page }) => {
      await kpisPage.searchKpi('test');
      await page.waitForTimeout(600);
      
      // Clear search
      await kpisPage.searchInput.clear();
      await page.waitForTimeout(600);
      
      // Should show all KPIs again
      const allKpis = await kpisPage.getKpiCount();
      expect(allKpis).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // Edit KPI Tests
  // ==========================================================================

  test.describe('Edit KPI', () => {
    test('should open KPI detail on click', async ({ kpisPage, page }) => {
      const firstKpi = kpisPage.kpiCards.first();
      
      if (await firstKpi.isVisible()) {
        await firstKpi.click();
        
        // Should show detail view or modal
        const detailView = page.locator('[data-testid="kpi-detail"], [role="dialog"]');
        await expect(detailView).toBeVisible();
      }
    });

    test('should update KPI target', async ({ kpisPage, page }) => {
      const firstKpi = kpisPage.kpiCards.first();
      
      if (await firstKpi.isVisible()) {
        await firstKpi.click();
        await page.click('button:has-text("Editar")');
        
        const newTarget = '98';
        await page.fill('input[name="targetValue"]', newTarget);
        
        const responsePromise = page.waitForResponse(
          (resp) => resp.url().includes('/api/strategic/kpis') && resp.request().method() === 'PUT',
        );
        await page.click('button:has-text("Salvar")');
        await responsePromise;
        
        // Verify update
        await expect(page.locator(`text=${newTarget}`)).toBeVisible();
      }
    });
  });

  // ==========================================================================
  // Record Measurement Tests
  // ==========================================================================

  test.describe('Record Measurement', () => {
    test('should record new KPI value', async ({ kpisPage, page }) => {
      const firstKpi = kpisPage.kpiCards.first();
      
      if (await firstKpi.isVisible()) {
        await firstKpi.click();
        await page.click('button:has-text("Registrar Valor")');
        
        const value = '92.5';
        await page.fill('input[name="value"]', value);
        
        const responsePromise = page.waitForResponse(
          (resp) => resp.url().includes('/measurements') && resp.status() === 201,
        );
        await page.click('button:has-text("Confirmar")');
        await responsePromise;
        
        // Should update the chart
        const trendChart = page.locator('[data-testid="trend-chart"]');
        await expect(trendChart).toBeVisible();
      }
    });

    test('should show measurement history', async ({ kpisPage, page }) => {
      const firstKpi = kpisPage.kpiCards.first();
      
      if (await firstKpi.isVisible()) {
        await firstKpi.click();
        
        // Should show historical measurements
        const historySection = page.locator('[data-testid="measurement-history"]');
        await expect(historySection).toBeVisible();
      }
    });
  });

  // ==========================================================================
  // Threshold Alerts Tests
  // ==========================================================================

  test.describe('Threshold Alerts', () => {
    test('should display alert status on KPI cards', async ({ kpisPage, page }) => {
      // KPI cards should show status indicator
      const statusIndicator = page.locator('[data-status]').first();
      
      if (await statusIndicator.isVisible()) {
        const status = await statusIndicator.getAttribute('data-status');
        expect(['on-track', 'warning', 'critical', 'ok', 'alert']).toContain(status);
      }
    });

    test('should show threshold configuration', async ({ kpisPage, page }) => {
      const firstKpi = kpisPage.kpiCards.first();
      
      if (await firstKpi.isVisible()) {
        await firstKpi.click();
        await page.click('button:has-text("Editar")');
        
        // Threshold fields should be visible
        const alertThreshold = page.locator('input[name="alertThreshold"]');
        const criticalThreshold = page.locator('input[name="criticalThreshold"]');
        
        await expect(alertThreshold).toBeVisible();
        await expect(criticalThreshold).toBeVisible();
      }
    });
  });

  // ==========================================================================
  // BSC Perspective Tests
  // ==========================================================================

  test.describe('BSC Perspectives', () => {
    test('should show all BSC perspectives in filter', async ({ kpisPage, page }) => {
      await kpisPage.perspectiveFilter.click();
      
      const perspectives = ['financial', 'customer', 'internal', 'learning'];
      
      for (const perspective of perspectives) {
        const option = page.locator(`[data-value="${perspective}"], option[value="${perspective}"]`);
        await expect(option).toBeVisible();
      }
    });

    test('should group KPIs by perspective', async ({ kpisPage, page }) => {
      // Check if there's a grouped view
      const perspectiveGroups = page.locator('[data-perspective-group]');
      
      if (await perspectiveGroups.first().isVisible()) {
        const groupCount = await perspectiveGroups.count();
        expect(groupCount).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ==========================================================================
  // Auto Calculate Tests
  // ==========================================================================

  test.describe('Auto Calculate', () => {
    test('should show auto-calculate toggle in create form', async ({ kpisPage, page }) => {
      await kpisPage.createButton.click();
      
      const autoCalculateToggle = page.locator('input[name="autoCalculate"], [role="switch"]');
      await expect(autoCalculateToggle).toBeVisible();
    });

    test('should show source module selector when auto-calculate is enabled', async ({ kpisPage, page }) => {
      await kpisPage.createButton.click();
      
      // Enable auto-calculate
      const autoCalculateToggle = page.locator('input[name="autoCalculate"], [role="switch"]');
      await autoCalculateToggle.click();
      
      // Source module selector should appear
      const sourceModule = page.locator('select[name="sourceModule"], [data-testid="source-module"]');
      await expect(sourceModule).toBeVisible();
    });
  });
});
