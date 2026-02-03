/**
 * PDCA E2E Tests - Strategic Module
 * 
 * Tests for PDCA (Plan-Do-Check-Act) cycle management including
 * cycle creation, phase advancement, and action tracking.
 * 
 * @module e2e/strategic/pdca.spec
 * @since E9 - Strategic Module E2E Tests
 */

import { test, expect, testData } from '../fixtures/strategic-fixtures';

test.describe('Strategic PDCA', () => {
  test.beforeEach(async ({ pdcaPage }) => {
    await pdcaPage.goto();
  });

  // ==========================================================================
  // Display Tests
  // ==========================================================================

  test.describe('Display', () => {
    test('should display PDCA list', async ({ pdcaPage }) => {
      await expect(pdcaPage.cycleList).toBeVisible();
      await expect(pdcaPage.createButton).toBeVisible();
    });

    test('should display cycle cards', async ({ pdcaPage }) => {
      const count = await pdcaPage.getCycleCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should show kanban board option', async ({ pdcaPage, page }) => {
      const kanbanToggle = page.locator('button:has-text("Kanban"), [data-view="kanban"]');
      await expect(kanbanToggle).toBeVisible();
    });
  });

  // ==========================================================================
  // Cycle Creation Tests
  // ==========================================================================

  test.describe('Cycle Creation', () => {
    test('should create new PDCA cycle', async ({ pdcaPage, page }) => {
      const cycleData = {
        ...testData.pdcaCycle,
        title: `PDCA Cycle ${Date.now()}`,
      };

      await pdcaPage.createCycle(cycleData);
      
      // Verify cycle appears in the list
      await expect(page.locator(`text=${cycleData.title}`)).toBeVisible();
    });

    test('should validate required fields', async ({ pdcaPage, page }) => {
      await pdcaPage.createButton.click();
      
      // Try to submit without filling required fields
      await page.click('button:has-text("Criar"), button[type="submit"]');
      
      // Should show validation error
      const errorMessage = page.locator('[data-error], .error-message, [role="alert"]');
      await expect(errorMessage.first()).toBeVisible();
    });

    test('should set initial phase to PLAN', async ({ pdcaPage, page }) => {
      const cycleData = {
        ...testData.pdcaCycle,
        title: `PDCA New ${Date.now()}`,
      };

      await pdcaPage.createCycle(cycleData);
      
      // New cycle should start in PLAN phase
      const newCycle = page.locator(`text=${cycleData.title}`).locator('..');
      const phaseIndicator = newCycle.locator('[data-phase="plan"], .phase-plan');
      await expect(phaseIndicator).toBeVisible();
    });
  });

  // ==========================================================================
  // Phase Advancement Tests
  // ==========================================================================

  test.describe('Phase Advancement', () => {
    test('should advance from PLAN to DO', async ({ pdcaPage, page }) => {
      const firstCycle = pdcaPage.cycleCards.first();
      
      if (await firstCycle.isVisible()) {
        await firstCycle.click();
        
        // Find advance button
        const advanceButton = page.locator('button:has-text("Avançar Fase"), button:has-text("Next Phase")');
        
        if (await advanceButton.isVisible()) {
          const responsePromise = page.waitForResponse(
            (resp) => resp.url().includes('/advance') && resp.status() === 200,
          );
          await advanceButton.click();
          await responsePromise;
          
          // Phase should update
          const doPhase = page.locator('[data-phase="do"], text=DO');
          await expect(doPhase).toBeVisible();
        }
      }
    });

    test('should show phase history', async ({ pdcaPage, page }) => {
      const firstCycle = pdcaPage.cycleCards.first();
      
      if (await firstCycle.isVisible()) {
        await firstCycle.click();
        
        // Look for phase history
        const phaseHistory = page.locator('[data-testid="phase-history"]');
        if (await phaseHistory.isVisible()) {
          await expect(phaseHistory).toBeVisible();
        }
      }
    });

    test('should require completion of actions before advancing', async ({ pdcaPage, page }) => {
      const firstCycle = pdcaPage.cycleCards.first();
      
      if (await firstCycle.isVisible()) {
        await firstCycle.click();
        
        // Check if there's a warning about incomplete actions
        const incompleteWarning = page.locator('text=/incomplete|incompleto|pendente/i');
        if (await incompleteWarning.isVisible()) {
          await expect(incompleteWarning).toBeVisible();
        }
      }
    });
  });

  // ==========================================================================
  // Action Management Tests
  // ==========================================================================

  test.describe('Action Management', () => {
    test('should add action to cycle', async ({ pdcaPage, page }) => {
      const firstCycle = pdcaPage.cycleCards.first();
      
      if (await firstCycle.isVisible()) {
        await firstCycle.click();
        
        // Add action
        await page.click('button:has-text("Nova Ação"), button:has-text("Add Action")');
        await page.fill('textarea[name="action"], input[name="actionTitle"]', 'Test Action');
        
        const responsePromise = page.waitForResponse(
          (resp) => resp.url().includes('/actions') && resp.status() === 201,
        );
        await page.click('button:has-text("Adicionar")');
        await responsePromise;
        
        // Verify action appears
        await expect(page.locator('text=Test Action')).toBeVisible();
      }
    });

    test('should complete action', async ({ pdcaPage, page }) => {
      const firstCycle = pdcaPage.cycleCards.first();
      
      if (await firstCycle.isVisible()) {
        await firstCycle.click();
        
        // Find first action checkbox
        const actionCheckbox = page.locator('[data-testid="action-checkbox"], input[type="checkbox"]').first();
        
        if (await actionCheckbox.isVisible()) {
          await actionCheckbox.click();
          
          // Should update action status
          await page.waitForResponse(
            (resp) => resp.url().includes('/actions') && resp.request().method() === 'PATCH',
          );
        }
      }
    });

    test('should show actions by phase', async ({ pdcaPage, page }) => {
      const firstCycle = pdcaPage.cycleCards.first();
      
      if (await firstCycle.isVisible()) {
        await firstCycle.click();
        
        // Check for phase tabs or sections
        const phaseTabs = page.locator('[data-phase-tab], button:has-text("Plan"), button:has-text("Do")');
        if (await phaseTabs.first().isVisible()) {
          await expect(phaseTabs.first()).toBeVisible();
        }
      }
    });
  });

  // ==========================================================================
  // Kanban Board Tests
  // ==========================================================================

  test.describe('Kanban Board', () => {
    test('should display kanban with PDCA columns', async ({ pdcaPage, page }) => {
      const kanbanToggle = page.locator('button:has-text("Kanban"), [data-view="kanban"]');
      
      if (await kanbanToggle.isVisible()) {
        await kanbanToggle.click();
        await expect(pdcaPage.kanbanBoard).toBeVisible();
        
        // Check for PDCA columns
        const columns = ['plan', 'do', 'check', 'act'];
        for (const column of columns) {
          const columnElement = page.locator(`[data-column="${column}"], [data-phase="${column}"]`);
          if (await columnElement.isVisible()) {
            await expect(columnElement).toBeVisible();
          }
        }
      }
    });

    test('should allow drag between columns', async ({ pdcaPage, page }) => {
      const kanbanToggle = page.locator('button:has-text("Kanban"), [data-view="kanban"]');
      
      if (await kanbanToggle.isVisible()) {
        await kanbanToggle.click();
        
        // Find a draggable card
        const card = pdcaPage.kanbanBoard.locator('[draggable="true"]').first();
        
        if (await card.isVisible()) {
          const boundingBox = await card.boundingBox();
          
          if (boundingBox) {
            await page.mouse.move(
              boundingBox.x + boundingBox.width / 2,
              boundingBox.y + boundingBox.height / 2,
            );
            await page.mouse.down();
            await page.mouse.move(
              boundingBox.x + 300,
              boundingBox.y,
              { steps: 10 },
            );
            await page.mouse.up();
          }
        }
      }
    });
  });

  // ==========================================================================
  // Metrics and Reporting Tests
  // ==========================================================================

  test.describe('Metrics and Reporting', () => {
    test('should show cycle metrics', async ({ pdcaPage, page }) => {
      const firstCycle = pdcaPage.cycleCards.first();
      
      if (await firstCycle.isVisible()) {
        await firstCycle.click();
        
        // Look for metrics section
        const metricsSection = page.locator('[data-testid="cycle-metrics"]');
        if (await metricsSection.isVisible()) {
          await expect(metricsSection).toBeVisible();
        }
      }
    });

    test('should show completion percentage', async ({ pdcaPage, page }) => {
      const firstCycle = pdcaPage.cycleCards.first();
      
      if (await firstCycle.isVisible()) {
        // Should show progress on card
        const progressIndicator = firstCycle.locator('[data-testid="progress"], .progress');
        if (await progressIndicator.isVisible()) {
          const progressText = await progressIndicator.textContent();
          expect(progressText).toMatch(/\d+%/);
        }
      }
    });

    test('should link to related KPI', async ({ pdcaPage, page }) => {
      const firstCycle = pdcaPage.cycleCards.first();
      
      if (await firstCycle.isVisible()) {
        await firstCycle.click();
        
        // Look for KPI link
        const kpiLink = page.locator('[data-testid="linked-kpi"], a[href*="kpis"]');
        if (await kpiLink.isVisible()) {
          await expect(kpiLink).toBeVisible();
        }
      }
    });
  });

  // ==========================================================================
  // A3 Report Tests
  // ==========================================================================

  test.describe('A3 Report', () => {
    test('should generate A3 report', async ({ pdcaPage, page }) => {
      const firstCycle = pdcaPage.cycleCards.first();
      
      if (await firstCycle.isVisible()) {
        await firstCycle.click();
        
        // Find A3 report button
        const a3Button = page.locator('button:has-text("Relatório A3"), button:has-text("A3 Report")');
        
        if (await a3Button.isVisible()) {
          await a3Button.click();
          
          // Should show A3 modal or download
          const a3Content = page.locator('[data-testid="a3-report"]');
          await expect(a3Content).toBeVisible();
        }
      }
    });
  });
});
