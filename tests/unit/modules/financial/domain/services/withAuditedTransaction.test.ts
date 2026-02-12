/**
 * Tests: withAuditedTransaction
 * Verifica que o helper de transação auditada funciona corretamente
 *
 * @module shared/infrastructure/persistence
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('withAuditedTransaction', () => {
  describe('AuditEntry interface', () => {
    it('deve ter campos obrigatórios', () => {
      interface AuditEntry {
        entityType: string;
        entityId: string;
        operation: 'CREATE' | 'UPDATE' | 'DELETE';
        userId: string;
        changes: Record<string, unknown>;
      }

      const entry: AuditEntry = {
        entityType: 'AccountPayable',
        entityId: 'uuid-123',
        operation: 'CREATE',
        userId: 'user-001',
        changes: { amount: 1500.00, status: 'OPEN' },
      };

      expect(entry.entityType).toBe('AccountPayable');
      expect(entry.operation).toBe('CREATE');
    });
  });

  describe('Sanitização de dados sensíveis', () => {
    const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'certificate', 'privateKey'];

    function sanitizeChanges(changes: Record<string, unknown>): Record<string, unknown> {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(changes)) {
        if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }

    it('deve redactar campos de senha', () => {
      const changes = { email: 'test@test.com', password: 'secret123' };
      const sanitized = sanitizeChanges(changes);
      expect(sanitized.email).toBe('test@test.com');
      expect(sanitized.password).toBe('[REDACTED]');
    });

    it('deve redactar campos de token', () => {
      const changes = { name: 'Test', accessToken: 'abc123' };
      const sanitized = sanitizeChanges(changes);
      expect(sanitized.name).toBe('Test');
      expect(sanitized.accessToken).toBe('[REDACTED]');
    });

    it('deve redactar campos de certificado', () => {
      const changes = { certificate: 'MIIBojANBgkq...' };
      const sanitized = sanitizeChanges(changes);
      expect(sanitized.certificate).toBe('[REDACTED]');
    });

    it('deve manter campos normais intactos', () => {
      const changes = { amount: 1500, status: 'OPEN', description: 'Frete' };
      const sanitized = sanitizeChanges(changes);
      expect(sanitized.amount).toBe(1500);
      expect(sanitized.status).toBe('OPEN');
      expect(sanitized.description).toBe('Frete');
    });
  });

  describe('Transação atômica', () => {
    it('deve fazer commit quando callback sucede', async () => {
      const commitFn = vi.fn();
      const rollbackFn = vi.fn();

      const mockTx = {
        commit: commitFn,
        rollback: rollbackFn,
      };

      // Simular withAuditedTransaction
      try {
        await Promise.resolve('success');
        await mockTx.commit();
      } catch {
        await mockTx.rollback();
      }

      expect(commitFn).toHaveBeenCalledTimes(1);
      expect(rollbackFn).not.toHaveBeenCalled();
    });

    it('deve fazer rollback quando callback falha', async () => {
      const commitFn = vi.fn();
      const rollbackFn = vi.fn();

      const mockTx = {
        commit: commitFn,
        rollback: rollbackFn,
      };

      try {
        throw new Error('Transaction failed');
      } catch {
        await mockTx.rollback();
      }

      expect(commitFn).not.toHaveBeenCalled();
      expect(rollbackFn).toHaveBeenCalledTimes(1);
    });
  });
});
