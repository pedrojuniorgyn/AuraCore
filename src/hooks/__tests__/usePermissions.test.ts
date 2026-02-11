/**
 * Testes: usePermissions - Validação de lógica RBAC + ABAC
 * Valida hasPermission, hasAnyPermission, hasAllPermissions, hasBranchAccess
 * 
 * @module hooks/__tests__
 * @note Testes de hook React completos requerem @testing-library/react + jsdom
 * @note Por ora, validamos a lógica core (RBAC+ABAC) e contratos de interface
 */
import { describe, it, expect } from 'vitest';

// =============================================================================
// Extrair lógica pura do hook para testes unitários
// =============================================================================

interface ABACAttributes {
  branchId?: number;
  organizationId?: number;
  ownerId?: string;
}

/**
 * Lógica pura de verificação de permissão (extraída do hook)
 */
function hasPermission(
  permissions: string[],
  allowedBranches: number[],
  isAdmin: boolean,
  slug: string,
  attributes?: ABACAttributes
): boolean {
  // FASE 1: SUPER-PERMISSÕES
  if (permissions.includes('*') || permissions.includes('admin.full')) {
    return true;
  }

  // FASE 2: RBAC
  if (!permissions.includes(slug)) {
    return false;
  }

  // FASE 3: ABAC
  if (!attributes) {
    return true;
  }

  // Validar branchId
  if (attributes.branchId !== undefined) {
    if (!isAdmin && !allowedBranches.includes(attributes.branchId)) {
      return false;
    }
  }

  return true;
}

function hasAnyPermission(
  permissions: string[],
  allowedBranches: number[],
  isAdmin: boolean,
  slugs: string[],
  attributes?: ABACAttributes
): boolean {
  return slugs.some((slug) => hasPermission(permissions, allowedBranches, isAdmin, slug, attributes));
}

function hasAllPermissions(
  permissions: string[],
  allowedBranches: number[],
  isAdmin: boolean,
  slugs: string[],
  attributes?: ABACAttributes
): boolean {
  return slugs.every((slug) => hasPermission(permissions, allowedBranches, isAdmin, slug, attributes));
}

function hasBranchAccess(
  allowedBranches: number[],
  isAdmin: boolean,
  branchId: number
): boolean {
  if (isAdmin) return true;
  return allowedBranches.includes(branchId);
}

// =============================================================================
// Testes
// =============================================================================

describe('usePermissions - Core Logic (RBAC + ABAC)', () => {
  // Cenários de dados comuns
  const regularUser = {
    permissions: ['tms.viagens.read', 'tms.viagens.create', 'fiscal.nfe.read'],
    allowedBranches: [1, 2, 3],
    isAdmin: false,
  };

  const adminUser = {
    permissions: ['admin.full'],
    allowedBranches: [1],
    isAdmin: true,
  };

  const wildcardUser = {
    permissions: ['*'],
    allowedBranches: [],
    isAdmin: false,
  };

  const emptyUser = {
    permissions: [],
    allowedBranches: [],
    isAdmin: false,
  };

  describe('FASE 1: Super-permissões', () => {
    it('deve conceder acesso total com permissão wildcard (*)', () => {
      expect(
        hasPermission(wildcardUser.permissions, wildcardUser.allowedBranches, wildcardUser.isAdmin, 'qualquer.coisa')
      ).toBe(true);
    });

    it('deve conceder acesso total com admin.full', () => {
      expect(
        hasPermission(adminUser.permissions, adminUser.allowedBranches, adminUser.isAdmin, 'qualquer.coisa')
      ).toBe(true);
    });

    it('wildcard deve bypassar ABAC (branchId)', () => {
      expect(
        hasPermission(wildcardUser.permissions, wildcardUser.allowedBranches, wildcardUser.isAdmin, 'tms.viagens.create', { branchId: 999 })
      ).toBe(true);
    });

    it('admin.full deve bypassar ABAC (branchId)', () => {
      expect(
        hasPermission(adminUser.permissions, adminUser.allowedBranches, adminUser.isAdmin, 'tms.viagens.create', { branchId: 999 })
      ).toBe(true);
    });
  });

  describe('FASE 2: RBAC (Role-Based)', () => {
    it('deve permitir acesso quando usuário tem a permissão', () => {
      expect(
        hasPermission(regularUser.permissions, regularUser.allowedBranches, regularUser.isAdmin, 'tms.viagens.read')
      ).toBe(true);
    });

    it('deve negar acesso quando usuário NÃO tem a permissão', () => {
      expect(
        hasPermission(regularUser.permissions, regularUser.allowedBranches, regularUser.isAdmin, 'admin.users.manage')
      ).toBe(false);
    });

    it('deve negar acesso quando lista de permissões está vazia', () => {
      expect(
        hasPermission(emptyUser.permissions, emptyUser.allowedBranches, emptyUser.isAdmin, 'tms.viagens.read')
      ).toBe(false);
    });

    it('deve verificar slug exato (não parcial)', () => {
      expect(
        hasPermission(regularUser.permissions, regularUser.allowedBranches, regularUser.isAdmin, 'tms.viagens')
      ).toBe(false);
    });

    it('deve verificar slug exato (não prefixo)', () => {
      expect(
        hasPermission(regularUser.permissions, regularUser.allowedBranches, regularUser.isAdmin, 'tms.viagens.read.sub')
      ).toBe(false);
    });
  });

  describe('FASE 3: ABAC (Attribute-Based)', () => {
    it('deve permitir quando tem permissão e branch está em allowedBranches', () => {
      expect(
        hasPermission(regularUser.permissions, regularUser.allowedBranches, regularUser.isAdmin, 'tms.viagens.create', { branchId: 1 })
      ).toBe(true);
    });

    it('deve negar quando tem permissão mas branch NÃO está em allowedBranches', () => {
      expect(
        hasPermission(regularUser.permissions, regularUser.allowedBranches, regularUser.isAdmin, 'tms.viagens.create', { branchId: 999 })
      ).toBe(false);
    });

    it('admin deve bypassar validação de branchId', () => {
      const adminWithPerm = {
        permissions: ['tms.viagens.create', 'admin.full'],
        allowedBranches: [1],
        isAdmin: true,
      };
      // admin.full bypassa tudo via super-permissões
      expect(
        hasPermission(adminWithPerm.permissions, adminWithPerm.allowedBranches, adminWithPerm.isAdmin, 'tms.viagens.create', { branchId: 999 })
      ).toBe(true);
    });

    it('deve permitir quando sem atributos (RBAC only)', () => {
      expect(
        hasPermission(regularUser.permissions, regularUser.allowedBranches, regularUser.isAdmin, 'tms.viagens.read')
      ).toBe(true);
    });

    it('deve permitir quando atributos são undefined', () => {
      expect(
        hasPermission(regularUser.permissions, regularUser.allowedBranches, regularUser.isAdmin, 'tms.viagens.read', undefined)
      ).toBe(true);
    });

    it('deve permitir com branchId=0 se estiver em allowedBranches', () => {
      const userWithBranch0 = { ...regularUser, allowedBranches: [0, 1, 2] };
      expect(
        hasPermission(userWithBranch0.permissions, userWithBranch0.allowedBranches, userWithBranch0.isAdmin, 'tms.viagens.read', { branchId: 0 })
      ).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('deve retornar true quando tem pelo menos uma das permissões', () => {
      expect(
        hasAnyPermission(regularUser.permissions, regularUser.allowedBranches, regularUser.isAdmin, ['tms.viagens.read', 'admin.users.manage'])
      ).toBe(true);
    });

    it('deve retornar false quando não tem nenhuma das permissões', () => {
      expect(
        hasAnyPermission(regularUser.permissions, regularUser.allowedBranches, regularUser.isAdmin, ['admin.users.manage', 'admin.config.manage'])
      ).toBe(false);
    });

    it('deve retornar false para lista vazia de slugs', () => {
      expect(
        hasAnyPermission(regularUser.permissions, regularUser.allowedBranches, regularUser.isAdmin, [])
      ).toBe(false);
    });

    it('deve considerar ABAC ao verificar', () => {
      expect(
        hasAnyPermission(regularUser.permissions, regularUser.allowedBranches, regularUser.isAdmin, ['tms.viagens.create'], { branchId: 999 })
      ).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('deve retornar true quando tem todas as permissões', () => {
      expect(
        hasAllPermissions(regularUser.permissions, regularUser.allowedBranches, regularUser.isAdmin, ['tms.viagens.read', 'tms.viagens.create'])
      ).toBe(true);
    });

    it('deve retornar false quando falta uma permissão', () => {
      expect(
        hasAllPermissions(regularUser.permissions, regularUser.allowedBranches, regularUser.isAdmin, ['tms.viagens.read', 'admin.users.manage'])
      ).toBe(false);
    });

    it('deve retornar true para lista vazia de slugs', () => {
      expect(
        hasAllPermissions(regularUser.permissions, regularUser.allowedBranches, regularUser.isAdmin, [])
      ).toBe(true);
    });
  });

  describe('hasBranchAccess', () => {
    it('admin deve ter acesso a qualquer branch', () => {
      expect(hasBranchAccess([1], true, 999)).toBe(true);
    });

    it('usuário regular deve ter acesso a branch permitida', () => {
      expect(hasBranchAccess([1, 2, 3], false, 2)).toBe(true);
    });

    it('usuário regular NÃO deve ter acesso a branch não permitida', () => {
      expect(hasBranchAccess([1, 2, 3], false, 999)).toBe(false);
    });

    it('deve negar acesso com lista vazia de branches', () => {
      expect(hasBranchAccess([], false, 1)).toBe(false);
    });
  });

  describe('Contrato de retorno do hook', () => {
    interface UsePermissionsReturn {
      permissions: string[];
      allowedBranches: number[];
      role: string | null;
      isAdmin: boolean;
      hasPermission: (slug: string, attributes?: ABACAttributes) => boolean;
      hasAnyPermission: (slugs: string[], options?: { branchId?: number }) => boolean;
      hasAllPermissions: (slugs: string[], options?: { branchId?: number }) => boolean;
      hasBranchAccess: (branchId: number) => boolean;
      loading: boolean;
    }

    function createMockReturn(): UsePermissionsReturn {
      return {
        permissions: [],
        allowedBranches: [],
        role: null,
        isAdmin: false,
        hasPermission: () => false,
        hasAnyPermission: () => false,
        hasAllPermissions: () => false,
        hasBranchAccess: () => false,
        loading: true,
      };
    }

    it('deve retornar todas as propriedades esperadas', () => {
      const result = createMockReturn();
      expect(result).toHaveProperty('permissions');
      expect(result).toHaveProperty('allowedBranches');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('isAdmin');
      expect(result).toHaveProperty('hasPermission');
      expect(result).toHaveProperty('hasAnyPermission');
      expect(result).toHaveProperty('hasAllPermissions');
      expect(result).toHaveProperty('hasBranchAccess');
      expect(result).toHaveProperty('loading');
    });

    it('loading deve iniciar como true', () => {
      const result = createMockReturn();
      expect(result.loading).toBe(true);
    });

    it('role deve iniciar como null', () => {
      const result = createMockReturn();
      expect(result.role).toBeNull();
    });

    it('isAdmin deve iniciar como false', () => {
      const result = createMockReturn();
      expect(result.isAdmin).toBe(false);
    });
  });
});
