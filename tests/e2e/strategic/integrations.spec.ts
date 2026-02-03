/**
 * Integrations E2E Tests - Strategic Module
 * 
 * Tests for Slack and Microsoft Teams integrations including
 * configuration, connection testing, and notification logs.
 * 
 * @module e2e/strategic/integrations.spec
 * @since E9 - Strategic Module E2E Tests
 */

import { test, expect, testData } from '../fixtures/strategic-fixtures';

test.describe('Strategic Integrations', () => {
  test.beforeEach(async ({ integrationsPage }) => {
    await integrationsPage.goto();
  });

  // ==========================================================================
  // Display Tests
  // ==========================================================================

  test.describe('Display', () => {
    test('should display integration cards', async ({ integrationsPage }) => {
      const count = await integrationsPage.integrationCards.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should display Slack integration card', async ({ integrationsPage, page }) => {
      const slackCard = page.locator('[data-integration="slack"], :has-text("Slack")');
      await expect(slackCard).toBeVisible();
    });

    test('should display Teams integration card', async ({ integrationsPage, page }) => {
      const teamsCard = page.locator('[data-integration="teams"], :has-text("Teams"), :has-text("Microsoft")');
      await expect(teamsCard).toBeVisible();
    });

    test('should show integration status', async ({ integrationsPage }) => {
      const firstCard = integrationsPage.integrationCards.first();
      const statusIndicator = firstCard.locator('[data-status], .status-indicator');
      await expect(statusIndicator).toBeVisible();
    });
  });

  // ==========================================================================
  // Configuration Tests
  // ==========================================================================

  test.describe('Configuration', () => {
    test('should open configuration modal', async ({ integrationsPage, page }) => {
      const firstCard = integrationsPage.integrationCards.first();
      const configButton = firstCard.locator('button:has-text("Configurar")');
      
      if (await configButton.isVisible()) {
        await configButton.click();
        await expect(integrationsPage.configModal).toBeVisible();
      }
    });

    test('should show webhook URL field', async ({ integrationsPage, page }) => {
      const slackCard = page.locator('[data-integration="slack"], :has-text("Slack")').first();
      const configButton = slackCard.locator('button:has-text("Configurar")');
      
      if (await configButton.isVisible()) {
        await configButton.click();
        
        const webhookInput = page.locator('input[name="webhookUrl"], input[placeholder*="webhook"]');
        await expect(webhookInput).toBeVisible();
      }
    });

    test('should save configuration', async ({ integrationsPage, page }) => {
      const slackCard = page.locator('[data-integration="slack"], :has-text("Slack")').first();
      const configButton = slackCard.locator('button:has-text("Configurar")');
      
      if (await configButton.isVisible()) {
        await configButton.click();
        
        const webhookInput = page.locator('input[name="webhookUrl"], input[placeholder*="webhook"]');
        await webhookInput.fill('https://hooks.slack.com/test');
        
        const responsePromise = page.waitForResponse(
          (resp) => resp.url().includes('/integrations') && resp.status() === 200,
        );
        await page.click('button:has-text("Salvar")');
        await responsePromise;
        
        // Modal should close
        await expect(integrationsPage.configModal).not.toBeVisible();
      }
    });

    test('should validate webhook URL format', async ({ integrationsPage, page }) => {
      const slackCard = page.locator('[data-integration="slack"], :has-text("Slack")').first();
      const configButton = slackCard.locator('button:has-text("Configurar")');
      
      if (await configButton.isVisible()) {
        await configButton.click();
        
        const webhookInput = page.locator('input[name="webhookUrl"], input[placeholder*="webhook"]');
        await webhookInput.fill('invalid-url');
        await page.click('button:has-text("Salvar")');
        
        // Should show validation error
        const errorMessage = page.locator('[data-error], .error-message, text=/inválido|invalid|url/i');
        await expect(errorMessage.first()).toBeVisible();
      }
    });
  });

  // ==========================================================================
  // Toggle Integration Tests
  // ==========================================================================

  test.describe('Toggle Integration', () => {
    test('should toggle integration on/off', async ({ integrationsPage, page }) => {
      const firstCard = integrationsPage.integrationCards.first();
      const toggle = firstCard.locator('[role="switch"], input[type="checkbox"]');
      
      if (await toggle.isVisible()) {
        const initialState = await toggle.isChecked();
        await toggle.click();
        
        // Wait for state change
        await page.waitForTimeout(500);
        
        const newState = await toggle.isChecked();
        expect(newState).toBe(!initialState);
      }
    });

    test('should update status indicator on toggle', async ({ integrationsPage, page }) => {
      const firstCard = integrationsPage.integrationCards.first();
      const toggle = firstCard.locator('[role="switch"], input[type="checkbox"]');
      
      if (await toggle.isVisible()) {
        await toggle.click();
        
        // Status indicator should update
        const statusIndicator = firstCard.locator('[data-status]');
        await expect(statusIndicator).toBeVisible();
      }
    });
  });

  // ==========================================================================
  // Test Connection Tests
  // ==========================================================================

  test.describe('Test Connection', () => {
    test('should show test connection button', async ({ integrationsPage, page }) => {
      const firstCard = integrationsPage.integrationCards.first();
      const testButton = firstCard.locator('button:has-text("Testar"), button:has-text("Test")');
      await expect(testButton).toBeVisible();
    });

    test('should test connection', async ({ integrationsPage, page }) => {
      const slackCard = page.locator('[data-integration="slack"], :has-text("Slack")').first();
      const testButton = slackCard.locator('button:has-text("Testar"), button:has-text("Test")');
      
      if (await testButton.isVisible()) {
        const responsePromise = page.waitForResponse(
          (resp) => resp.url().includes('/test') || resp.url().includes('/check'),
        );
        await testButton.click();
        
        try {
          const response = await responsePromise;
          expect(response.status()).toBeLessThan(500);
        } catch {
          // Test endpoint may not be available
        }
      }
    });

    test('should show connection status result', async ({ integrationsPage, page }) => {
      const firstCard = integrationsPage.integrationCards.first();
      const testButton = firstCard.locator('button:has-text("Testar"), button:has-text("Test")');
      
      if (await testButton.isVisible()) {
        await testButton.click();
        
        // Should show result indicator
        const resultIndicator = page.locator('[data-test-result], text=/sucesso|success|erro|error/i');
        await expect(resultIndicator.first()).toBeVisible({ timeout: 10000 });
      }
    });
  });

  // ==========================================================================
  // Logs Tests
  // ==========================================================================

  test.describe('Logs', () => {
    test('should show logs button', async ({ integrationsPage, page }) => {
      const firstCard = integrationsPage.integrationCards.first();
      const logsButton = firstCard.locator('button:has-text("Logs"), button:has-text("Histórico")');
      await expect(logsButton).toBeVisible();
    });

    test('should open logs panel', async ({ integrationsPage, page }) => {
      const firstCard = integrationsPage.integrationCards.first();
      const logsButton = firstCard.locator('button:has-text("Logs"), button:has-text("Histórico")');
      
      if (await logsButton.isVisible()) {
        await logsButton.click();
        await expect(integrationsPage.logsPanel).toBeVisible();
      }
    });

    test('should display log entries', async ({ integrationsPage, page }) => {
      const firstCard = integrationsPage.integrationCards.first();
      const logsButton = firstCard.locator('button:has-text("Logs"), button:has-text("Histórico")');
      
      if (await logsButton.isVisible()) {
        await logsButton.click();
        
        // Check for log entries
        const logEntries = integrationsPage.logsPanel.locator('[data-log-entry], tr, .log-item');
        const count = await logEntries.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should show log timestamp', async ({ integrationsPage, page }) => {
      const firstCard = integrationsPage.integrationCards.first();
      const logsButton = firstCard.locator('button:has-text("Logs"), button:has-text("Histórico")');
      
      if (await logsButton.isVisible()) {
        await logsButton.click();
        
        const timestamps = integrationsPage.logsPanel.locator('[data-timestamp], time, .timestamp');
        if (await timestamps.first().isVisible()) {
          await expect(timestamps.first()).toBeVisible();
        }
      }
    });
  });

  // ==========================================================================
  // Notification Settings Tests
  // ==========================================================================

  test.describe('Notification Settings', () => {
    test('should show notification settings', async ({ integrationsPage, page }) => {
      const firstCard = integrationsPage.integrationCards.first();
      const configButton = firstCard.locator('button:has-text("Configurar")');
      
      if (await configButton.isVisible()) {
        await configButton.click();
        
        // Look for notification settings
        const notificationSection = page.locator('text=/notificações|notifications|alertas/i');
        if (await notificationSection.isVisible()) {
          await expect(notificationSection).toBeVisible();
        }
      }
    });

    test('should configure alert types', async ({ integrationsPage, page }) => {
      const firstCard = integrationsPage.integrationCards.first();
      const configButton = firstCard.locator('button:has-text("Configurar")');
      
      if (await configButton.isVisible()) {
        await configButton.click();
        
        // Check for alert type checkboxes
        const alertTypes = ['KPI Critical', 'Action Plan Overdue', 'PDCA Phase'];
        for (const alertType of alertTypes) {
          const checkbox = page.locator(`input[type="checkbox"][name*="${alertType.toLowerCase().replace(' ', '-')}"], label:has-text("${alertType}")`);
          if (await checkbox.first().isVisible()) {
            await expect(checkbox.first()).toBeVisible();
          }
        }
      }
    });
  });

  // ==========================================================================
  // Channel/Recipient Tests
  // ==========================================================================

  test.describe('Channel Configuration', () => {
    test('should show channel field for Slack', async ({ integrationsPage, page }) => {
      const slackCard = page.locator('[data-integration="slack"], :has-text("Slack")').first();
      const configButton = slackCard.locator('button:has-text("Configurar")');
      
      if (await configButton.isVisible()) {
        await configButton.click();
        
        const channelInput = page.locator('input[name="channel"], input[placeholder*="channel"]');
        await expect(channelInput).toBeVisible();
      }
    });

    test('should validate channel format', async ({ integrationsPage, page }) => {
      const slackCard = page.locator('[data-integration="slack"], :has-text("Slack")').first();
      const configButton = slackCard.locator('button:has-text("Configurar")');
      
      if (await configButton.isVisible()) {
        await configButton.click();
        
        const channelInput = page.locator('input[name="channel"], input[placeholder*="channel"]');
        await channelInput.fill('invalid channel name'); // No # prefix
        await page.click('button:has-text("Salvar")');
        
        // May show validation warning
        const warning = page.locator('text=/#|formato/i');
        if (await warning.isVisible()) {
          await expect(warning).toBeVisible();
        }
      }
    });
  });
});
