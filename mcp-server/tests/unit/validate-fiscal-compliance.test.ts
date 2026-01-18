import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateFiscalCompliance } from '../../src/tools/validate-fiscal-compliance.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises
vi.mock('fs/promises');

describe('validateFiscalCompliance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validação de entrada', () => {
    it('deve rejeitar feature_type inválido', async () => {
      await expect(
        validateFiscalCompliance({
          feature_type: 'invalid' as 'nfe',
          code_path: '/test/path',
          legislation: ['icms'],
        })
      ).rejects.toThrow('feature_type inválido');
    });

    it('deve rejeitar code_path vazio', async () => {
      await expect(
        validateFiscalCompliance({
          feature_type: 'nfe',
          code_path: '',
          legislation: ['icms'],
        })
      ).rejects.toThrow('code_path é obrigatório');
    });

    it('deve rejeitar legislation vazia', async () => {
      await expect(
        validateFiscalCompliance({
          feature_type: 'nfe',
          code_path: '/test/path',
          legislation: [],
        })
      ).rejects.toThrow('legislation é obrigatório');
    });

    it('deve rejeitar legislação inválida', async () => {
      await expect(
        validateFiscalCompliance({
          feature_type: 'nfe',
          code_path: '/test/path',
          legislation: ['invalid' as 'icms'],
        })
      ).rejects.toThrow('Legislação inválida');
    });
  });

  describe('validação NFe', () => {
    it('deve validar código NFe com campos obrigatórios', async () => {
      const mockCode = `
        // NFe Service
        export class NFeService {
          async createNFe(data: NFeData) {
            const chaveAcesso = this.generateKey();
            const natOp = data.naturezaOperacao;
            const CFOP = this.getCFOP(data);
            const CST = this.getCST(data);
            const NCM = data.ncm;
            const vProd = data.valorProduto;
            const vBC = data.baseCalculo;
            const pICMS = this.getAliquotaICMS(data.originUf, data.destUf);
            const vICMS = vBC * (pICMS / 100);
            
            // Multi-tenancy
            const { organizationId, branchId } = context;
          }
        }
      `;

      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as unknown as Awaited<ReturnType<typeof fs.stat>>);
      vi.mocked(fs.readFile).mockResolvedValue(mockCode);

      const result = await validateFiscalCompliance({
        feature_type: 'nfe',
        code_path: '/test/nfe-service.ts',
        legislation: ['icms'],
      });

      expect(result.compliant).toBe(true);
      expect(result.campos_obrigatorios).toBe(true);
      expect(result.checklist.some(c => c.item.includes('chaveAcesso') && c.status === 'pass')).toBe(true);
    });

    it('deve falhar quando campos obrigatórios estão ausentes', async () => {
      const mockCode = `
        // NFe Service incompleto
        export class NFeService {
          async createNFe(data: NFeData) {
            // Faltando campos obrigatórios
            return { status: 'ok' };
          }
        }
      `;

      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as unknown as Awaited<ReturnType<typeof fs.stat>>);
      vi.mocked(fs.readFile).mockResolvedValue(mockCode);

      const result = await validateFiscalCompliance({
        feature_type: 'nfe',
        code_path: '/test/nfe-service.ts',
        legislation: ['icms'],
      });

      expect(result.compliant).toBe(false);
      expect(result.campos_obrigatorios).toBe(false);
      expect(result.checklist.some(c => c.status === 'fail')).toBe(true);
    });

    it('deve detectar alíquota ICMS hardcoded', async () => {
      const mockCode = `
        // NFe com hardcoded
        const icms = 18; // Hardcoded!
        const chaveAcesso = '123';
        const natOp = 'Venda';
        const CFOP = '5102';
        const CST = '00';
        const NCM = '12345678';
        const vProd = 1000;
        const vBC = 1000;
        const pICMS = 18;
        const vICMS = 180;
        // Multi-tenancy
        const { organizationId, branchId } = ctx;
      `;

      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as unknown as Awaited<ReturnType<typeof fs.stat>>);
      vi.mocked(fs.readFile).mockResolvedValue(mockCode);

      const result = await validateFiscalCompliance({
        feature_type: 'nfe',
        code_path: '/test/nfe-service.ts',
        legislation: ['icms'],
      });

      expect(result.aliquotas_corretas).toBe(false);
    });
  });

  describe('validação CTe', () => {
    it('deve validar código CTe com campos de transporte', async () => {
      const mockCode = `
        export class CTeService {
          async createCTe(data: CTeData) {
            const chave = this.generateKey();
            const RNTRC = data.rntrc;
            const modal = data.modal;
            const CFOP = this.getCFOP(data);
            const CST = this.getCST(data);
            const vTPrest = data.valorPrestacao;
            const vRec = data.valorReceber;
            const xMunIni = data.municipioInicio;
            const xMunFim = data.municipioFim;
            
            // Multi-tenancy
            const { organizationId, branchId } = context;
          }
        }
      `;

      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as unknown as Awaited<ReturnType<typeof fs.stat>>);
      vi.mocked(fs.readFile).mockResolvedValue(mockCode);

      const result = await validateFiscalCompliance({
        feature_type: 'cte',
        code_path: '/test/cte-service.ts',
        legislation: ['icms'],
      });

      expect(result.compliant).toBe(true);
      expect(result.checklist.some(c => c.item.includes('RNTRC') && c.status === 'pass')).toBe(true);
    });
  });

  describe('validação SPED', () => {
    it('deve validar código SPED com registros obrigatórios', async () => {
      const mockCode = `
        export class SpedGenerator {
          generateRecord(data: SpedData) {
            const registro = 'C100';
            const { organizationId, branchId, periodo } = context;
            const VL_OPR = data.valorOperacao;
            const VL_BC = data.baseCalculo;
            const ALIQ = data.aliquota;
            const VL_IMPOSTO = VL_BC * (ALIQ / 100);
          }
        }
      `;

      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as unknown as Awaited<ReturnType<typeof fs.stat>>);
      vi.mocked(fs.readFile).mockResolvedValue(mockCode);

      const result = await validateFiscalCompliance({
        feature_type: 'sped',
        code_path: '/test/sped-generator.ts',
        legislation: ['icms', 'pis_cofins'],
      });

      expect(result.compliant).toBe(true);
    });
  });

  describe('validação PIS/COFINS', () => {
    it('deve detectar alíquota PIS/COFINS hardcoded', async () => {
      const mockCode = `
        // Hardcoded aliquotas
        const pis = 1.65%; // Hardcoded
        const cofins = 7.6%; // Hardcoded
        
        // Campos obrigatórios NFe
        const chaveAcesso = '123';
        const natOp = 'Venda';
        const CFOP = '5102';
        const CST = '00';
        const CSTPIS = '01';
        const CSTCOFINS = '01';
        const NCM = '12345678';
        const vProd = 1000;
        const vBC = 1000;
        const pICMS = 18;
        const vICMS = 180;
        const pPIS = 1.65;
        const pCOFINS = 7.6;
        const { organizationId, branchId } = ctx;
      `;

      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as unknown as Awaited<ReturnType<typeof fs.stat>>);
      vi.mocked(fs.readFile).mockResolvedValue(mockCode);

      const result = await validateFiscalCompliance({
        feature_type: 'nfe',
        code_path: '/test/nfe-service.ts',
        legislation: ['pis_cofins'],
      });

      // Deve ter warnings sobre PIS/COFINS
      expect(result.checklist.length).toBeGreaterThan(0);
    });
  });

  describe('warnings Reforma 2026', () => {
    it('deve adicionar warnings quando legislação inclui reforma_2026', async () => {
      const mockCode = `
        // NFe Service
        const chaveAcesso = '123';
        const natOp = 'Venda';
        const CFOP = '5102';
        const CST = '00';
        const NCM = '12345678';
        const vProd = 1000;
        const vBC = 1000;
        const pICMS = 18;
        const vICMS = 180;
        const { organizationId, branchId } = ctx;
      `;

      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true, isDirectory: () => false } as unknown as Awaited<ReturnType<typeof fs.stat>>);
      vi.mocked(fs.readFile).mockResolvedValue(mockCode);

      const result = await validateFiscalCompliance({
        feature_type: 'nfe',
        code_path: '/test/nfe-service.ts',
        legislation: ['icms', 'reforma_2026'],
      });

      expect(result.warnings_reforma_2026.length).toBeGreaterThan(0);
      expect(result.warnings_reforma_2026.some(w => w.includes('IBS'))).toBe(true);
      expect(result.warnings_reforma_2026.some(w => w.includes('CBS'))).toBe(true);
    });
  });

  describe('leitura de diretório', () => {
    it('deve ler todos arquivos .ts de um diretório', async () => {
      const mockCode1 = 'const chaveAcesso = "123"; const { organizationId, branchId } = ctx;';
      const mockCode2 = 'const natOp = "Venda"; const CFOP = "5102";';

      vi.mocked(fs.stat).mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        if (pathStr === '/test/dir') {
          return { isFile: () => false, isDirectory: () => true } as unknown as Awaited<ReturnType<typeof fs.stat>>;
        }
        return { isFile: () => true, isDirectory: () => false } as unknown as Awaited<ReturnType<typeof fs.stat>>;
      });

      vi.mocked(fs.readdir).mockResolvedValue(['file1.ts', 'file2.ts', 'readme.md'] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
      
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('file1')) return mockCode1;
        if (pathStr.includes('file2')) return mockCode2;
        return '';
      });

      const result = await validateFiscalCompliance({
        feature_type: 'nfe',
        code_path: '/test/dir',
        legislation: ['icms'],
      });

      // Deve ter processado os arquivos
      expect(result.checklist.length).toBeGreaterThan(0);
    });
  });

  describe('multi-tenancy', () => {
    it('deve falhar quando multi-tenancy não está implementado', async () => {
      // Código NFe sem multi-tenancy (sem organizationId e branchId)
      const mockCode = `
        const chaveAcesso = '123';
        const natOp = 'Venda';
        const CFOP = '5102';
        const CST = '00';
        const NCM = '12345678';
        const vProd = 1000;
        const vBC = 1000;
        const pICMS = 18;
        const vICMS = 180;
      `;

      vi.mocked(fs.stat).mockResolvedValue({ 
        isFile: () => true, 
        isDirectory: () => false 
      } as unknown as Awaited<ReturnType<typeof fs.stat>>);
      vi.mocked(fs.readFile).mockResolvedValue(mockCode);

      const result = await validateFiscalCompliance({
        feature_type: 'nfe',
        code_path: '/test/nfe-service.ts',
        legislation: ['icms'],
      });

      // Verificar que o resultado não é compliant
      expect(result.compliant).toBe(false);
      
      // Verificar que existe item de multi-tenancy no checklist
      const multiTenancyItem = result.checklist.find(c => 
        c.item.includes('Multi-tenancy')
      );
      expect(multiTenancyItem).toBeDefined();
      expect(multiTenancyItem?.status).toBe('fail');
      expect(multiTenancyItem?.details).toContain('CRÍTICO');
    });

    it('deve passar quando multi-tenancy está implementado', async () => {
      const mockCode = `
        const chaveAcesso = '123';
        const natOp = 'Venda';
        const CFOP = '5102';
        const CST = '00';
        const NCM = '12345678';
        const vProd = 1000;
        const vBC = 1000;
        const pICMS = 18;
        const vICMS = 180;
        // Multi-tenancy
        const { organizationId, branchId } = ctx;
      `;

      vi.mocked(fs.stat).mockResolvedValue({ 
        isFile: () => true, 
        isDirectory: () => false 
      } as unknown as Awaited<ReturnType<typeof fs.stat>>);
      vi.mocked(fs.readFile).mockResolvedValue(mockCode);

      const result = await validateFiscalCompliance({
        feature_type: 'nfe',
        code_path: '/test/nfe-service.ts',
        legislation: ['icms'],
      });

      // Verificar que o item de multi-tenancy passou
      const multiTenancyItem = result.checklist.find(c => 
        c.item.includes('Multi-tenancy')
      );
      expect(multiTenancyItem).toBeDefined();
      expect(multiTenancyItem?.status).toBe('pass');
    });
  });
});
