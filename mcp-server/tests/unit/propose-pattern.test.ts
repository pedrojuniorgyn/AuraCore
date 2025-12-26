import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { proposePattern } from '../../src/tools/propose-pattern.js';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('proposePattern', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('casos felizes', () => {
    it('deve criar pattern com campos obrigatorios', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.access).mockRejectedValue({ code: 'ENOENT' });
      vi.mocked(fs.writeFile).mockResolvedValue();

      const input = {
        id: 'test-pattern',
        name: 'Test Pattern',
        category: 'testing',
        description: 'A test pattern'
      };

      const result = await proposePattern(input);

      expect(result.id).toBe('test-pattern');
      expect(result.name).toBe('Test Pattern');
      expect(result.category).toBe('testing');
      expect(result.status).toBe('proposed');
      expect(result.proposedDate).toBeDefined();
    });

    it('deve incluir campos opcionais quando fornecidos', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.access).mockRejectedValue({ code: 'ENOENT' });
      vi.mocked(fs.writeFile).mockResolvedValue();

      const input = {
        id: 'test-pattern',
        name: 'Test',
        category: 'test',
        description: 'Test',
        example: 'const x = 1;',
        rules: ['Rule 1', 'Rule 2'],
        tags: ['tag1', 'tag2']
      };

      const result = await proposePattern(input);

      expect(result.example).toEqual({ typescript: 'const x = 1;' });
      expect(result.rules).toEqual(['Rule 1', 'Rule 2']);
      expect(result.tags).toEqual(['tag1', 'tag2']);
    });

    it('deve filtrar regras nao-string', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.access).mockRejectedValue({ code: 'ENOENT' });
      vi.mocked(fs.writeFile).mockResolvedValue();

      const input = {
        id: 'test',
        name: 'Test',
        category: 'test',
        description: 'Test',
        rules: ['Valid', 123, 'Also valid'] as unknown as string[]
      };

      const result = await proposePattern(input);

      expect(result.rules).toEqual(['Valid', 'Also valid']);
    });

    it('deve criar diretorio se nao existir', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.access).mockRejectedValue({ code: 'ENOENT' });
      vi.mocked(fs.writeFile).mockResolvedValue();

      await proposePattern({
        id: 'test',
        name: 'Test',
        category: 'test',
        description: 'Test'
      });

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('proposed'),
        { recursive: true }
      );
    });
  });

  describe('validacao de entrada', () => {
    it('deve rejeitar id vazio', async () => {
      await expect(proposePattern({
        id: '',
        name: 'Test',
        category: 'test',
        description: 'Test'
      })).rejects.toThrow('id is required and must be a string');
    });

    it('deve rejeitar id undefined', async () => {
      await expect(proposePattern({
        id: undefined as unknown as string,
        name: 'Test',
        category: 'test',
        description: 'Test'
      })).rejects.toThrow('id is required and must be a string');
    });

    it('deve rejeitar name vazio', async () => {
      await expect(proposePattern({
        id: 'test',
        name: '',
        category: 'test',
        description: 'Test'
      })).rejects.toThrow('name is required and must be a string');
    });

    it('deve rejeitar category vazio', async () => {
      await expect(proposePattern({
        id: 'test',
        name: 'Test',
        category: '',
        description: 'Test'
      })).rejects.toThrow('category is required and must be a string');
    });

    it('deve rejeitar description vazio', async () => {
      await expect(proposePattern({
        id: 'test',
        name: 'Test',
        category: 'test',
        description: ''
      })).rejects.toThrow('description is required and must be a string');
    });
  });

  describe('sanitizacao (path traversal protection)', () => {
    it('deve sanitizar id antes de usar', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.access).mockRejectedValue({ code: 'ENOENT' });
      vi.mocked(fs.writeFile).mockResolvedValue();

      await expect(proposePattern({
        id: '../../../etc/passwd',
        name: 'Test',
        category: 'test',
        description: 'Test'
      })).rejects.toThrow('path traversal attempt detected');
    });

    it('deve rejeitar caracteres invalidos em id', async () => {
      await expect(proposePattern({
        id: 'invalid/slash',
        name: 'Test',
        category: 'test',
        description: 'Test'
      })).rejects.toThrow('path traversal attempt detected');
    });
  });

  describe('tratamento de erros', () => {
    it('deve rejeitar quando pattern ja existe', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.access).mockResolvedValue(); // Arquivo existe

      await expect(proposePattern({
        id: 'existing',
        name: 'Test',
        category: 'test',
        description: 'Test'
      })).rejects.toThrow('already exists');
    });

    it('deve re-lancar erros de filesystem nao-ENOENT', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.access).mockRejectedValue({ code: 'EPERM' });

      await expect(proposePattern({
        id: 'test',
        name: 'Test',
        category: 'test',
        description: 'Test'
      })).rejects.toThrow();
    });
  });
});

