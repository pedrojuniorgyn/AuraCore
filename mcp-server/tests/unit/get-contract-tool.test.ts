import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getContractTool } from '../../src/tools/get-contract-tool.js';
import * as fs from 'fs/promises';
import { mockApiContract, mockRbacContract } from '../fixtures/contracts.js';

vi.mock('fs/promises');

describe('getContractTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('casos felizes', () => {
    it('deve retornar contrato valido quando arquivo existe', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockApiContract));

      const result = await getContractTool('api-contract');

      expect(result).toEqual(mockApiContract);
      expect(result.id).toBe('api-contract');
      expect(result.title).toBe('API Contract');
    });

    it('deve retornar contrato com regras', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockRbacContract));

      const result = await getContractTool('rbac-contract');

      expect(result.rules).toBeDefined();
      expect(result.rules?.length).toBeGreaterThan(0);
    });
  });

  describe('validacao de entrada', () => {
    it('deve rejeitar contract_id vazio', async () => {
      await expect(getContractTool('')).rejects.toThrow('contract_id must be a non-empty string');
    });

    it('deve rejeitar contract_id undefined', async () => {
      await expect(getContractTool(undefined as unknown as string)).rejects.toThrow('contract_id must be a non-empty string');
    });

    it('deve rejeitar contract_id null', async () => {
      await expect(getContractTool(null as unknown as string)).rejects.toThrow('contract_id must be a non-empty string');
    });
  });

  describe('sanitizacao (path traversal protection)', () => {
    it('deve rejeitar path traversal attempts', async () => {
      await expect(getContractTool('../etc/passwd')).rejects.toThrow('path traversal attempt detected');
    });

    it('deve rejeitar caracteres invalidos', async () => {
      await expect(getContractTool('invalid/slash')).rejects.toThrow('path traversal attempt detected');
      await expect(getContractTool('UPPERCASE')).rejects.toThrow('Invalid resource ID format');
    });
  });

  describe('tratamento de erros', () => {
    it('deve lancar erro quando contrato nao existe', async () => {
      vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' });

      await expect(getContractTool('non-existent')).rejects.toThrow('Contract not found');
    });

    it('deve rejeitar contrato sem id', async () => {
      const invalid = { title: 'Test' };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(invalid));

      await expect(getContractTool('test')).rejects.toThrow('Invalid contract schema');
    });

    it('deve rejeitar contrato sem title', async () => {
      const invalid = { id: 'test' };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(invalid));

      await expect(getContractTool('test')).rejects.toThrow('Invalid contract schema');
    });
  });
});

