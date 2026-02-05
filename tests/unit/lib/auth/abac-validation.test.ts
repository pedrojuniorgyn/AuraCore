/**
 * 🔐 ABAC Validation Tests
 * 
 * Testes unitários para as funções de validação ABAC em context.ts
 * 
 * @module tests/unit/lib/auth
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock do Next.js antes de importar context.ts
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      ...body,
      status: init?.status || 200,
    }),
  },
}));

// Mock do auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { 
  validateABACBranchAccess, 
  validateABACResourceAccess,
  validateABACOwnerAccess,
  hasAccessToBranch,
  type TenantContext 
} from '@/lib/auth/context';

// ============================================================================
// FIXTURES
// ============================================================================

const createMockContext = (overrides: Partial<TenantContext> = {}): TenantContext => ({
  userId: 'user-123',
  organizationId: 1,
  role: 'MANAGER',
  branchId: 3, // Default branch
  defaultBranchId: 3,
  allowedBranches: [3, 5, 7], // User has access to branches 3, 5, 7
  isAdmin: false,
  ...overrides,
});

const createAdminContext = (overrides: Partial<TenantContext> = {}): TenantContext => ({
  ...createMockContext(),
  role: 'ADMIN',
  isAdmin: true,
  ...overrides,
});

// ============================================================================
// validateABACBranchAccess (Para POST - criar recursos)
// ============================================================================

describe('validateABACBranchAccess', () => {
  describe('Quando branchId não é fornecido', () => {
    it('deve permitir e usar branchId do contexto (default)', () => {
      const ctx = createMockContext();
      
      const result = validateABACBranchAccess(ctx, undefined);
      
      expect(result.allowed).toBe(true);
      expect(result.effectiveBranchId).toBe(3); // ctx.branchId
    });

    it('deve permitir e usar branchId do contexto quando null', () => {
      const ctx = createMockContext();
      
      const result = validateABACBranchAccess(ctx, null);
      
      expect(result.allowed).toBe(true);
      expect(result.effectiveBranchId).toBe(3);
    });
  });

  describe('Quando usuário é Admin', () => {
    it('deve permitir acesso a qualquer branchId', () => {
      const ctx = createAdminContext();
      
      const result = validateABACBranchAccess(ctx, 999); // Branch não permitida para users normais
      
      expect(result.allowed).toBe(true);
      expect(result.effectiveBranchId).toBe(999);
    });

    it('deve permitir acesso mesmo sem allowedBranches', () => {
      const ctx = createAdminContext({ allowedBranches: [] });
      
      const result = validateABACBranchAccess(ctx, 999);
      
      expect(result.allowed).toBe(true);
      expect(result.effectiveBranchId).toBe(999);
    });
  });

  describe('Quando usuário NÃO é Admin', () => {
    it('deve permitir se branchId está em allowedBranches', () => {
      const ctx = createMockContext();
      
      const result = validateABACBranchAccess(ctx, 5); // Branch 5 está em allowedBranches
      
      expect(result.allowed).toBe(true);
      expect(result.effectiveBranchId).toBe(5);
    });

    it('deve NEGAR se branchId NÃO está em allowedBranches', () => {
      const ctx = createMockContext();
      
      const result = validateABACBranchAccess(ctx, 10); // Branch 10 NÃO está em allowedBranches
      
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('ABAC_BRANCH_DENIED');
      expect(result.message).toContain('não tem permissão');
      expect(result.effectiveBranchId).toBe(3); // Retorna default
    });

    it('deve NEGAR se allowedBranches está vazio e branchId é diferente do default', () => {
      const ctx = createMockContext({ allowedBranches: [] });
      
      const result = validateABACBranchAccess(ctx, 10);
      
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('ABAC_BRANCH_DENIED');
    });

    it('deve permitir se allowedBranches está vazio mas branchId é igual ao default', () => {
      const ctx = createMockContext({ allowedBranches: [] });
      
      const result = validateABACBranchAccess(ctx, 3); // Igual ao ctx.branchId
      
      expect(result.allowed).toBe(true);
      expect(result.effectiveBranchId).toBe(3);
    });
  });
});

// ============================================================================
// validateABACResourceAccess (Para PUT/DELETE - editar/deletar recursos existentes)
// ============================================================================

describe('validateABACResourceAccess', () => {
  describe('Quando usuário é Admin', () => {
    it('deve permitir acesso a recurso de qualquer branch', () => {
      const ctx = createAdminContext();
      
      const result = validateABACResourceAccess(ctx, 999); // Branch não permitida para users normais
      
      expect(result.allowed).toBe(true);
      expect(result.effectiveBranchId).toBe(999);
    });
  });

  describe('Quando usuário NÃO é Admin', () => {
    it('deve permitir se recurso está em branch permitida', () => {
      const ctx = createMockContext();
      
      const result = validateABACResourceAccess(ctx, 5); // Branch 5 está em allowedBranches
      
      expect(result.allowed).toBe(true);
      expect(result.effectiveBranchId).toBe(5);
    });

    it('deve NEGAR se recurso está em branch NÃO permitida', () => {
      const ctx = createMockContext();
      
      const result = validateABACResourceAccess(ctx, 10); // Branch 10 NÃO está em allowedBranches
      
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('ABAC_BRANCH_DENIED');
      expect(result.message).toContain('não tem permissão');
    });
  });
});

// ============================================================================
// validateABACOwnerAccess (Para validar proprietário do recurso)
// ============================================================================

describe('validateABACOwnerAccess', () => {
  describe('Quando usuário é Admin', () => {
    it('deve permitir acesso a recurso de outro usuário', () => {
      const ctx = createAdminContext();
      
      const result = validateABACOwnerAccess(ctx, 'other-user-456');
      
      expect(result.allowed).toBe(true);
    });
  });

  describe('Quando usuário NÃO é Admin', () => {
    it('deve permitir se é dono do recurso', () => {
      const ctx = createMockContext({ userId: 'user-123' });
      
      const result = validateABACOwnerAccess(ctx, 'user-123'); // Mesmo userId
      
      expect(result.allowed).toBe(true);
    });

    it('deve NEGAR se NÃO é dono do recurso', () => {
      const ctx = createMockContext({ userId: 'user-123' });
      
      const result = validateABACOwnerAccess(ctx, 'other-user-456'); // Outro userId
      
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('ABAC_OWNER_DENIED');
      expect(result.message).toContain('não é o proprietário');
    });
  });
});

// ============================================================================
// hasAccessToBranch (Helper básico)
// ============================================================================

describe('hasAccessToBranch', () => {
  it('Admin deve ter acesso a qualquer branch', () => {
    const ctx = createAdminContext();
    
    expect(hasAccessToBranch(ctx, 1)).toBe(true);
    expect(hasAccessToBranch(ctx, 999)).toBe(true);
  });

  it('Usuário deve ter acesso apenas a branches permitidas', () => {
    const ctx = createMockContext({ allowedBranches: [3, 5, 7] });
    
    expect(hasAccessToBranch(ctx, 3)).toBe(true);
    expect(hasAccessToBranch(ctx, 5)).toBe(true);
    expect(hasAccessToBranch(ctx, 7)).toBe(true);
    expect(hasAccessToBranch(ctx, 10)).toBe(false);
    expect(hasAccessToBranch(ctx, 999)).toBe(false);
  });

  it('Usuário sem allowedBranches não deve ter acesso', () => {
    const ctx = createMockContext({ allowedBranches: [] });
    
    expect(hasAccessToBranch(ctx, 1)).toBe(false);
    expect(hasAccessToBranch(ctx, 3)).toBe(false);
  });
});

// ============================================================================
// Cenários de Integração
// ============================================================================

describe('Cenários de Segurança', () => {
  describe('Cenário: Usuário tenta criar viagem em filial não autorizada', () => {
    it('ABAC deve negar e retornar código específico', () => {
      // João: MANAGER com acesso apenas às branches 3 e 5
      const joaoContext = createMockContext({
        userId: 'joao-123',
        role: 'MANAGER',
        allowedBranches: [3, 5],
        branchId: 3,
      });

      // João tenta criar viagem na branch 10 (não autorizada)
      const result = validateABACBranchAccess(joaoContext, 10);

      expect(result.allowed).toBe(false);
      expect(result.code).toBe('ABAC_BRANCH_DENIED');
      expect(result.message).toContain('10');
    });
  });

  describe('Cenário: Admin cria recurso em qualquer filial', () => {
    it('ABAC deve permitir para qualquer branchId', () => {
      const adminContext = createAdminContext();

      // Admin cria recurso na branch 999
      const result = validateABACBranchAccess(adminContext, 999);

      expect(result.allowed).toBe(true);
      expect(result.effectiveBranchId).toBe(999);
    });
  });

  describe('Cenário: Usuário tenta editar goal de outra filial', () => {
    it('ABAC deve negar edição', () => {
      const mariaContext = createMockContext({
        userId: 'maria-456',
        allowedBranches: [3],
        branchId: 3,
      });

      // Goal existente está na branch 7
      const goalBranchId = 7;

      const result = validateABACResourceAccess(mariaContext, goalBranchId);

      expect(result.allowed).toBe(false);
      expect(result.code).toBe('ABAC_BRANCH_DENIED');
    });
  });

  describe('Cenário: Usuário edita próprio perfil', () => {
    it('ABAC deve permitir edição do próprio recurso', () => {
      const ctx = createMockContext({ userId: 'pedro-789' });

      const result = validateABACOwnerAccess(ctx, 'pedro-789');

      expect(result.allowed).toBe(true);
    });
  });

  describe('Cenário: Usuário tenta editar perfil de outro', () => {
    it('ABAC deve negar se não for Admin', () => {
      const ctx = createMockContext({ userId: 'pedro-789' });

      const result = validateABACOwnerAccess(ctx, 'outro-user-123');

      expect(result.allowed).toBe(false);
      expect(result.code).toBe('ABAC_OWNER_DENIED');
    });
  });
});
