import { test, expect } from '@playwright/test';

/**
 * Testes E2E para Ideias - Navegação Cards ↔ Grid
 * 
 * Pré-requisito: Usuário autenticado
 * TODO: Implementar fixture de autenticação
 */

test.describe('Ideas Grid - Navegação', () => {
  test.skip('SKIP: Requer autenticação', async ({ page }) => {
    // Este teste será habilitado quando tivermos fixture de auth
  });

  // TODO: Implementar após fixture de autenticação
  /*
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@auracore.com');
    await page.fill('[name="password"]', 'Test@123');
    await page.click('button[type="submit"]');
    
    // Aguardar redirecionamento
    await page.waitForURL('/');
  });

  test('deve navegar de Cards para Grid', async ({ page }) => {
    // Ir para página de Ideias (Cards)
    await page.goto('/strategic/ideas');
    
    // Verificar URL
    await expect(page).toHaveURL('/strategic/ideas');
    
    // Clicar em "Grid" no ViewToggle
    await page.click('[aria-label="Visualizar como tabela"]');
    
    // Verificar redirecionamento
    await expect(page).toHaveURL('/strategic/ideas/grid');
    
    // Verificar AG-Grid renderizado
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
  });

  test('deve voltar de Grid para Cards', async ({ page }) => {
    // Ir para página Grid
    await page.goto('/strategic/ideas/grid');
    
    // Verificar URL
    await expect(page).toHaveURL('/strategic/ideas/grid');
    
    // Clicar em "Cards" no ViewToggle
    await page.click('[aria-label="Visualizar como cards"]');
    
    // Verificar redirecionamento
    await expect(page).toHaveURL('/strategic/ideas');
  });

  test('deve expandir Master-Detail (desktop)', async ({ page }) => {
    await page.goto('/strategic/ideas/grid');
    
    // Aguardar Grid carregar
    await page.waitForSelector('.ag-root-wrapper', { timeout: 10000 });
    
    // Aguardar dados carregarem (primeira linha)
    await page.waitForSelector('.ag-row', { timeout: 10000 });
    
    // Clicar na seta de expandir (primeira linha)
    const expandButton = page.locator('.ag-group-contracted').first();
    if (await expandButton.isVisible()) {
      await expandButton.click();
      
      // Verificar Detail Panel visível
      await expect(page.locator('text=Discussões')).toBeVisible({ timeout: 5000 });
    }
  });

  test('deve mostrar colunas corretas', async ({ page }) => {
    await page.goto('/strategic/ideas/grid');
    
    // Aguardar Grid carregar
    await page.waitForSelector('.ag-root-wrapper');
    
    // Verificar headers das colunas principais
    await expect(page.locator('text=Código')).toBeVisible();
    await expect(page.locator('text=Título')).toBeVisible();
    await expect(page.locator('text=Categoria')).toBeVisible();
    await expect(page.locator('text=Status')).toBeVisible();
    await expect(page.locator('text=Votos')).toBeVisible();
    await expect(page.locator('text=Score')).toBeVisible();
  });

  test('deve ter acessibilidade (ARIA labels)', async ({ page }) => {
    await page.goto('/strategic/ideas/grid');
    
    // Verificar ARIA label na tabela
    const gridRegion = page.locator('[role="region"][aria-label*="Ideias"]');
    await expect(gridRegion).toBeVisible();
    
    // Verificar ViewToggle tem ARIA
    const viewToggle = page.locator('[role="group"][aria-label="Alternar visualização"]');
    await expect(viewToggle).toBeVisible();
    
    // Verificar botões têm aria-pressed
    const cardsButton = page.locator('[aria-label="Visualizar como cards"]');
    await expect(cardsButton).toHaveAttribute('aria-pressed');
    
    const gridButton = page.locator('[aria-label="Visualizar como tabela"]');
    await expect(gridButton).toHaveAttribute('aria-pressed', 'true');
  });
  */
});

test.describe('Ideas Grid - Responsividade', () => {
  test.skip('SKIP: Requer autenticação', async ({ page }) => {
    // Placeholder
  });

  // TODO: Implementar testes mobile após auth
  /*
  test('deve adaptar colunas em mobile', async ({ page }) => {
    // Simular mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/strategic/ideas/grid');
    
    // Aguardar Grid carregar
    await page.waitForSelector('.ag-root-wrapper');
    
    // Verificar que apenas colunas prioritárias são visíveis
    await expect(page.locator('[col-id="code"]')).toBeVisible();
    await expect(page.locator('[col-id="title"]')).toBeVisible();
    
    // Colunas secundárias devem estar ocultas
    await expect(page.locator('[col-id="description"]')).not.toBeVisible();
  });
  */
});
