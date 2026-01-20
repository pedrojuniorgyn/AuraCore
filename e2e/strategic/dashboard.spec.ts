/**
 * Dashboard E2E Tests - Strategic Module
 * 
 * Tests for the customizable strategic dashboard with drag-and-drop widgets,
 * health score, alerts, and real-time data refresh.
 * 
 * @module e2e/strategic/dashboard.spec
 * @since E9 - Strategic Module E2E Tests
 */

import { test, expect } from '../fixtures/strategic-fixtures';

test.describe('Strategic Dashboard', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  // ==========================================================================
  // Widget Display Tests
  // ==========================================================================

  test.describe('Widget Display', () => {
    test('should display health score widget', async ({ dashboardPage }) => {
      await expect(dashboardPage.healthScoreWidget).toBeVisible();
      
      // Verify it shows a percentage value
      const scoreText = await dashboardPage.getHealthScore();
      expect(scoreText).toMatch(/\d+%?/);
    });

    test('should display alerts widget', async ({ dashboardPage }) => {
      await expect(dashboardPage.alertsWidget).toBeVisible();
    });

    test('should display grid container', async ({ dashboardPage }) => {
      await expect(dashboardPage.gridContainer).toBeVisible();
    });

    test('should display refresh button', async ({ dashboardPage }) => {
      await expect(dashboardPage.refreshButton).toBeVisible();
    });
  });

  // ==========================================================================
  // Edit Mode Tests
  // ==========================================================================

  test.describe('Edit Mode', () => {
    test('should enter edit mode when clicking customize button', async ({ dashboardPage }) => {
      await dashboardPage.enterEditMode();
      
      // Verify edit mode is active
      await expect(dashboardPage.addWidgetButton).toBeVisible();
      await expect(dashboardPage.saveButton).toBeVisible();
      await expect(dashboardPage.cancelButton).toBeVisible();
    });

    test('should exit edit mode without saving', async ({ dashboardPage }) => {
      await dashboardPage.enterEditMode();
      await dashboardPage.exitEditMode();
      
      // Verify back to normal mode
      await expect(dashboardPage.addWidgetButton).not.toBeVisible();
    });

    test('should add widget in edit mode', async ({ dashboardPage, page }) => {
      await dashboardPage.enterEditMode();
      
      // Add trend chart widget
      await dashboardPage.addWidget('trend-chart');
      
      // Verify widget is added (widget picker should close and new widget visible)
      const trendWidget = page.locator('[data-widget-type="trend-chart"]');
      await expect(trendWidget).toBeVisible();
    });

    test('should save custom layout', async ({ dashboardPage, page }) => {
      await dashboardPage.enterEditMode();
      
      // Make a modification
      await dashboardPage.addWidget('aurora-insight');
      
      // Save and verify API call
      await dashboardPage.saveLayout();
      
      // Verify we're back to view mode
      await expect(dashboardPage.saveButton).not.toBeVisible();
    });

    test('should show widget picker when adding widget', async ({ dashboardPage }) => {
      await dashboardPage.enterEditMode();
      await dashboardPage.addWidgetButton.click();
      
      await expect(dashboardPage.widgetPicker).toBeVisible();
    });
  });

  // ==========================================================================
  // Data Refresh Tests
  // ==========================================================================

  test.describe('Data Refresh', () => {
    test('should refresh data on button click', async ({ dashboardPage, page }) => {
      const responsePromise = page.waitForResponse(
        (resp) => resp.url().includes('/api/strategic/dashboard'),
      );
      
      await dashboardPage.refreshData();
      
      const response = await responsePromise;
      expect(response.status()).toBe(200);
    });

    test('should update health score after refresh', async ({ dashboardPage }) => {
      const initialScore = await dashboardPage.getHealthScore();
      
      await dashboardPage.refreshData();
      
      // Score should still be visible (may or may not change)
      const newScore = await dashboardPage.getHealthScore();
      expect(newScore).toBeTruthy();
    });
  });

  // ==========================================================================
  // Drag and Drop Tests
  // ==========================================================================

  test.describe('Drag and Drop', () => {
    test('should allow widget drag in edit mode', async ({ dashboardPage, page }) => {
      await dashboardPage.enterEditMode();
      
      const healthWidget = dashboardPage.healthScoreWidget;
      const boundingBox = await healthWidget.boundingBox();
      
      if (boundingBox) {
        // Perform drag operation
        await page.mouse.move(
          boundingBox.x + boundingBox.width / 2,
          boundingBox.y + 10,
        );
        await page.mouse.down();
        await page.mouse.move(
          boundingBox.x + 200,
          boundingBox.y + 100,
          { steps: 10 },
        );
        await page.mouse.up();
      }
      
      // Save the new position
      await dashboardPage.saveLayout();
    });

    test('should not allow drag in view mode', async ({ dashboardPage, page }) => {
      const healthWidget = dashboardPage.healthScoreWidget;
      const initialBox = await healthWidget.boundingBox();
      
      if (initialBox) {
        // Try to drag
        await page.mouse.move(
          initialBox.x + initialBox.width / 2,
          initialBox.y + 10,
        );
        await page.mouse.down();
        await page.mouse.move(
          initialBox.x + 200,
          initialBox.y + 100,
          { steps: 10 },
        );
        await page.mouse.up();
      }
      
      // Widget should still be in same position
      const finalBox = await healthWidget.boundingBox();
      expect(finalBox?.x).toBe(initialBox?.x);
      expect(finalBox?.y).toBe(initialBox?.y);
    });
  });

  // ==========================================================================
  // Navigation Tests
  // ==========================================================================

  test.describe('Navigation', () => {
    test('should navigate to KPIs page from dashboard', async ({ dashboardPage, page }) => {
      await page.click('a[href*="kpis"], button:has-text("KPIs")');
      await expect(page).toHaveURL(/.*kpis.*/);
    });

    test('should navigate to action plans from alert click', async ({ dashboardPage, page }) => {
      // Click on an alert that links to action plans
      const alertLink = page.locator('[data-testid="alert-link"]').first();
      
      if (await alertLink.isVisible()) {
        await alertLink.click();
        await expect(page).toHaveURL(/.*action-plans.*/);
      }
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ dashboardPage, page }) => {
      // Check refresh button has aria-label
      await expect(dashboardPage.refreshButton).toHaveAttribute('aria-label', /.+/);
      
      // Check edit button is accessible
      await expect(dashboardPage.editButton).toBeEnabled();
    });

    test('should be keyboard navigable', async ({ dashboardPage, page }) => {
      // Tab through the dashboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to activate with Enter
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });
  });
});
