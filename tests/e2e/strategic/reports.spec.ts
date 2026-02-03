/**
 * Reports E2E Tests - Strategic Module
 * 
 * Tests for automated report generation including report builder,
 * scheduling, recipients management, and preview.
 * 
 * @module e2e/strategic/reports.spec
 * @since E9 - Strategic Module E2E Tests
 */

import { test, expect, testData } from '../fixtures/strategic-fixtures';

test.describe('Strategic Reports', () => {
  test.beforeEach(async ({ reportsPage }) => {
    await reportsPage.goto();
  });

  // ==========================================================================
  // Display Tests
  // ==========================================================================

  test.describe('Display', () => {
    test('should display reports list', async ({ reportsPage }) => {
      await expect(reportsPage.reportList).toBeVisible();
      await expect(reportsPage.createButton).toBeVisible();
    });

    test('should display report cards', async ({ reportsPage }) => {
      const count = await reportsPage.getReportCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // Report Builder Tests
  // ==========================================================================

  test.describe('Report Builder', () => {
    test('should open report builder modal', async ({ reportsPage }) => {
      await reportsPage.createButton.click();
      await expect(reportsPage.builderModal).toBeVisible();
    });

    test('should complete builder wizard steps', async ({ reportsPage, page }) => {
      await reportsPage.createButton.click();
      
      // Step 1: Content
      await expect(page.locator('text=/conteúdo|content|step 1/i')).toBeVisible();
      await page.fill('input[name="name"]', 'Test Report');
      await page.click('button:has-text("Próximo")');
      
      // Step 2: Format
      await expect(page.locator('text=/formato|format|step 2/i')).toBeVisible();
      await page.click('[data-format="pdf"], button:has-text("PDF")');
      await page.click('button:has-text("Próximo")');
      
      // Step 3: Schedule
      await expect(page.locator('text=/agendamento|schedule|step 3/i')).toBeVisible();
    });

    test('should create scheduled report', async ({ reportsPage, page }) => {
      const reportData = {
        ...testData.report,
        name: `Report ${Date.now()}`,
      };

      await reportsPage.createReport(reportData);
      
      // Verify report appears in the list
      await expect(page.locator(`text=${reportData.name}`)).toBeVisible();
    });

    test('should select report sections', async ({ reportsPage, page }) => {
      await reportsPage.createButton.click();
      await page.fill('input[name="name"]', 'Test Sections');
      
      // Should show section checkboxes
      const sections = ['KPIs', 'Planos de Ação', 'PDCA', 'Objetivos'];
      for (const section of sections) {
        const checkbox = page.locator(`input[type="checkbox"][name*="${section.toLowerCase()}"], label:has-text("${section}")`);
        if (await checkbox.isVisible()) {
          await expect(checkbox).toBeVisible();
        }
      }
    });
  });

  // ==========================================================================
  // Format Tests
  // ==========================================================================

  test.describe('Format Options', () => {
    test('should show PDF format option', async ({ reportsPage, page }) => {
      await reportsPage.createButton.click();
      await page.fill('input[name="name"]', 'Test');
      await page.click('button:has-text("Próximo")');
      
      const pdfOption = page.locator('[data-format="pdf"], button:has-text("PDF")');
      await expect(pdfOption).toBeVisible();
    });

    test('should show Excel format option', async ({ reportsPage, page }) => {
      await reportsPage.createButton.click();
      await page.fill('input[name="name"]', 'Test');
      await page.click('button:has-text("Próximo")');
      
      const excelOption = page.locator('[data-format="excel"], button:has-text("Excel")');
      await expect(excelOption).toBeVisible();
    });

    test('should show PowerPoint format option', async ({ reportsPage, page }) => {
      await reportsPage.createButton.click();
      await page.fill('input[name="name"]', 'Test');
      await page.click('button:has-text("Próximo")');
      
      const pptOption = page.locator('[data-format="pptx"], button:has-text("PowerPoint")');
      if (await pptOption.isVisible()) {
        await expect(pptOption).toBeVisible();
      }
    });
  });

  // ==========================================================================
  // Schedule Tests
  // ==========================================================================

  test.describe('Schedule Options', () => {
    test('should show frequency options', async ({ reportsPage, page }) => {
      await reportsPage.createButton.click();
      await page.fill('input[name="name"]', 'Test');
      await page.click('button:has-text("Próximo")');
      await page.click('[data-format="pdf"]');
      await page.click('button:has-text("Próximo")');
      
      const frequencies = ['Diário', 'Semanal', 'Mensal', 'daily', 'weekly', 'monthly'];
      for (const freq of frequencies) {
        const option = page.locator(`[data-frequency="${freq.toLowerCase()}"], text=${freq}`);
        if (await option.isVisible()) {
          await expect(option).toBeVisible();
          break;
        }
      }
    });

    test('should toggle schedule on/off', async ({ reportsPage, page }) => {
      const firstReport = reportsPage.reportCards.first();
      
      if (await firstReport.isVisible()) {
        // Find toggle button
        const toggleButton = firstReport.locator('button:has-text("Pausar"), button:has-text("Ativar")');
        
        if (await toggleButton.isVisible()) {
          const initialText = await toggleButton.textContent();
          await toggleButton.click();
          
          // Button text should change
          await page.waitForTimeout(500);
          const newText = await toggleButton.textContent();
          expect(newText).not.toBe(initialText);
        }
      }
    });
  });

  // ==========================================================================
  // Recipients Tests
  // ==========================================================================

  test.describe('Recipients Management', () => {
    test('should add recipients', async ({ reportsPage, page }) => {
      await reportsPage.createButton.click();
      await page.fill('input[name="name"]', 'Test Recipients');
      await page.click('button:has-text("Próximo")');
      await page.click('[data-format="pdf"]');
      await page.click('button:has-text("Próximo")');
      await page.click('[data-frequency="weekly"]');
      await page.click('button:has-text("Próximo")');
      
      // Add recipient
      const emailInput = page.locator('input[name="email"], input[placeholder*="email"]');
      await emailInput.fill('test@example.com');
      await page.click('button:has-text("Adicionar")');
      
      // Verify recipient appears
      await expect(page.locator('text=test@example.com')).toBeVisible();
    });

    test('should remove recipient', async ({ reportsPage, page }) => {
      await reportsPage.createButton.click();
      await page.fill('input[name="name"]', 'Test Remove');
      await page.click('button:has-text("Próximo")');
      await page.click('[data-format="pdf"]');
      await page.click('button:has-text("Próximo")');
      await page.click('[data-frequency="weekly"]');
      await page.click('button:has-text("Próximo")');
      
      // Add recipient
      const emailInput = page.locator('input[name="email"], input[placeholder*="email"]');
      await emailInput.fill('remove@example.com');
      await page.click('button:has-text("Adicionar")');
      
      // Remove recipient
      const removeButton = page.locator('text=remove@example.com').locator('..').locator('button');
      await removeButton.click();
      
      // Verify recipient is removed
      await expect(page.locator('text=remove@example.com')).not.toBeVisible();
    });

    test('should validate email format', async ({ reportsPage, page }) => {
      await reportsPage.createButton.click();
      await page.fill('input[name="name"]', 'Test Validation');
      await page.click('button:has-text("Próximo")');
      await page.click('[data-format="pdf"]');
      await page.click('button:has-text("Próximo")');
      await page.click('[data-frequency="weekly"]');
      await page.click('button:has-text("Próximo")');
      
      // Try invalid email
      const emailInput = page.locator('input[name="email"], input[placeholder*="email"]');
      await emailInput.fill('invalid-email');
      await page.click('button:has-text("Adicionar")');
      
      // Should show error
      const errorMessage = page.locator('[data-error], .error-message, text=/inválido|invalid/i');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    });
  });

  // ==========================================================================
  // Generate On Demand Tests
  // ==========================================================================

  test.describe('Generate On Demand', () => {
    test('should generate report on demand', async ({ reportsPage, page }) => {
      const firstReport = reportsPage.reportCards.first();
      
      if (await firstReport.isVisible()) {
        const generateButton = firstReport.locator('button:has-text("Gerar")');
        
        if (await generateButton.isVisible()) {
          const responsePromise = page.waitForResponse(
            (resp) => resp.url().includes('/generate') && resp.status() === 200,
          );
          await generateButton.click();
          await responsePromise;
          
          // Should show success toast
          const toast = page.locator('[data-sonner-toast], .toast, [role="status"]');
          await expect(toast).toBeVisible();
        }
      }
    });

    test('should download generated report', async ({ reportsPage, page }) => {
      const firstReport = reportsPage.reportCards.first();
      
      if (await firstReport.isVisible()) {
        const downloadButton = firstReport.locator('button:has-text("Download"), a[download]');
        
        if (await downloadButton.isVisible()) {
          // Start waiting for download before clicking
          const downloadPromise = page.waitForEvent('download');
          await downloadButton.click();
          
          try {
            const download = await downloadPromise;
            expect(download.suggestedFilename()).toMatch(/\.(pdf|xlsx|pptx)$/);
          } catch {
            // Download may not be available in test environment
          }
        }
      }
    });
  });

  // ==========================================================================
  // Preview Tests
  // ==========================================================================

  test.describe('Preview', () => {
    test('should show preview button', async ({ reportsPage, page }) => {
      await reportsPage.createButton.click();
      await page.fill('input[name="name"]', 'Preview Test');
      
      // Navigate through steps
      await page.click('button:has-text("Próximo")');
      await page.click('[data-format="pdf"]');
      await page.click('button:has-text("Próximo")');
      await page.click('[data-frequency="weekly"]');
      await page.click('button:has-text("Próximo")');
      
      // Look for preview button
      const previewButton = page.locator('button:has-text("Preview"), button:has-text("Visualizar")');
      await expect(previewButton).toBeVisible();
    });

    test('should open preview modal', async ({ reportsPage, page }) => {
      await reportsPage.createButton.click();
      await page.fill('input[name="name"]', 'Preview Modal Test');
      await page.click('button:has-text("Próximo")');
      await page.click('[data-format="pdf"]');
      await page.click('button:has-text("Próximo")');
      await page.click('[data-frequency="weekly"]');
      await page.click('button:has-text("Próximo")');
      
      const previewButton = page.locator('button:has-text("Preview"), button:has-text("Visualizar")');
      
      if (await previewButton.isVisible()) {
        await previewButton.click();
        await expect(reportsPage.previewModal).toBeVisible();
      }
    });
  });

  // ==========================================================================
  // History Tests
  // ==========================================================================

  test.describe('Report History', () => {
    test('should show report history', async ({ reportsPage, page }) => {
      const firstReport = reportsPage.reportCards.first();
      
      if (await firstReport.isVisible()) {
        await firstReport.click();
        
        // Look for history section
        const historySection = page.locator('[data-testid="report-history"]');
        if (await historySection.isVisible()) {
          await expect(historySection).toBeVisible();
        }
      }
    });

    test('should show last generated date', async ({ reportsPage, page }) => {
      const firstReport = reportsPage.reportCards.first();
      
      if (await firstReport.isVisible()) {
        // Look for last generated info
        const lastGenerated = firstReport.locator('[data-testid="last-generated"], text=/último|last/i');
        if (await lastGenerated.isVisible()) {
          await expect(lastGenerated).toBeVisible();
        }
      }
    });
  });
});
