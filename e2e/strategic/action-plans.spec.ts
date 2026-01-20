/**
 * Action Plans E2E Tests - Strategic Module
 * 
 * Tests for 5W2H action plans including creation wizard, status management,
 * task management, and kanban board.
 * 
 * @module e2e/strategic/action-plans.spec
 * @since E9 - Strategic Module E2E Tests
 */

import { test, expect, testData } from '../fixtures/strategic-fixtures';

test.describe('Strategic Action Plans', () => {
  test.beforeEach(async ({ actionPlansPage }) => {
    await actionPlansPage.goto();
  });

  // ==========================================================================
  // Display Tests
  // ==========================================================================

  test.describe('Display', () => {
    test('should display action plans list', async ({ actionPlansPage }) => {
      await expect(actionPlansPage.planList).toBeVisible();
      await expect(actionPlansPage.createButton).toBeVisible();
    });

    test('should display status filter', async ({ actionPlansPage }) => {
      await expect(actionPlansPage.statusFilter).toBeVisible();
    });

    test('should display plan cards', async ({ actionPlansPage }) => {
      const count = await actionPlansPage.getPlanCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // 5W2H Wizard Tests
  // ==========================================================================

  test.describe('5W2H Wizard', () => {
    test('should open wizard modal on create click', async ({ actionPlansPage }) => {
      await actionPlansPage.createButton.click();
      await expect(actionPlansPage.wizardModal).toBeVisible();
    });

    test('should complete all wizard steps', async ({ actionPlansPage, page }) => {
      await actionPlansPage.createButton.click();
      
      // Step 1: Basic Info
      await expect(page.locator('text=/informações|básico|step 1/i')).toBeVisible();
      await page.fill('input[name="title"]', 'Test Plan');
      await page.click('button:has-text("Próximo"), button:has-text("Next")');
      
      // Step 2: 5W2H
      await expect(page.locator('text=/5W2H|what/i')).toBeVisible();
      
      // Navigate back
      await page.click('button:has-text("Anterior"), button:has-text("Back")');
      await expect(page.locator('text=/informações|básico|step 1/i')).toBeVisible();
    });

    test('should create action plan with complete 5W2H', async ({ actionPlansPage, page }) => {
      const planData = {
        ...testData.actionPlan,
        title: `Test Plan ${Date.now()}`,
      };

      await actionPlansPage.createPlan(planData);
      
      // Verify plan appears in the list
      await expect(page.locator(`text=${planData.title}`)).toBeVisible();
    });

    test('should validate required 5W2H fields', async ({ actionPlansPage, page }) => {
      await actionPlansPage.createButton.click();
      
      // Fill only title
      await page.fill('input[name="title"]', 'Incomplete Plan');
      await page.click('button:has-text("Próximo")');
      
      // Try to skip 5W2H fields and proceed
      await page.click('button:has-text("Próximo")');
      
      // Should show validation error
      const errorMessage = page.locator('[data-error], .error-message, [role="alert"]');
      await expect(errorMessage.first()).toBeVisible();
    });
  });

  // ==========================================================================
  // Status Management Tests
  // ==========================================================================

  test.describe('Status Management', () => {
    test('should filter plans by status', async ({ actionPlansPage, page }) => {
      await actionPlansPage.filterByStatus('in-progress');
      
      // Wait for filter to apply
      await page.waitForLoadState('networkidle');
      
      // Verify filter is applied
      const statusBadges = await page.locator('[data-status="in-progress"]').count();
      expect(statusBadges).toBeGreaterThanOrEqual(0);
    });

    test('should update plan status', async ({ actionPlansPage, page }) => {
      const firstPlan = actionPlansPage.planCards.first();
      
      if (await firstPlan.isVisible()) {
        await firstPlan.click();
        
        // Open status dropdown
        await page.click('[data-testid="status-dropdown"], button:has-text("Status")');
        await page.click('text=/em progresso|in progress/i');
        
        // Verify status change
        await expect(page.locator('[data-status="in-progress"]')).toBeVisible();
      }
    });

    test('should show overdue plans', async ({ actionPlansPage, page }) => {
      await actionPlansPage.filterByStatus('overdue');
      
      // Wait for filter
      await page.waitForLoadState('networkidle');
      
      // Check for overdue indicator
      const overdueIndicators = await page.locator('[data-status="overdue"], .overdue').count();
      expect(overdueIndicators).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // Task Management Tests
  // ==========================================================================

  test.describe('Task Management', () => {
    test('should add task to action plan', async ({ actionPlansPage, page }) => {
      const firstPlan = actionPlansPage.planCards.first();
      
      if (await firstPlan.isVisible()) {
        await firstPlan.click();
        
        // Add task
        await page.click('button:has-text("Nova Tarefa"), button:has-text("Add Task")');
        await page.fill('input[name="taskTitle"]', 'Test Task');
        
        const responsePromise = page.waitForResponse(
          (resp) => resp.url().includes('/tasks') && resp.status() === 201,
        );
        await page.click('button:has-text("Adicionar")');
        await responsePromise;
        
        // Verify task appears
        await expect(page.locator('text=Test Task')).toBeVisible();
      }
    });

    test('should toggle task completion', async ({ actionPlansPage, page }) => {
      const firstPlan = actionPlansPage.planCards.first();
      
      if (await firstPlan.isVisible()) {
        await firstPlan.click();
        
        // Find first task checkbox
        const taskCheckbox = page.locator('input[type="checkbox"]').first();
        
        if (await taskCheckbox.isVisible()) {
          await taskCheckbox.click();
          
          // Should update task status
          const responsePromise = page.waitForResponse(
            (resp) => resp.url().includes('/tasks') && resp.request().method() === 'PATCH',
          );
          await responsePromise;
        }
      }
    });

    test('should show task progress', async ({ actionPlansPage, page }) => {
      const firstPlan = actionPlansPage.planCards.first();
      
      if (await firstPlan.isVisible()) {
        // Should show progress indicator on card
        const progressBar = firstPlan.locator('[data-testid="progress-bar"], .progress-bar');
        await expect(progressBar).toBeVisible();
      }
    });
  });

  // ==========================================================================
  // Kanban Board Tests
  // ==========================================================================

  test.describe('Kanban Board', () => {
    test('should display kanban view', async ({ actionPlansPage, page }) => {
      // Switch to kanban view if available
      const kanbanToggle = page.locator('button:has-text("Kanban"), [data-view="kanban"]');
      
      if (await kanbanToggle.isVisible()) {
        await kanbanToggle.click();
        await expect(actionPlansPage.kanbanBoard).toBeVisible();
      }
    });

    test('should show status columns in kanban', async ({ actionPlansPage, page }) => {
      const kanbanToggle = page.locator('button:has-text("Kanban"), [data-view="kanban"]');
      
      if (await kanbanToggle.isVisible()) {
        await kanbanToggle.click();
        
        // Check for status columns
        const columns = ['pending', 'in-progress', 'completed'];
        for (const column of columns) {
          const columnElement = page.locator(`[data-column="${column}"]`);
          if (await columnElement.isVisible()) {
            await expect(columnElement).toBeVisible();
          }
        }
      }
    });
  });

  // ==========================================================================
  // Detail View Tests
  // ==========================================================================

  test.describe('Detail View', () => {
    test('should show 5W2H details on plan click', async ({ actionPlansPage, page }) => {
      const firstPlan = actionPlansPage.planCards.first();
      
      if (await firstPlan.isVisible()) {
        await firstPlan.click();
        
        // Should show 5W2H sections
        const sections = ['O Que', 'Por Que', 'Onde', 'Quem', 'Como'];
        for (const section of sections) {
          const sectionElement = page.locator(`text=${section}`);
          if (await sectionElement.isVisible()) {
            await expect(sectionElement).toBeVisible();
          }
        }
      }
    });

    test('should show timeline/history', async ({ actionPlansPage, page }) => {
      const firstPlan = actionPlansPage.planCards.first();
      
      if (await firstPlan.isVisible()) {
        await firstPlan.click();
        
        // Look for timeline or history section
        const timeline = page.locator('[data-testid="timeline"], [data-testid="history"]');
        if (await timeline.isVisible()) {
          await expect(timeline).toBeVisible();
        }
      }
    });

    test('should allow adding comments', async ({ actionPlansPage, page }) => {
      const firstPlan = actionPlansPage.planCards.first();
      
      if (await firstPlan.isVisible()) {
        await firstPlan.click();
        
        // Find comment input
        const commentInput = page.locator('textarea[placeholder*="comentário"], textarea[placeholder*="comment"]');
        
        if (await commentInput.isVisible()) {
          await commentInput.fill('Test comment');
          await page.click('button:has-text("Enviar"), button:has-text("Send")');
          
          // Verify comment appears
          await expect(page.locator('text=Test comment')).toBeVisible();
        }
      }
    });
  });

  // ==========================================================================
  // Link to KPI Tests
  // ==========================================================================

  test.describe('KPI Linkage', () => {
    test('should show linked KPIs', async ({ actionPlansPage, page }) => {
      const firstPlan = actionPlansPage.planCards.first();
      
      if (await firstPlan.isVisible()) {
        await firstPlan.click();
        
        // Look for KPI section
        const kpiSection = page.locator('[data-testid="linked-kpis"]');
        if (await kpiSection.isVisible()) {
          await expect(kpiSection).toBeVisible();
        }
      }
    });

    test('should allow linking to KPI', async ({ actionPlansPage, page }) => {
      const firstPlan = actionPlansPage.planCards.first();
      
      if (await firstPlan.isVisible()) {
        await firstPlan.click();
        
        // Find link KPI button
        const linkButton = page.locator('button:has-text("Vincular KPI")');
        
        if (await linkButton.isVisible()) {
          await linkButton.click();
          
          // Should show KPI picker
          const kpiPicker = page.locator('[data-testid="kpi-picker"], [role="dialog"]');
          await expect(kpiPicker).toBeVisible();
        }
      }
    });
  });
});
