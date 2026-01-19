import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { analyzeModuleDependencies } from '../../src/tools/analyze-module-dependencies.js';

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
vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path');
  return {
    ...actual,
    join: (...args: string[]) => args.join('/'),
    relative: (from: string, to: string) => to.replace(from + '/', ''),
  };
});

describe('analyzeModuleDependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.cwd
    vi.spyOn(process, 'cwd').mockReturnValue('/project');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validação de entrada', () => {
    it('deve rejeitar module vazio', async () => {
      await expect(
        analyzeModuleDependencies({
          module: '',
          check_violations: true,
          include_external: true,
        })
      ).rejects.toThrow('module é obrigatório');
    });

    it('deve rejeitar module não lowercase', async () => {
      await expect(
        analyzeModuleDependencies({
          module: 'Fiscal', // PascalCase
          check_violations: true,
          include_external: true,
        })
      ).rejects.toThrow('module deve ser lowercase');
    });

    it('deve rejeitar check_violations não boolean', async () => {
      await expect(
        analyzeModuleDependencies({
          module: 'fiscal',
          check_violations: 'true' as unknown as boolean,
          include_external: true,
        })
      ).rejects.toThrow('check_violations é obrigatório e deve ser boolean');
    });

    it('deve rejeitar include_external não boolean', async () => {
      await expect(
        analyzeModuleDependencies({
          module: 'fiscal',
          check_violations: true,
          include_external: 'yes' as unknown as boolean,
        })
      ).rejects.toThrow('include_external é obrigatório e deve ser boolean');
    });
  });

  describe('módulo não encontrado', () => {
    it('deve rejeitar quando módulo não existe', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(
        analyzeModuleDependencies({
          module: 'inexistente',
          check_violations: true,
          include_external: true,
        })
      ).rejects.toThrow("Módulo 'inexistente' não encontrado");
    });
  });

  describe('análise de módulo válido', () => {
    beforeEach(() => {
      // Módulo existe
      vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);
        return (
          pathStr.includes('modules/fiscal') ||
          pathStr.includes('domain') ||
          pathStr.includes('application') ||
          pathStr.includes('infrastructure')
        );
      });

      // Estrutura de diretórios
      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);

        if (dirStr.includes('domain')) {
          return [
            createDirent('FiscalDocument.ts', false),
          ] ;
        }

        if (dirStr.includes('application')) {
          return [
            createDirent('CreateFiscalDocumentUseCase.ts', false),
          ] ;
        }

        if (dirStr.includes('infrastructure')) {
          return [
            createDirent('DrizzleFiscalRepository.ts', false),
          ] ;
        }

        return [];
      });

      // Conteúdo dos arquivos - sem violações
      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        const pathStr = String(p);

        if (pathStr.includes('FiscalDocument')) {
          return `
import { Result } from '@/shared/domain';
import { AggregateRoot } from '@/shared/domain';
import { FiscalDocumentType } from '../value-objects/FiscalDocumentType';

export class FiscalDocument extends AggregateRoot<string> {
  get documentNumber(): string { return this.props.documentNumber; }
}
`;
        }

        if (pathStr.includes('CreateFiscalDocumentUseCase')) {
          return `
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import { FiscalDocument } from '../../domain/entities/FiscalDocument';
import type { IFiscalDocumentRepository } from '../../domain/ports/output/IFiscalDocumentRepository';

@injectable()
export class CreateFiscalDocumentUseCase {}
`;
        }

        if (pathStr.includes('DrizzleFiscalRepository')) {
          return `
import { drizzle } from 'drizzle-orm';
import { FiscalDocument } from '../../domain/entities/FiscalDocument';
import type { IFiscalDocumentRepository } from '../../domain/ports/output/IFiscalDocumentRepository';

export class DrizzleFiscalDocumentRepository implements IFiscalDocumentRepository {}
`;
        }

        return '';
      });
    });

    it('deve analisar módulo e retornar estrutura correta', async () => {
      const result = await analyzeModuleDependencies({
        module: 'fiscal',
        check_violations: false,
        include_external: false,
      });

      expect(result.module).toBe('fiscal');
      expect(result.layers).toBeDefined();
      expect(result.layers.domain).toBeDefined();
      expect(result.layers.application).toBeDefined();
      expect(result.layers.infrastructure).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.total_files).toBeGreaterThanOrEqual(0);
      expect(result.summary.architecture_score).toBeGreaterThanOrEqual(0);
      expect(result.summary.architecture_score).toBeLessThanOrEqual(100);
    });

    it('deve calcular score 100 quando não há violações', async () => {
      const result = await analyzeModuleDependencies({
        module: 'fiscal',
        check_violations: true,
        include_external: false,
      });

      // Sem violações = score alto
      expect(result.summary.total_violations).toBe(0);
      expect(result.summary.architecture_score).toBe(100);
    });

    it('deve incluir recomendações positivas sem violações', async () => {
      const result = await analyzeModuleDependencies({
        module: 'fiscal',
        check_violations: true,
        include_external: false,
      });

      expect(result.summary.recommendations.length).toBeGreaterThan(0);
      expect(result.summary.recommendations[0]).toContain('bem implementada');
    });
  });

  describe('detecção de violações', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
    });

    it('deve detectar ARCH-001: Domain importando de Application', async () => {
      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);
        if (dirStr.includes('domain')) {
          return [
            createDirent('BadEntity.ts', false),
          ] ;
        }
        return [];
      });

      vi.mocked(fs.readFileSync).mockReturnValue(`
import { Result } from '@/shared/domain';
import { CreateSomethingUseCase } from '../../application/use-cases/CreateSomethingUseCase';

export class BadEntity {}
`);

      const result = await analyzeModuleDependencies({
        module: 'fiscal',
        check_violations: true,
        include_external: false,
      });

      expect(result.layers.domain.violations.length).toBeGreaterThan(0);
      const violation = result.layers.domain.violations[0];
      expect(violation.violation_type).toBe('DOMAIN_IMPORTS_APPLICATION');
      expect(violation.severity).toBe('ERROR');
    });

    it('deve detectar ARCH-002: Domain importando de Infrastructure', async () => {
      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);
        if (dirStr.includes('domain')) {
          return [
            createDirent('BadEntity.ts', false),
          ] ;
        }
        return [];
      });

      vi.mocked(fs.readFileSync).mockReturnValue(`
import { db } from '../../infrastructure/database/connection';

export class BadEntity {}
`);

      const result = await analyzeModuleDependencies({
        module: 'fiscal',
        check_violations: true,
        include_external: false,
      });

      expect(result.layers.domain.violations.length).toBeGreaterThan(0);
      const violation = result.layers.domain.violations[0];
      expect(violation.violation_type).toBe('DOMAIN_IMPORTS_INFRA');
    });

    it('deve detectar ARCH-003: Domain importando bibliotecas externas', async () => {
      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);
        if (dirStr.includes('domain')) {
          return [
            createDirent('BadEntity.ts', false),
          ] ;
        }
        return [];
      });

      vi.mocked(fs.readFileSync).mockReturnValue(`
import { drizzle } from 'drizzle-orm';

export class BadEntity {}
`);

      const result = await analyzeModuleDependencies({
        module: 'fiscal',
        check_violations: true,
        include_external: false,
      });

      expect(result.layers.domain.violations.length).toBeGreaterThan(0);
      const violation = result.layers.domain.violations[0];
      expect(violation.violation_type).toBe('DOMAIN_IMPORTS_EXTERNAL');
    });

    it('deve detectar ARCH-004: Domain importando módulos Node.js', async () => {
      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);
        if (dirStr.includes('domain')) {
          return [
            createDirent('BadEntity.ts', false),
          ] ;
        }
        return [];
      });

      vi.mocked(fs.readFileSync).mockReturnValue(`
import * as fs from 'fs';

export class BadEntity {}
`);

      const result = await analyzeModuleDependencies({
        module: 'fiscal',
        check_violations: true,
        include_external: false,
      });

      expect(result.layers.domain.violations.length).toBeGreaterThan(0);
      const violation = result.layers.domain.violations[0];
      expect(violation.violation_type).toBe('DOMAIN_IMPORTS_NODE');
    });
  });

  describe('dependências externas', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);
        if (dirStr.includes('infrastructure')) {
          return [
            createDirent('Repository.ts', false),
          ] ;
        }
        return [];
      });

      vi.mocked(fs.readFileSync).mockReturnValue(`
import { drizzle } from 'drizzle-orm';
import { mssqlTable } from 'drizzle-orm/mssql-core';
import { z } from 'zod';

export class Repository {}
`);
    });

    it('deve listar dependências externas quando include_external=true', async () => {
      const result = await analyzeModuleDependencies({
        module: 'fiscal',
        check_violations: false,
        include_external: true,
      });

      expect(result.layers.infrastructure.external_deps).toContain('drizzle-orm');
      expect(result.layers.infrastructure.external_deps).toContain('zod');
    });

    it('não deve listar dependências externas quando include_external=false', async () => {
      const result = await analyzeModuleDependencies({
        module: 'fiscal',
        check_violations: false,
        include_external: false,
      });

      expect(result.layers.infrastructure.external_deps).toHaveLength(0);
    });
  });

  describe('cálculo de score', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
    });

    it('deve retornar score menor quando há violações', async () => {
      mockReaddirSync((dir: fs.PathLike) => {
        const dirStr = String(dir);
        if (dirStr.includes('domain')) {
          return [
            createDirent('Entity1.ts', false),
            createDirent('Entity2.ts', false),
            createDirent('Entity3.ts', false),
          ] ;
        }
        return [];
      });

      // Todas as entities com violações
      vi.mocked(fs.readFileSync).mockReturnValue(`
import { drizzle } from 'drizzle-orm';
export class BadEntity {}
`);

      const result = await analyzeModuleDependencies({
        module: 'fiscal',
        check_violations: true,
        include_external: false,
      });

      // Cada arquivo tem uma violação (33% violation rate)
      expect(result.summary.architecture_score).toBeLessThan(100);
      expect(result.summary.recommendations.some(r => r.includes('CRÍTICO'))).toBe(true);
    });
  });
});
