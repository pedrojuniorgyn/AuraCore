import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchPatterns } from '../../src/tools/search-patterns.js';
import * as fs from 'fs/promises';
import { 
  mockRepositoryPattern, 
  mockServicePattern,
  mockProposedPattern 
} from '../fixtures/patterns.js';

vi.mock('fs/promises');

describe('searchPatterns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('casos felizes', () => {
    it('deve encontrar patterns por nome', async () => {
      // Mock readdir para retornar lista de arquivos
      vi.mocked(fs.readdir).mockResolvedValue(['repository-pattern.json', 'service-pattern.json'] as unknown as fs.Dirent[]);
      
      // Mock readFile para cada arquivo
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(mockRepositoryPattern))
        .mockResolvedValueOnce(JSON.stringify(mockServicePattern));

      const result = await searchPatterns('repository', 'approved');

      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].id).toBe('repository-pattern');
      expect(result.total).toBe(1);
      expect(result.query).toBe('repository');
    });

    it('deve encontrar patterns por descricao', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['repository-pattern.json'] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockRepositoryPattern));

      const result = await searchPatterns('acesso a dados', 'approved');

      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].description).toContain('acesso a dados');
    });

    it('deve encontrar patterns por tags', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['repository-pattern.json'] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockRepositoryPattern));

      const result = await searchPatterns('prisma', 'approved');

      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].tags).toContain('prisma');
    });

    it('deve encontrar patterns por rules', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['repository-pattern.json'] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockRepositoryPattern));

      const result = await searchPatterns('encapsular', 'approved');

      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].rules?.[0]).toContain('encapsular');
    });

    it('deve buscar apenas em approved por padrao', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['repository-pattern.json'] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockRepositoryPattern));

      const result = await searchPatterns('repository');

      expect(result.status).toBe('approved');
    });

    it('deve buscar em proposed quando solicitado', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['test-pattern.json'] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockProposedPattern));

      const result = await searchPatterns('test', 'proposed');

      expect(result.status).toBe('proposed');
      expect(result.patterns[0].status).toBe('proposed');
    });

    it('deve buscar em all quando solicitado', async () => {
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['repository-pattern.json'] as unknown as fs.Dirent[])
        .mockResolvedValueOnce(['test-pattern.json'] as unknown as fs.Dirent[]);
      
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(mockRepositoryPattern))
        .mockResolvedValueOnce(JSON.stringify(mockProposedPattern));

      const result = await searchPatterns('pattern', 'all');

      expect(result.status).toBe('all');
      expect(result.patterns.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validacao de entrada', () => {
    it('deve rejeitar query vazia', async () => {
      await expect(searchPatterns('')).rejects.toThrow('query must be a non-empty string');
    });

    it('deve rejeitar query apenas com espacos', async () => {
      await expect(searchPatterns('   ')).rejects.toThrow('query must be a non-empty string');
    });

    it('deve rejeitar query undefined', async () => {
      await expect(searchPatterns(undefined as unknown as string)).rejects.toThrow('query must be a non-empty string');
    });

    it('deve rejeitar query null', async () => {
      await expect(searchPatterns(null as unknown as string)).rejects.toThrow('query must be a non-empty string');
    });

    it('deve rejeitar status invalido', async () => {
      await expect(searchPatterns('test', 'invalid' as unknown as 'approved')).rejects.toThrow('status must be approved, proposed, or all');
    });
  });

  describe('tratamento de erros', () => {
    it('deve retornar array vazio quando diretorio nao existe', async () => {
      vi.mocked(fs.readdir).mockRejectedValue({ code: 'ENOENT' });

      const result = await searchPatterns('test', 'approved');

      expect(result.patterns).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('deve ignorar arquivos corrompidos (graceful degradation)', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['good.json', 'bad.json'] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(mockRepositoryPattern))
        .mockResolvedValueOnce('invalid json');

      const result = await searchPatterns('repository', 'approved');

      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].id).toBe('repository-pattern');
    });

    it('deve ignorar patterns sem campos obrigatorios', async () => {
      const invalidPattern = { id: 'xyz' }; // Falta name
      vi.mocked(fs.readdir).mockResolvedValue(['invalid.json'] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(invalidPattern));

      const result = await searchPatterns('test', 'approved');

      // Pattern com id 'xyz' nao match com query 'test'
      expect(result.patterns).toHaveLength(0);
    });
  });

  describe('case insensitive search', () => {
    it('deve buscar case-insensitive', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['repository-pattern.json'] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockRepositoryPattern));

      const result1 = await searchPatterns('REPOSITORY', 'approved');
      const result2 = await searchPatterns('repository', 'approved');
      const result3 = await searchPatterns('RePoSiToRy', 'approved');

      expect(result1.patterns).toHaveLength(1);
      expect(result2.patterns).toHaveLength(1);
      expect(result3.patterns).toHaveLength(1);
    });
  });
});

