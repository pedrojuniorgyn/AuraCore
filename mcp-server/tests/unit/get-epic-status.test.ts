import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getEpicStatus } from '../../src/tools/get-epic-status.js';
import * as fs from 'fs/promises';
import { mockEpicE0, mockEpicE1 } from '../fixtures/epics.js';

// Mock fs module
vi.mock('fs/promises');

describe('getEpicStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('casos felizes', () => {
    it('deve retornar epic valido quando arquivo existe', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockEpicE0));

      const result = await getEpicStatus('E0');

      expect(result).toEqual(mockEpicE0);
      expect(result.id).toBe('E0');
      expect(result.name).toBe('Setup Inicial');
    });

    it('deve retornar epic com dependencias', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockEpicE1));

      const result = await getEpicStatus('E1');

      expect(result).toEqual(mockEpicE1);
      expect(result.dependencies).toContain('E0');
    });
  });

  describe('validacao de entrada', () => {
    it('deve rejeitar epic_id vazio', async () => {
      await expect(getEpicStatus('')).rejects.toThrow('epic_id must be a non-empty string');
    });

    it('deve rejeitar epic_id undefined', async () => {
      await expect(getEpicStatus(undefined as unknown as string)).rejects.toThrow('epic_id must be a non-empty string');
    });

    it('deve rejeitar epic_id null', async () => {
      await expect(getEpicStatus(null as unknown as string)).rejects.toThrow('epic_id must be a non-empty string');
    });

    it('deve rejeitar formato invalido (sem E)', async () => {
      await expect(getEpicStatus('0')).rejects.toThrow('Invalid epic_id format');
    });

    it('deve rejeitar formato invalido (letra errada)', async () => {
      await expect(getEpicStatus('F0')).rejects.toThrow('Invalid epic_id format');
    });

    it('deve rejeitar formato invalido (multiplos digitos)', async () => {
      await expect(getEpicStatus('E10')).rejects.toThrow('Invalid epic_id format');
    });
  });

  describe('tratamento de erros', () => {
    it('deve lancar erro quando arquivo nao existe', async () => {
      vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' });

      await expect(getEpicStatus('E9')).rejects.toThrow('Epic not found: E9');
    });

    it('deve lancar erro quando JSON e invalido', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid json');

      await expect(getEpicStatus('E0')).rejects.toThrow();
    });

    it('deve rejeitar epic sem id', async () => {
      const invalidEpic = { name: 'Test' };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(invalidEpic));

      await expect(getEpicStatus('E0')).rejects.toThrow('Invalid epic schema');
    });

    it('deve rejeitar epic sem name', async () => {
      const invalidEpic = { id: 'E0' };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(invalidEpic));

      await expect(getEpicStatus('E0')).rejects.toThrow('Invalid epic schema');
    });
  });
});

