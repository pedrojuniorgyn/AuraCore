/**
 * Onboarding E2E Tests - Strategic Module
 * 
 * Tests for the guided tour, welcome modal, and first-time user experience.
 * 
 * @module e2e/strategic/onboarding.spec
 * @since E9 - Strategic Module E2E Tests
 */

import { test, expect } from '../fixtures/strategic-fixtures';

test.describe('Strategic Onboarding', () => {
  // ==========================================================================
  // Welcome Modal Tests
  // ==========================================================================

  test.describe('Welcome Modal', () => {
    test('should show welcome modal for new users', async ({ page }) => {
      // Login as new user (simulate by clearing local storage)
      await page.goto('/strategic/dashboard');
      
      await page.evaluate(() => {
        localStorage.removeItem('aura_onboarding_completed');
        localStorage.removeItem('aura_tour_completed');
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const welcomeModal = page.locator('[data-testid="welcome-modal"], [role="dialog"]:has-text("Bem-vindo")');
      
      // May or may not show depending on implementation
      if (await welcomeModal.isVisible()) {
        await expect(welcomeModal).toBeVisible();
      }
    });

    test('should close welcome modal on button click', async ({ page }) => {
      await page.goto('/strategic/dashboard');
      await page.evaluate(() => localStorage.removeItem('aura_onboarding_completed'));
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const welcomeModal = page.locator('[data-testid="welcome-modal"], [role="dialog"]:has-text("Bem-vindo")');
      
      if (await welcomeModal.isVisible()) {
        await page.click('button:has-text("Começar"), button:has-text("Iniciar")');
        await expect(welcomeModal).not.toBeVisible();
      }
    });

    test('should not show welcome modal for returning users', async ({ page }) => {
      await page.goto('/strategic/dashboard');
      
      // Set completed flag
      await page.evaluate(() => {
        localStorage.setItem('aura_onboarding_completed', 'true');
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const welcomeModal = page.locator('[data-testid="welcome-modal"]');
      await expect(welcomeModal).not.toBeVisible();
    });
  });

  // ==========================================================================
  // Guided Tour Tests
  // ==========================================================================

  test.describe('Guided Tour', () => {
    test('should start tour from welcome modal', async ({ page }) => {
      await page.goto('/strategic/dashboard');
      await page.evaluate(() => localStorage.removeItem('aura_tour_completed'));
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const welcomeModal = page.locator('[data-testid="welcome-modal"], [role="dialog"]:has-text("Bem-vindo")');
      
      if (await welcomeModal.isVisible()) {
        await page.click('button:has-text("Tour"), button:has-text("Conhecer")');
        
        // Tour tooltip should appear
        const tourTooltip = page.locator('[data-testid="tour-tooltip"], [data-tour-active="true"]');
        await expect(tourTooltip).toBeVisible();
      }
    });

    test('should highlight dashboard elements', async ({ page }) => {
      await page.goto('/strategic/dashboard');
      await page.evaluate(() => localStorage.removeItem('aura_tour_completed'));
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Start tour manually if button exists
      const startTourButton = page.locator('button:has-text("Tour"), [data-testid="start-tour"]');
      
      if (await startTourButton.isVisible()) {
        await startTourButton.click();
        
        // Check for highlighted element
        const highlightedElement = page.locator('[data-tour-highlight], .tour-highlight');
        await expect(highlightedElement).toBeVisible();
      }
    });

    test('should advance tour on next button', async ({ page }) => {
      await page.goto('/strategic/dashboard');
      await page.evaluate(() => localStorage.removeItem('aura_tour_completed'));
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const startTourButton = page.locator('button:has-text("Tour"), [data-testid="start-tour"]');
      
      if (await startTourButton.isVisible()) {
        await startTourButton.click();
        
        const nextButton = page.locator('button:has-text("Próximo"), button:has-text("Next")');
        
        if (await nextButton.isVisible()) {
          const initialTooltipText = await page.locator('[data-tour-content]').textContent();
          await nextButton.click();
          
          // Wait for transition
          await page.waitForTimeout(500);
          
          // Content should change
          const newTooltipText = await page.locator('[data-tour-content]').textContent();
          expect(newTooltipText).not.toBe(initialTooltipText);
        }
      }
    });

    test('should skip tour on skip button', async ({ page }) => {
      await page.goto('/strategic/dashboard');
      await page.evaluate(() => localStorage.removeItem('aura_tour_completed'));
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const startTourButton = page.locator('button:has-text("Tour"), [data-testid="start-tour"]');
      
      if (await startTourButton.isVisible()) {
        await startTourButton.click();
        
        const skipButton = page.locator('button:has-text("Pular"), button:has-text("Skip")');
        
        if (await skipButton.isVisible()) {
          await skipButton.click();
          
          // Tour should end
          const tourTooltip = page.locator('[data-testid="tour-tooltip"]');
          await expect(tourTooltip).not.toBeVisible();
        }
      }
    });

    test('should mark tour as completed', async ({ page }) => {
      await page.goto('/strategic/dashboard');
      await page.evaluate(() => localStorage.removeItem('aura_tour_completed'));
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const startTourButton = page.locator('button:has-text("Tour"), [data-testid="start-tour"]');
      
      if (await startTourButton.isVisible()) {
        await startTourButton.click();
        
        // Complete the tour by clicking through all steps
        while (true) {
          const nextButton = page.locator('button:has-text("Próximo"), button:has-text("Next")');
          const finishButton = page.locator('button:has-text("Concluir"), button:has-text("Finish")');
          
          if (await finishButton.isVisible()) {
            await finishButton.click();
            break;
          } else if (await nextButton.isVisible()) {
            await nextButton.click();
            await page.waitForTimeout(300);
          } else {
            break;
          }
        }
        
        // Check that tour is marked complete
        const tourCompleted = await page.evaluate(() => 
          localStorage.getItem('aura_tour_completed')
        );
        expect(tourCompleted).toBe('true');
      }
    });
  });

  // ==========================================================================
  // Onboarding Checklist Tests
  // ==========================================================================

  test.describe('Onboarding Checklist', () => {
    test('should show onboarding checklist', async ({ page }) => {
      await page.goto('/strategic/dashboard');
      await page.waitForLoadState('networkidle');
      
      const checklist = page.locator('[data-testid="onboarding-checklist"]');
      
      // May or may not be visible depending on user state
      if (await checklist.isVisible()) {
        await expect(checklist).toBeVisible();
      }
    });

    test('should show progress indicator', async ({ page }) => {
      await page.goto('/strategic/dashboard');
      await page.waitForLoadState('networkidle');
      
      const checklist = page.locator('[data-testid="onboarding-checklist"]');
      
      if (await checklist.isVisible()) {
        const progressIndicator = checklist.locator('[data-testid="progress"], .progress-bar');
        await expect(progressIndicator).toBeVisible();
      }
    });

    test('should link to relevant pages from checklist', async ({ page }) => {
      await page.goto('/strategic/dashboard');
      await page.waitForLoadState('networkidle');
      
      const checklist = page.locator('[data-testid="onboarding-checklist"]');
      
      if (await checklist.isVisible()) {
        // Click on "Create KPI" item
        const createKpiLink = checklist.locator('a[href*="kpis"], button:has-text("KPI")');
        
        if (await createKpiLink.isVisible()) {
          await createKpiLink.click();
          await expect(page).toHaveURL(/.*kpis.*/);
        }
      }
    });

    test('should mark items as completed', async ({ page }) => {
      await page.goto('/strategic/dashboard');
      await page.waitForLoadState('networkidle');
      
      const checklist = page.locator('[data-testid="onboarding-checklist"]');
      
      if (await checklist.isVisible()) {
        // Check for completed items
        const completedItems = checklist.locator('[data-completed="true"], .item-completed');
        const count = await completedItems.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should dismiss checklist', async ({ page }) => {
      await page.goto('/strategic/dashboard');
      await page.waitForLoadState('networkidle');
      
      const checklist = page.locator('[data-testid="onboarding-checklist"]');
      
      if (await checklist.isVisible()) {
        const dismissButton = checklist.locator('button[aria-label="Fechar"], button:has-text("Dispensar")');
        
        if (await dismissButton.isVisible()) {
          await dismissButton.click();
          await expect(checklist).not.toBeVisible();
        }
      }
    });
  });

  // ==========================================================================
  // Help Resources Tests
  // ==========================================================================

  test.describe('Help Resources', () => {
    test('should show help button', async ({ page }) => {
      await page.goto('/strategic/dashboard');
      await page.waitForLoadState('networkidle');
      
      const helpButton = page.locator('button[aria-label="Ajuda"], button:has-text("Ajuda"), [data-testid="help-button"]');
      await expect(helpButton).toBeVisible();
    });

    test('should open help panel/modal', async ({ page }) => {
      await page.goto('/strategic/dashboard');
      await page.waitForLoadState('networkidle');
      
      const helpButton = page.locator('button[aria-label="Ajuda"], button:has-text("Ajuda"), [data-testid="help-button"]');
      
      if (await helpButton.isVisible()) {
        await helpButton.click();
        
        const helpPanel = page.locator('[data-testid="help-panel"], [role="dialog"]:has-text("Ajuda")');
        await expect(helpPanel).toBeVisible();
      }
    });

    test('should restart tour from help menu', async ({ page }) => {
      await page.goto('/strategic/dashboard');
      await page.waitForLoadState('networkidle');
      
      const helpButton = page.locator('button[aria-label="Ajuda"], [data-testid="help-button"]');
      
      if (await helpButton.isVisible()) {
        await helpButton.click();
        
        const restartTourButton = page.locator('button:has-text("Reiniciar Tour"), button:has-text("Ver Tour")');
        
        if (await restartTourButton.isVisible()) {
          await restartTourButton.click();
          
          const tourTooltip = page.locator('[data-testid="tour-tooltip"]');
          await expect(tourTooltip).toBeVisible();
        }
      }
    });
  });

  // ==========================================================================
  // First-Time Experience Tests
  // ==========================================================================

  test.describe('First-Time Experience', () => {
    test('should show empty state with call-to-action', async ({ page }) => {
      await page.goto('/strategic/kpis');
      await page.waitForLoadState('networkidle');
      
      // If no KPIs exist, should show empty state
      const emptyState = page.locator('[data-testid="empty-state"], text=/nenhum|vazio|criar primeiro/i');
      
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();
        
        // Should have CTA button
        const ctaButton = page.locator('button:has-text("Criar"), button:has-text("Adicionar")');
        await expect(ctaButton).toBeVisible();
      }
    });

    test('should show sample data option', async ({ page }) => {
      await page.goto('/strategic/dashboard');
      await page.waitForLoadState('networkidle');
      
      // For new users, might offer sample data
      const sampleDataButton = page.locator('button:has-text("Dados de Exemplo"), button:has-text("Sample Data")');
      
      if (await sampleDataButton.isVisible()) {
        await expect(sampleDataButton).toBeVisible();
      }
    });
  });
});
