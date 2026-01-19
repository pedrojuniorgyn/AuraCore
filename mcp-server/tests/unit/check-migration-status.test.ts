import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { checkMigrationStatus } from '../../src/tools/check-migration-status.js';

// Mock do fs
vi.mock('fs');

// Helper para criar Dirent mock (evita problemas de tipagem com Node.js 20+)
function createDirent(name: string, isDir: boolean): fs.Dirent {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    parentPath: '',
    path: '',
  } as fs.Dirent;
}

// Helper para mockar readdirSync de forma type-safe
type ReaddirMockFn = (dir: fs.PathLike) => fs.Dirent[] | string[];
function mockReaddirSync(fn: ReaddirMockFn): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockReaddirSync(fn as any);
}

describe('checkMigrationStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'cwd').mockReturnValue('/project');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('módulos DDD', () => {
    it('deve retornar lista vazia quando não há módulos', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await checkMigrationStatus({
        verbose: false,
        includeMetrics: false,
      });

      expect(result.modules).toHaveLength(0);
      expect(result.summary.totalModules).toBe(0);
    });

    it('deve analisar módulos existentes', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);
        return (
          pathStr.includes('modules') ||
          pathStr.includes('domain') ||
          pathStr.includes('application') ||
          pathStr.includes('infrastructure')
        );
      });

      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);

        if (dirStr.endsWith('modules')) {
          return [
            createDirent('fiscal', true),
            createDirent('wms', true),
          ] ;
        }

        if (dirStr.includes('entities')) {
          return ['FiscalDocument.ts', 'TaxEntry.ts'] ;
        }

        if (dirStr.includes('commands') || dirStr.includes('queries')) {
          return ['CreateDocument.ts'] ;
        }

        if (dirStr.includes('repositories')) {
          return ['DrizzleFiscalRepository.ts'] ;
        }

        return [];
      });

      const result = await checkMigrationStatus({
        verbose: true,
        includeMetrics: true,
      });

      expect(result.modules.length).toBe(2);
      expect(result.modules.some(m => m.name === 'fiscal')).toBe(true);
      expect(result.modules.some(m => m.name === 'wms')).toBe(true);
    });

    it('deve calcular score DDD corretamente', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);

        if (dirStr.endsWith('modules')) {
          return [
            createDirent('accounting', true),
          ] ;
        }

        // Módulo bem estruturado
        if (dirStr.includes('entities')) {
          return ['JournalEntry.ts', 'AccountingLine.ts'] ;
        }

        if (dirStr.includes('input')) {
          return ['ICreateJournalEntry.ts'] ;
        }

        if (dirStr.includes('output')) {
          return ['IJournalEntryRepository.ts'] ;
        }

        if (dirStr.includes('commands')) {
          return ['CreateJournalEntryUseCase.ts'] ;
        }

        return [];
      });

      const result = await checkMigrationStatus({
        verbose: true,
        includeMetrics: true,
      });

      expect(result.modules.length).toBe(1);
      const mod = result.modules[0];
      
      // Módulo bem estruturado deve ter score alto
      expect(mod.score).toBeGreaterThanOrEqual(60);
      expect(mod.status).toBe('migrated');
    });

    it('deve detectar issues em módulos', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);
        // Módulo sem pasta domain
        return pathStr.includes('modules') && !pathStr.includes('domain');
      });

      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);
        if (dirStr.endsWith('modules')) {
          return [
            createDirent('broken', true),
          ] ;
        }
        return [];
      });

      const result = await checkMigrationStatus({
        verbose: true,
        includeMetrics: false,
      });

      expect(result.modules.length).toBe(1);
      const mod = result.modules[0];
      
      expect(mod.issues.length).toBeGreaterThan(0);
      expect(mod.issues.some(i => i.type === 'missing-structure')).toBe(true);
    });
  });

  describe('serviços legados', () => {
    it('deve analisar serviços em src/services', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);
        return pathStr.includes('services');
      });

      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);

        if (dirStr.endsWith('services')) {
          return [
            createDirent('fiscal', true),
          ] ;
        }

        if (dirStr.includes('fiscal')) {
          return [
            createDirent('tax-calculator.ts', false),
            createDirent('sped-generator.ts', false),
          ] ;
        }

        return [];
      });

      vi.mocked(fs.readFileSync).mockReturnValue(`
export function calculate(): number {
  return 0;
}
`);

      const result = await checkMigrationStatus({
        verbose: false,
        includeMetrics: false,
      });

      expect(result.legacyServices.length).toBeGreaterThan(0);
    });

    it('deve calcular prioridade corretamente', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);
        return pathStr.includes('services');
      });

      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);

        if (dirStr.endsWith('services')) {
          return [
            createDirent('sped-fiscal-generator.ts', false),
            createDirent('simple-helper.ts', false),
          ] ;
        }

        return [];
      });

      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        const pathStr = String(p);
        if (pathStr.includes('sped')) {
          // Arquivo grande e crítico
          return Array(100).fill('// line').join('\n');
        }
        // Arquivo pequeno
        return '// small';
      });

      const result = await checkMigrationStatus({
        verbose: false,
        includeMetrics: false,
      });

      const spedService = result.legacyServices.find(s => s.name.includes('sped'));
      const simpleService = result.legacyServices.find(s => s.name.includes('simple'));

      expect(spedService?.priority).toBe('critical');
      expect(simpleService?.priority).toBe('low');
    });

    it('deve sugerir módulo correto para migração', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);
        if (dirStr.endsWith('services')) {
          return [
            createDirent('accounting', true),
          ] ;
        }
        if (dirStr.includes('accounting')) {
          return [
            createDirent('journal-entry.ts', false),
          ] ;
        }
        return [];
      });

      vi.mocked(fs.readFileSync).mockReturnValue('// code');

      const result = await checkMigrationStatus({
        verbose: false,
        includeMetrics: false,
      });

      const service = result.legacyServices.find(s => s.path.includes('accounting'));
      expect(service?.suggestedModule).toBe('accounting');
    });
  });

  describe('summary', () => {
    it('deve calcular progresso de migração', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);

        if (dirStr.endsWith('modules')) {
          return [
            createDirent('migrated', true),
            createDirent('partial', true),
          ] ;
        }

        // Módulo migrado = tem tudo
        if (dirStr.includes('migrated/domain/entities')) {
          return ['Entity.ts'] ;
        }
        if (dirStr.includes('migrated/domain/ports/input')) {
          return ['IUseCase.ts'] ;
        }
        if (dirStr.includes('migrated/domain/ports/output')) {
          return ['IRepository.ts'] ;
        }
        if (dirStr.includes('migrated/application/commands')) {
          return ['UseCase.ts'] ;
        }

        return [];
      });

      const result = await checkMigrationStatus({
        verbose: false,
        includeMetrics: false,
      });

      expect(result.summary.totalModules).toBe(2);
      expect(result.summary.migrationProgress).toBeGreaterThanOrEqual(0);
      expect(result.summary.migrationProgress).toBeLessThanOrEqual(100);
    });

    it('deve estimar esforço restante', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);
        if (dirStr.endsWith('services')) {
          return [
            createDirent('service1.ts', false),
            createDirent('service2.ts', false),
          ] ;
        }
        return [];
      });

      vi.mocked(fs.readFileSync).mockReturnValue('// 50 lines\n'.repeat(50));

      const result = await checkMigrationStatus({
        verbose: false,
        includeMetrics: false,
      });

      expect(result.summary.estimatedRemainingEffort).toBeDefined();
      expect(typeof result.summary.estimatedRemainingEffort).toBe('string');
    });
  });

  describe('recomendações', () => {
    it('deve gerar recomendações prioritizadas', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);
        if (dirStr.endsWith('services')) {
          return [
            createDirent('sped-generator.ts', false),
          ] ;
        }
        return [];
      });

      vi.mocked(fs.readFileSync).mockReturnValue('// critical service');

      const result = await checkMigrationStatus({
        verbose: false,
        includeMetrics: false,
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      
      // Primeira recomendação deve ser crítica
      if (result.recommendations.length > 0) {
        expect(['critical', 'high']).toContain(result.recommendations[0].priority);
      }
    });
  });

  describe('timeline', () => {
    it('deve gerar timeline com fases', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);
        if (dirStr.endsWith('services')) {
          return [
            createDirent('fiscal', true),
          ] ;
        }
        if (dirStr.includes('fiscal')) {
          return [
            createDirent('sped-fiscal.ts', false),
            createDirent('nfe-processor.ts', false),
          ] ;
        }
        return [];
      });

      vi.mocked(fs.readFileSync).mockReturnValue('// code');

      const result = await checkMigrationStatus({
        verbose: false,
        includeMetrics: false,
      });

      expect(result.timeline.length).toBeGreaterThan(0);
      expect(result.timeline[0].phase).toBeDefined();
      expect(result.timeline[0].estimatedWeeks).toBeGreaterThanOrEqual(0);
    });
  });

  describe('métricas', () => {
    it('deve calcular métricas quando includeMetrics=true', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);
        if (dirStr.endsWith('modules')) {
          return [
            createDirent('test', true),
          ] ;
        }
        if (dirStr.includes('entities')) {
          return ['Entity.ts'] ;
        }
        return [];
      });

      const result = await checkMigrationStatus({
        verbose: false,
        includeMetrics: true,
      });

      expect(result.metrics.totalFiles).toBeGreaterThanOrEqual(0);
      expect(result.metrics.dddFiles).toBeGreaterThanOrEqual(0);
      expect(result.metrics.testCoverage.ddd).toBeGreaterThanOrEqual(0);
    });
  });
});
