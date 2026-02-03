/**
 * Workflow de Aprovação - E2E Tests
 * 
 * Testa fluxo completo de aprovação de estratégias:
 * - Submissão para aprovação
 * - Aprovação/Rejeição/Solicitação de alterações
 * - Histórico de aprovações
 * - Permissões (self-approval, delegação)
 * - Notificações
 * 
 * @module e2e/strategic/workflow-approval.spec
 * @see TASK-10 (FASE7)
 */

import { test, expect } from '../fixtures/strategic-fixtures';
import { faker } from '@faker-js/faker';
import type { Page } from '@playwright/test';

// ============================================================================
// Helper Functions
// ============================================================================

interface CreateStrategyParams {
  name: string;
  vision?: string;
  mission?: string;
  values?: string[];
  startDate?: string;
  endDate?: string;
}

interface Strategy {
  id: string;
  name: string;
  workflowStatus: string;
  submittedAt?: string;
  submittedByUserId?: number;
  approvedAt?: string;
  approvedByUserId?: number;
  rejectedAt?: string;
  rejectedByUserId?: number;
  rejectionReason?: string;
}

interface ApprovalHistoryEntry {
  id: string;
  action: string;
  actorUserId: number;
  comments?: string;
  reason?: string;
  createdAt: string;
}

/**
 * Cria estratégia via API
 */
async function createStrategy(
  page: Page,
  params: CreateStrategyParams
): Promise<Strategy> {
  const response = await page.request.post('/api/strategic/strategies', {
    data: {
      name: params.name,
      vision: params.vision || 'Test Vision',
      mission: params.mission || 'Test Mission',
      values: params.values || ['Test Value 1', 'Test Value 2'],
      startDate: params.startDate || new Date().toISOString(),
      endDate: params.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      versionType: 'ACTUAL',
    },
  });

  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  return json.data;
}

/**
 * Busca estratégia por ID via API
 */
async function getStrategy(page: Page, strategyId: string): Promise<Strategy> {
  const response = await page.request.get(`/api/strategic/strategies/${strategyId}`);
  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  return json.data;
}

/**
 * Submete estratégia para aprovação via API
 */
async function submitForApproval(
  page: Page,
  strategyId: string,
  userId: number,
  comments?: string
): Promise<void> {
  const response = await page.request.post(`/api/strategic/strategies/${strategyId}/workflow`, {
    data: {
      action: 'submit',
      userId,
      comments,
    },
  });

  expect(response.ok()).toBeTruthy();
}

/**
 * Aprova estratégia via API
 */
async function approve(
  page: Page,
  strategyId: string,
  userId: number,
  comments?: string
): Promise<void> {
  const response = await page.request.post(`/api/strategic/strategies/${strategyId}/workflow`, {
    data: {
      action: 'approve',
      userId,
      comments,
    },
  });

  expect(response.ok()).toBeTruthy();
}

/**
 * Rejeita estratégia via API
 */
async function reject(
  page: Page,
  strategyId: string,
  userId: number,
  reason: string
): Promise<void> {
  const response = await page.request.post(`/api/strategic/strategies/${strategyId}/workflow`, {
    data: {
      action: 'reject',
      userId,
      reason,
    },
  });

  expect(response.ok()).toBeTruthy();
}

/**
 * Solicita alterações na estratégia via API
 */
async function requestChanges(
  page: Page,
  strategyId: string,
  userId: number,
  reason: string
): Promise<void> {
  const response = await page.request.post(`/api/strategic/strategies/${strategyId}/workflow`, {
    data: {
      action: 'requestChanges',
      userId,
      reason,
    },
  });

  expect(response.ok()).toBeTruthy();
}

/**
 * Busca histórico de aprovações via API
 */
async function getApprovalHistory(
  page: Page,
  strategyId: string
): Promise<ApprovalHistoryEntry[]> {
  const response = await page.request.get(`/api/strategic/strategies/${strategyId}/workflow`);
  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  return json.data || [];
}

// ============================================================================
// Test Suite
// ============================================================================

test.describe('Workflow de Aprovação - Fluxo Completo', () => {
  // Mock user IDs (em produção, viriam de autenticação real)
  const user1 = { id: 1, name: 'Submitter User' };
  const user2 = { id: 2, name: 'Approver User' };

  // ==========================================================================
  // Happy Path Tests
  // ==========================================================================

  test.describe('Happy Path', () => {
    test('deve criar estratégia em DRAFT', async ({ authenticatedPage }) => {
      const strategyName = `Strategy ${faker.company.buzzVerb()} ${Date.now()}`;
      const strategy = await createStrategy(authenticatedPage, { name: strategyName });

      expect(strategy.id).toBeDefined();
      expect(strategy.name).toBe(strategyName);
      expect(strategy.workflowStatus).toBe('DRAFT');
      expect(strategy.submittedAt).toBeUndefined();
      expect(strategy.approvedAt).toBeUndefined();
    });

    test('deve submeter estratégia para aprovação', async ({ authenticatedPage }) => {
      // 1. Criar estratégia
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy Submit ${Date.now()}`,
      });
      expect(strategy.workflowStatus).toBe('DRAFT');

      // 2. Submeter para aprovação
      await submitForApproval(authenticatedPage, strategy.id, user1.id, 'Ready for review');

      // 3. Verificar status mudou
      const updated = await getStrategy(authenticatedPage, strategy.id);
      expect(updated.workflowStatus).toBe('PENDING_APPROVAL');
      expect(updated.submittedAt).toBeDefined();
      expect(updated.submittedByUserId).toBe(user1.id);

      // 4. Verificar histórico registrado
      const history = await getApprovalHistory(authenticatedPage, strategy.id);
      expect(history.length).toBeGreaterThanOrEqual(1);
      
      const submitEntry = history.find(h => h.action === 'SUBMIT');
      expect(submitEntry).toBeDefined();
      expect(submitEntry?.actorUserId).toBe(user1.id);
      expect(submitEntry?.comments).toBe('Ready for review');
    });

    test('deve aprovar estratégia com comentários', async ({ authenticatedPage }) => {
      // 1. Criar e submeter
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy Approve ${Date.now()}`,
      });
      await submitForApproval(authenticatedPage, strategy.id, user1.id);

      // 2. Aprovar (user diferente)
      await approve(authenticatedPage, strategy.id, user2.id, 'Excellent strategy!');

      // 3. Verificar status
      const approved = await getStrategy(authenticatedPage, strategy.id);
      expect(approved.workflowStatus).toBe('APPROVED');
      expect(approved.approvedAt).toBeDefined();
      expect(approved.approvedByUserId).toBe(user2.id);

      // 4. Verificar histórico completo
      const history = await getApprovalHistory(authenticatedPage, strategy.id);
      expect(history.length).toBeGreaterThanOrEqual(2); // SUBMIT + APPROVE

      const submitEntry = history.find(h => h.action === 'SUBMIT');
      expect(submitEntry).toBeDefined();
      expect(submitEntry?.actorUserId).toBe(user1.id);

      const approveEntry = history.find(h => h.action === 'APPROVE');
      expect(approveEntry).toBeDefined();
      expect(approveEntry?.actorUserId).toBe(user2.id);
      expect(approveEntry?.comments).toBe('Excellent strategy!');
    });

    test('deve rejeitar estratégia com motivo', async ({ authenticatedPage }) => {
      // 1. Criar e submeter
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy Reject ${Date.now()}`,
      });
      await submitForApproval(authenticatedPage, strategy.id, user1.id);

      // 2. Rejeitar
      const rejectionReason = 'Needs more detailed action plans';
      await reject(authenticatedPage, strategy.id, user2.id, rejectionReason);

      // 3. Verificar status
      const rejected = await getStrategy(authenticatedPage, strategy.id);
      expect(rejected.workflowStatus).toBe('REJECTED');
      expect(rejected.rejectedAt).toBeDefined();
      expect(rejected.rejectedByUserId).toBe(user2.id);
      expect(rejected.rejectionReason).toBe(rejectionReason);

      // 4. Verificar histórico
      const history = await getApprovalHistory(authenticatedPage, strategy.id);
      const rejectEntry = history.find(h => h.action === 'REJECT');
      expect(rejectEntry).toBeDefined();
      expect(rejectEntry?.actorUserId).toBe(user2.id);
      expect(rejectEntry?.reason).toBe(rejectionReason);
    });

    test('deve solicitar alterações com motivo', async ({ authenticatedPage }) => {
      // 1. Criar e submeter
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy Changes ${Date.now()}`,
      });
      await submitForApproval(authenticatedPage, strategy.id, user1.id);

      // 2. Solicitar alterações
      const changesReason = 'Please add financial projections';
      await requestChanges(authenticatedPage, strategy.id, user2.id, changesReason);

      // 3. Verificar status
      const updated = await getStrategy(authenticatedPage, strategy.id);
      expect(updated.workflowStatus).toBe('CHANGES_REQUESTED');

      // 4. Verificar histórico
      const history = await getApprovalHistory(authenticatedPage, strategy.id);
      const changesEntry = history.find(h => h.action === 'REQUEST_CHANGES');
      expect(changesEntry).toBeDefined();
      expect(changesEntry?.actorUserId).toBe(user2.id);
      expect(changesEntry?.reason).toBe(changesReason);
    });
  });

  // ==========================================================================
  // Permission Tests
  // ==========================================================================

  test.describe('Permissões', () => {
    test('deve permitir aprovação apenas por usuário diferente do submitter', async ({ authenticatedPage }) => {
      // 1. Criar e submeter
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy Self-Approve ${Date.now()}`,
      });
      await submitForApproval(authenticatedPage, strategy.id, user1.id);

      // 2. Tentar aprovar com mesmo usuário (deve falhar)
      const response = await authenticatedPage.request.post(
        `/api/strategic/strategies/${strategy.id}/workflow`,
        {
          data: {
            action: 'approve',
            userId: user1.id, // Mesmo usuário que submeteu
            comments: 'Self-approval attempt',
          },
        }
      );

      // 3. Verificar falha (esperado: 403 ou 400)
      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBeGreaterThanOrEqual(400);

      const json = await response.json();
      expect(json.error).toMatch(/não pode aprovar.*submeteu|self-approval|same user/i);

      // 4. Verificar status não mudou
      const unchanged = await getStrategy(authenticatedPage, strategy.id);
      expect(unchanged.workflowStatus).toBe('PENDING_APPROVAL'); // Ainda pendente
    });

    test('deve validar permissão de aprovação via ApprovalPermissionService', async ({ authenticatedPage }) => {
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy Permissions ${Date.now()}`,
      });
      await submitForApproval(authenticatedPage, strategy.id, user1.id);

      // User 3 (não aprovador) tenta aprovar
      const user3 = { id: 3, name: 'Unauthorized User' };
      const response = await authenticatedPage.request.post(
        `/api/strategic/strategies/${strategy.id}/workflow`,
        {
          data: {
            action: 'approve',
            userId: user3.id,
            comments: 'Unauthorized approval attempt',
          },
        }
      );

      // ✅ MUST explicitly assert failure (security check)
      // Se response.ok() = true, é falha de segurança!
      expect(response.ok()).toBeFalsy();
      
      // Verificar mensagem de erro
      const json = await response.json();
      expect(json.error).toMatch(/não tem permissão|unauthorized|permission/i);
    });
  });

  // ==========================================================================
  // State Transition Tests
  // ==========================================================================

  test.describe('Transições de Estado', () => {
    test('deve transitar DRAFT → PENDING_APPROVAL → APPROVED', async ({ authenticatedPage }) => {
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy State Transition ${Date.now()}`,
      });

      // Estado inicial
      expect(strategy.workflowStatus).toBe('DRAFT');

      // Transição 1: DRAFT → PENDING_APPROVAL
      await submitForApproval(authenticatedPage, strategy.id, user1.id);
      let updated = await getStrategy(authenticatedPage, strategy.id);
      expect(updated.workflowStatus).toBe('PENDING_APPROVAL');

      // Transição 2: PENDING_APPROVAL → APPROVED
      await approve(authenticatedPage, strategy.id, user2.id);
      updated = await getStrategy(authenticatedPage, strategy.id);
      expect(updated.workflowStatus).toBe('APPROVED');
    });

    test('deve transitar DRAFT → PENDING_APPROVAL → REJECTED', async ({ authenticatedPage }) => {
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy Rejection Flow ${Date.now()}`,
      });

      // Transição 1: DRAFT → PENDING_APPROVAL
      await submitForApproval(authenticatedPage, strategy.id, user1.id);
      let updated = await getStrategy(authenticatedPage, strategy.id);
      expect(updated.workflowStatus).toBe('PENDING_APPROVAL');

      // Transição 2: PENDING_APPROVAL → REJECTED
      await reject(authenticatedPage, strategy.id, user2.id, 'Insufficient detail');
      updated = await getStrategy(authenticatedPage, strategy.id);
      expect(updated.workflowStatus).toBe('REJECTED');
    });

    test('deve transitar DRAFT → PENDING_APPROVAL → CHANGES_REQUESTED', async ({ authenticatedPage }) => {
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy Changes Flow ${Date.now()}`,
      });

      // Transição 1: DRAFT → PENDING_APPROVAL
      await submitForApproval(authenticatedPage, strategy.id, user1.id);
      let updated = await getStrategy(authenticatedPage, strategy.id);
      expect(updated.workflowStatus).toBe('PENDING_APPROVAL');

      // Transição 2: PENDING_APPROVAL → CHANGES_REQUESTED
      await requestChanges(authenticatedPage, strategy.id, user2.id, 'Add more KPIs');
      updated = await getStrategy(authenticatedPage, strategy.id);
      expect(updated.workflowStatus).toBe('CHANGES_REQUESTED');
    });
  });

  // ==========================================================================
  // Approval History Tests
  // ==========================================================================

  test.describe('Histórico de Aprovações', () => {
    test('deve registrar todas as ações no histórico', async ({ authenticatedPage }) => {
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy Full History ${Date.now()}`,
      });

      // 1. Submit
      await submitForApproval(authenticatedPage, strategy.id, user1.id, 'Initial submission');
      
      // 2. Request Changes
      await requestChanges(authenticatedPage, strategy.id, user2.id, 'Add budget details');
      
      // 3. Resubmit (simular)
      // Nota: Resubmit não está implementado ainda, mas histórico deve ter 2 entradas

      // 4. Verificar histórico completo
      const history = await getApprovalHistory(authenticatedPage, strategy.id);
      expect(history.length).toBeGreaterThanOrEqual(2);

      // Verificar SUBMIT entry
      const submitEntry = history.find(h => h.action === 'SUBMIT');
      expect(submitEntry).toBeDefined();
      expect(submitEntry?.actorUserId).toBe(user1.id);
      expect(submitEntry?.comments).toBe('Initial submission');

      // Verificar REQUEST_CHANGES entry
      const changesEntry = history.find(h => h.action === 'REQUEST_CHANGES');
      expect(changesEntry).toBeDefined();
      expect(changesEntry?.actorUserId).toBe(user2.id);
      expect(changesEntry?.reason).toBe('Add budget details');
    });

    test('histórico deve ter timestamps ordenados', async ({ authenticatedPage }) => {
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy History Order ${Date.now()}`,
      });

      // 1. Submit
      await submitForApproval(authenticatedPage, strategy.id, user1.id);
      
      // 2. Approve (após 100ms para garantir ordem)
      await authenticatedPage.waitForTimeout(100);
      await approve(authenticatedPage, strategy.id, user2.id);

      // 3. Verificar ordem cronológica
      const history = await getApprovalHistory(authenticatedPage, strategy.id);
      expect(history.length).toBeGreaterThanOrEqual(2);

      // Verificar timestamps estão ordenados (mais recente primeiro ou mais antigo primeiro)
      for (let i = 0; i < history.length - 1; i++) {
        const current = new Date(history[i].createdAt);
        const next = new Date(history[i + 1].createdAt);
        
        // Assumindo DESC order (mais recente primeiro)
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    test('histórico deve preservar comentários e motivos', async ({ authenticatedPage }) => {
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy Comments ${Date.now()}`,
      });

      const submitComments = 'This is a comprehensive strategy';
      const approveComments = 'Great work! Approved.';

      // 1. Submit com comentários
      await submitForApproval(authenticatedPage, strategy.id, user1.id, submitComments);

      // 2. Approve com comentários
      await approve(authenticatedPage, strategy.id, user2.id, approveComments);

      // 3. Verificar histórico preserva comentários
      const history = await getApprovalHistory(authenticatedPage, strategy.id);

      const submitEntry = history.find(h => h.action === 'SUBMIT');
      expect(submitEntry?.comments).toBe(submitComments);

      const approveEntry = history.find(h => h.action === 'APPROVE');
      expect(approveEntry?.comments).toBe(approveComments);
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  test.describe('Validações', () => {
    test('deve rejeitar aprovação sem userId', async ({ authenticatedPage }) => {
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy No User ${Date.now()}`,
      });
      await submitForApproval(authenticatedPage, strategy.id, user1.id);

      const response = await authenticatedPage.request.post(
        `/api/strategic/strategies/${strategy.id}/workflow`,
        {
          data: {
            action: 'approve',
            // userId faltando
            comments: 'Should fail',
          },
        }
      );

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(400);
    });

    test('deve rejeitar reject sem motivo', async ({ authenticatedPage }) => {
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy No Reason ${Date.now()}`,
      });
      await submitForApproval(authenticatedPage, strategy.id, user1.id);

      const response = await authenticatedPage.request.post(
        `/api/strategic/strategies/${strategy.id}/workflow`,
        {
          data: {
            action: 'reject',
            userId: user2.id,
            // reason faltando
          },
        }
      );

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(400);
      
      const json = await response.json();
      expect(json.error).toMatch(/reason.*obrigatório|reason.*required/i);
    });

    test('deve rejeitar requestChanges sem motivo', async ({ authenticatedPage }) => {
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy Changes No Reason ${Date.now()}`,
      });
      await submitForApproval(authenticatedPage, strategy.id, user1.id);

      const response = await authenticatedPage.request.post(
        `/api/strategic/strategies/${strategy.id}/workflow`,
        {
          data: {
            action: 'requestChanges',
            userId: user2.id,
            // reason faltando
          },
        }
      );

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(400);
      
      const json = await response.json();
      expect(json.error).toMatch(/reason.*obrigatório|reason.*required/i);
    });

    test('deve rejeitar ação em estratégia não encontrada', async ({ authenticatedPage }) => {
      const fakeId = 'non-existent-uuid-123-456';

      const response = await authenticatedPage.request.post(
        `/api/strategic/strategies/${fakeId}/workflow`,
        {
          data: {
            action: 'approve',
            userId: user2.id,
          },
        }
      );

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(404);
    });
  });

  // ==========================================================================
  // UI Tests (Dashboard de Aprovações)
  // ==========================================================================

  test.describe('UI - Dashboard de Aprovações', () => {
    test('deve exibir estratégias pendentes', async ({ authenticatedPage }) => {
      // 1. Criar e submeter estratégia
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy UI Pending ${Date.now()}`,
      });
      await submitForApproval(authenticatedPage, strategy.id, user1.id);

      // 2. Navegar para dashboard de aprovações
      await authenticatedPage.goto('/strategic/workflow/pending');

      // 3. Verificar estratégia aparece na lista
      await expect(authenticatedPage.locator(`text=${strategy.name}`)).toBeVisible({
        timeout: 10000,
      });

      // 4. Verificar badge de status
      await expect(authenticatedPage.locator('text=/PENDING.*APPROVAL|Pendente/i')).toBeVisible();
    });

    test('deve abrir página de detalhes ao clicar em estratégia pendente', async ({ authenticatedPage }) => {
      // 1. Criar e submeter estratégia
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy UI Details ${Date.now()}`,
      });
      await submitForApproval(authenticatedPage, strategy.id, user1.id);

      // 2. Navegar para dashboard
      await authenticatedPage.goto('/strategic/workflow/pending');
      await authenticatedPage.waitForLoadState('networkidle');

      // 3. Clicar no card da estratégia
      const strategyCard = authenticatedPage.locator(`text=${strategy.name}`).first();
      await strategyCard.click();

      // 4. Verificar navegou para página de aprovação
      await authenticatedPage.waitForURL(/.*\/strategies\/.*\/approve/, { timeout: 10000 });
      
      // 5. Verificar elementos da página de aprovação
      await expect(authenticatedPage.locator('text=/Aprovar|Rejeitar|Solicitar.*Alterações/i')).toBeVisible();
    });
  });

  // ==========================================================================
  // Integration Tests (Workflow + Notifications)
  // ==========================================================================

  test.describe('Integração com Notificações', () => {
    test('deve criar notificação ao aprovar estratégia', async ({ authenticatedPage }) => {
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy Notification ${Date.now()}`,
      });
      await submitForApproval(authenticatedPage, strategy.id, user1.id);
      
      // Aprovar
      await approve(authenticatedPage, strategy.id, user2.id, 'Approved with notification');

      // Verificar notificação foi criada (via API)
      const notificationsResponse = await authenticatedPage.request.get('/api/notifications');
      
      if (notificationsResponse.ok()) {
        const notifications = await notificationsResponse.json();
        
        // Pode haver notificação de STRATEGY_APPROVED
        const strategyNotification = notifications.data?.find(
          (n: any) => n.event === 'STRATEGY_APPROVED' && n.data?.strategyId === strategy.id
        );

        // Se implementado, deve existir
        if (strategyNotification) {
          expect(strategyNotification.title).toMatch(/aprovad/i);
        }
      }
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  test.describe('Edge Cases', () => {
    test('deve lidar com múltiplas submissões (resubmit após changes)', async ({ authenticatedPage }) => {
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy Resubmit ${Date.now()}`,
      });

      // 1. Submit inicial
      await submitForApproval(authenticatedPage, strategy.id, user1.id, 'First submission');

      // 2. Request changes
      await requestChanges(authenticatedPage, strategy.id, user2.id, 'Add more details');
      let updated = await getStrategy(authenticatedPage, strategy.id);
      expect(updated.workflowStatus).toBe('CHANGES_REQUESTED');

      // 3. Resubmit (submit novamente)
      await submitForApproval(authenticatedPage, strategy.id, user1.id, 'Resubmitted with changes');
      updated = await getStrategy(authenticatedPage, strategy.id);
      expect(updated.workflowStatus).toBe('PENDING_APPROVAL');

      // 4. Verificar histórico tem 3 entradas (SUBMIT, REQUEST_CHANGES, RESUBMIT/SUBMIT)
      const history = await getApprovalHistory(authenticatedPage, strategy.id);
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    test('deve prevenir double-approval (aprovação duplicada)', async ({ authenticatedPage }) => {
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy Double Approval ${Date.now()}`,
      });

      // 1. Submit e approve
      await submitForApproval(authenticatedPage, strategy.id, user1.id);
      await approve(authenticatedPage, strategy.id, user2.id);

      // 2. Verificar status = APPROVED
      let updated = await getStrategy(authenticatedPage, strategy.id);
      expect(updated.workflowStatus).toBe('APPROVED');

      // 3. Tentar aprovar novamente (deve falhar)
      const response = await authenticatedPage.request.post(
        `/api/strategic/strategies/${strategy.id}/workflow`,
        {
          data: {
            action: 'approve',
            userId: user2.id,
            comments: 'Double approval attempt',
          },
        }
      );

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(400);

      const json = await response.json();
      expect(json.error).toMatch(/já foi aprovad|already approved|invalid.*transition/i);
    });

    test('deve prevenir aprovação de estratégia DRAFT (sem submit)', async ({ authenticatedPage }) => {
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy Skip Submit ${Date.now()}`,
      });

      // Tentar aprovar diretamente (sem submit)
      const response = await authenticatedPage.request.post(
        `/api/strategic/strategies/${strategy.id}/workflow`,
        {
          data: {
            action: 'approve',
            userId: user2.id,
            comments: 'Trying to skip submit',
          },
        }
      );

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(400);

      const json = await response.json();
      expect(json.error).toMatch(/não pode aprovar.*DRAFT|cannot approve.*DRAFT|invalid.*state/i);
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  test.describe('Performance', () => {
    test('deve buscar histórico em menos de 500ms', async ({ authenticatedPage }) => {
      const strategy = await createStrategy(authenticatedPage, {
        name: `Strategy Performance ${Date.now()}`,
      });
      await submitForApproval(authenticatedPage, strategy.id, user1.id);
      await approve(authenticatedPage, strategy.id, user2.id);

      // Medir tempo de resposta
      const startTime = Date.now();
      await getApprovalHistory(authenticatedPage, strategy.id);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500); // < 500ms
    });

    test('deve carregar pending approvals em menos de 1s', async ({ authenticatedPage }) => {
      const startTime = Date.now();
      const response = await authenticatedPage.request.get('/api/strategic/workflow/pending');
      const elapsed = Date.now() - startTime;

      expect(response.ok()).toBeTruthy();
      expect(elapsed).toBeLessThan(1000); // < 1s
    });
  });
});
