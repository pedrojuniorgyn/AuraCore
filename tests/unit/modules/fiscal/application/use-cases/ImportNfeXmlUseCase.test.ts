import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImportNfeXmlUseCase } from '@/modules/fiscal/application/commands/cte/ImportNfeXmlUseCase';
import type { IFiscalDocumentRepository } from '@/modules/fiscal/domain/ports/output/IFiscalDocumentRepository';
import type { FiscalDocument } from '@/modules/fiscal/domain/entities/FiscalDocument';
import type { ILogger } from '@/shared/infrastructure/logging/ILogger';
import type { ExecutionContext } from '@/modules/fiscal/domain/ports/input/IAuthorizeFiscalDocument';
import { Result } from '@/shared/domain';

/**
 * Unit tests: ImportNfeXmlUseCase
 *
 * Tests: valid XML import, duplicate detection, empty XML,
 * invalid source, XML parsing variations, and error handling.
 */
describe('ImportNfeXmlUseCase', () => {
  let useCase: ImportNfeXmlUseCase;
  let mockRepository: IFiscalDocumentRepository;
  let mockLogger: ILogger;
  let ctx: ExecutionContext;

  /** Sample valid NFe XML with infNFe pattern */
  const VALID_NFE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35260112345678000199550010000001231000001234" versao="4.00">
      <ide>
        <nNF>123</nNF>
        <serie>1</serie>
        <dhEmi>2026-01-15T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>12345678000199</CNPJ>
        <xNome>Empresa Emitente LTDA</xNome>
      </emit>
      <total>
        <ICMSTot>
          <vNF>15000.50</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

  /** Sample valid NFe XML using chNFe pattern */
  const VALID_NFE_XML_CHNFE = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <protNFe>
    <infProt>
      <chNFe>98765432109876543210987654321098765432109876</chNFe>
    </infProt>
  </protNFe>
  <NFe>
    <infNFe versao="4.00">
      <ide>
        <nNF>456</nNF>
        <serie>2</serie>
        <dhEmi>2026-02-01T08:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>98765432000188</CNPJ>
        <xNome>Outra Empresa SA</xNome>
      </emit>
      <total>
        <ICMSTot>
          <vNF>8500.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

  /** Invalid XML without fiscal key */
  const INVALID_NFE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <NFe>
    <infNFe versao="4.00">
      <ide><nNF>999</nNF></ide>
    </infNFe>
  </NFe>
</nfeProc>`;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByFiscalKey: vi.fn().mockResolvedValue(null), // No duplicate by default
      findMany: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      saveMany: vi.fn(),
      exists: vi.fn(),
      nextDocumentNumber: vi.fn().mockResolvedValue('000124'),
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    useCase = new ImportNfeXmlUseCase(mockRepository, mockLogger);

    ctx = {
      organizationId: 1,
      branchId: 1,
      userId: 'user-001',
    };
  });

  describe('execute', () => {
    it('should import valid NFe XML successfully (infNFe Id pattern)', async () => {
      const result = await useCase.execute(
        { xmlContent: VALID_NFE_XML, source: 'MANUAL' },
        ctx,
      );

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.fiscalKey).toBe('35260112345678000199550010000001231000001234');
        expect(result.value.documentNumber).toBe('123');
        expect(result.value.senderName).toBe('Empresa Emitente LTDA');
        expect(result.value.totalValue).toBe(15000.50);
        expect(result.value.documentId).toBeDefined();
        expect(result.value.importedAt).toBeInstanceOf(Date);
      }

      // Should have checked for duplicate
      expect(mockRepository.findByFiscalKey).toHaveBeenCalledWith(
        '35260112345678000199550010000001231000001234',
        1,
        1,
      );
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should import valid NFe XML successfully (chNFe pattern)', async () => {
      const result = await useCase.execute(
        { xmlContent: VALID_NFE_XML_CHNFE, source: 'SEFAZ' },
        ctx,
      );

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value.fiscalKey).toBe('98765432109876543210987654321098765432109876');
        expect(result.value.documentNumber).toBe('456');
        expect(result.value.senderName).toBe('Outra Empresa SA');
        expect(result.value.totalValue).toBe(8500.00);
      }
    });

    it('should accept EMAIL as valid source', async () => {
      const result = await useCase.execute(
        { xmlContent: VALID_NFE_XML, source: 'EMAIL' },
        ctx,
      );

      expect(Result.isOk(result)).toBe(true);
    });

    it('should detect duplicate NFe by fiscal key', async () => {
      const existingDoc = {
        id: 'existing-nfe-001',
        documentType: 'NFE',
      } as unknown as FiscalDocument;

      (mockRepository.findByFiscalKey as ReturnType<typeof vi.fn>).mockResolvedValue(existingDoc);

      const result = await useCase.execute(
        { xmlContent: VALID_NFE_XML, source: 'MANUAL' },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('já existe no sistema');
        expect(result.error).toContain('existing-nfe-001');
        expect(result.error).toContain('Importação duplicada');
      }
    });

    it('should fail with empty XML content', async () => {
      const result = await useCase.execute(
        { xmlContent: '', source: 'MANUAL' },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Conteúdo XML é obrigatório');
      }
    });

    it('should fail with whitespace-only XML content', async () => {
      const result = await useCase.execute(
        { xmlContent: '   ', source: 'MANUAL' },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Conteúdo XML é obrigatório');
      }
    });

    it('should fail with non-XML content', async () => {
      const result = await useCase.execute(
        { xmlContent: '{ "not": "xml" }', source: 'MANUAL' },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('não parece ser XML válido');
      }
    });

    it('should fail with invalid source', async () => {
      const result = await useCase.execute(
        { xmlContent: VALID_NFE_XML, source: 'INVALID' as 'MANUAL' },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Origem de importação inválida');
      }
    });

    it('should fail when XML has no fiscal key', async () => {
      const result = await useCase.execute(
        { xmlContent: INVALID_NFE_XML, source: 'MANUAL' },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Não foi possível extrair a chave de acesso');
      }
    });

    it('should fail with invalid organizationId', async () => {
      const result = await useCase.execute(
        { xmlContent: VALID_NFE_XML, source: 'MANUAL' },
        { ...ctx, organizationId: 0 },
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('organizationId inválido');
      }
    });

    it('should fail with invalid branchId', async () => {
      const result = await useCase.execute(
        { xmlContent: VALID_NFE_XML, source: 'MANUAL' },
        { ...ctx, branchId: -1 },
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('branchId inválido');
      }
    });

    it('should fail with empty userId', async () => {
      const result = await useCase.execute(
        { xmlContent: VALID_NFE_XML, source: 'MANUAL' },
        { ...ctx, userId: '' },
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('userId é obrigatório');
      }
    });

    it('should handle repository errors gracefully', async () => {
      (mockRepository.findByFiscalKey as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Connection refused'),
      );

      const result = await useCase.execute(
        { xmlContent: VALID_NFE_XML, source: 'MANUAL' },
        ctx,
      );

      expect(Result.isFail(result)).toBe(true);
      if (Result.isFail(result)) {
        expect(result.error).toContain('Erro ao importar NFe XML');
      }
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
