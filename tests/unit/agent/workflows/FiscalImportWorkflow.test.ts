/**
 * @description Testes para FiscalImportWorkflow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FiscalImportWorkflow, type FiscalImportInput } from '@/agent/workflows/FiscalImportWorkflow';
import type { GoogleCloudClient } from '@/agent/integrations/google/GoogleCloudClient';
import type { GoogleWorkspaceClient } from '@/agent/integrations/google/GoogleWorkspaceClient';
import { Result } from '@/shared/domain';

describe('FiscalImportWorkflow', () => {
  // Mocks
  let mockGoogleCloud: GoogleCloudClient;
  let mockGoogleWorkspace: GoogleWorkspaceClient;

  beforeEach(() => {
    // Mock GoogleCloudClient
    // NFeExtractedData tem: chaveAcesso, numero, serie, emitente, destinatario, valores, dataEmissao
    mockGoogleCloud = {
      extractNFeData: vi.fn().mockResolvedValue(Result.ok({
        chaveAcesso: '12345678901234567890123456789012345678901234',
        numero: '123',
        serie: '1',
        dataEmissao: '2026-01-18',
        emitente: { cnpj: '12345678000199', razaoSocial: 'Empresa Teste' },
        destinatario: { cnpj: '98765432000188', razaoSocial: 'Cliente Teste' },
        valores: {
          total: 10000,
          baseIcms: 10000,
          icms: 1800,
        },
      })),
    } as unknown as GoogleCloudClient;

    // Mock GoogleWorkspaceClient
    mockGoogleWorkspace = {
      getEmailAttachment: vi.fn().mockResolvedValue(
        Result.ok(Buffer.from('<xml>nfe</xml>'))
      ),
      getFileContent: vi.fn().mockResolvedValue(
        Result.ok(Buffer.from('<xml>nfe</xml>'))
      ),
    } as unknown as GoogleWorkspaceClient;
  });

  describe('constructor', () => {
    it('deve criar workflow com configuração padrão', () => {
      const workflow = new FiscalImportWorkflow(mockGoogleCloud, mockGoogleWorkspace);
      expect(workflow).toBeDefined();
    });

    it('deve criar workflow sem Google Workspace', () => {
      const workflow = new FiscalImportWorkflow(mockGoogleCloud, null);
      expect(workflow).toBeDefined();
    });

    it('deve aceitar configuração customizada', () => {
      const workflow = new FiscalImportWorkflow(mockGoogleCloud, mockGoogleWorkspace, {
        validateOnly: true,
        recalculateTaxes: false,
      });
      expect(workflow).toBeDefined();
    });
  });

  describe('execute', () => {
    it('deve executar workflow completo com fonte upload', async () => {
      const workflow = new FiscalImportWorkflow(mockGoogleCloud, mockGoogleWorkspace);

      const input: FiscalImportInput = {
        source: 'upload',
        identifier: Buffer.from('<xml>nfe</xml>').toString('base64'),
        documentType: 'nfe',
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      expect(result.isSuccess).toBe(true);
      expect(result.value.success).toBe(true);
      expect(result.value.fiscalDocumentId).toBeDefined();
      expect(result.value.summary).toBeDefined();
      expect(result.value.summary?.documentNumber).toBe('123');
      expect(result.value.processingTimeMs).toBeGreaterThan(0);
    });

    it('deve executar workflow com fonte email', async () => {
      const workflow = new FiscalImportWorkflow(mockGoogleCloud, mockGoogleWorkspace);

      const input: FiscalImportInput = {
        source: 'email',
        identifier: 'msg-123:attach-456', // formato: messageId:attachmentId
        documentType: 'nfe',
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      expect(result.isSuccess).toBe(true);
      expect(mockGoogleWorkspace.getEmailAttachment).toHaveBeenCalledWith('msg-123', 'attach-456');
    });

    it('deve executar workflow com fonte drive', async () => {
      const workflow = new FiscalImportWorkflow(mockGoogleCloud, mockGoogleWorkspace);

      const input: FiscalImportInput = {
        source: 'drive',
        identifier: 'file-123',
        documentType: 'nfe',
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      expect(result.isSuccess).toBe(true);
      expect(mockGoogleWorkspace.getFileContent).toHaveBeenCalledWith('file-123');
    });

    it('deve falhar se fonte email sem Google Workspace', async () => {
      const workflow = new FiscalImportWorkflow(mockGoogleCloud, null);

      const input: FiscalImportInput = {
        source: 'email',
        identifier: 'msg-123:attach-456',
        documentType: 'nfe',
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      expect(result.isSuccess).toBe(true); // Workflow executa, mas retorna erro interno
      expect(result.value.success).toBe(false);
      expect(result.value.errors).toContain('Google Workspace não configurado para buscar email');
    });

    it('deve falhar se extração retornar erro', async () => {
      mockGoogleCloud.extractNFeData = vi.fn().mockResolvedValue(
        Result.fail('Erro ao processar documento')
      );

      const workflow = new FiscalImportWorkflow(mockGoogleCloud, mockGoogleWorkspace);

      const input: FiscalImportInput = {
        source: 'upload',
        identifier: Buffer.from('<xml>nfe</xml>').toString('base64'),
        documentType: 'nfe',
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      expect(result.isSuccess).toBe(true);
      expect(result.value.success).toBe(false);
      expect(result.value.errors.some(e => e.includes('Erro na extração'))).toBe(true);
    });

    it('deve validar chave de acesso inválida', async () => {
      mockGoogleCloud.extractNFeData = vi.fn().mockResolvedValue(Result.ok({
        chaveAcesso: '123', // Chave inválida (não tem 44 dígitos)
        numero: '123',
        serie: '1',
        dataEmissao: '2026-01-18',
        emitente: { cnpj: '12345678000199', razaoSocial: 'Empresa' },
        destinatario: { cnpj: '98765432000188', razaoSocial: 'Cliente' },
        valores: { total: 10000, baseIcms: 10000, icms: 1800 },
      }));

      const workflow = new FiscalImportWorkflow(mockGoogleCloud, mockGoogleWorkspace, {
        validateOnly: true,
      });

      const input: FiscalImportInput = {
        source: 'upload',
        identifier: Buffer.from('<xml>nfe</xml>').toString('base64'),
        documentType: 'nfe',
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      expect(result.value.success).toBe(false);
      expect(result.value.errors.some(e => e.includes('Chave de acesso'))).toBe(true);
    });

    it('deve pular cálculo de impostos quando desabilitado', async () => {
      const workflow = new FiscalImportWorkflow(mockGoogleCloud, mockGoogleWorkspace, {
        recalculateTaxes: false,
      });

      const input: FiscalImportInput = {
        source: 'upload',
        identifier: Buffer.from('<xml>nfe</xml>').toString('base64'),
        documentType: 'nfe',
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      expect(result.isSuccess).toBe(true);
      expect(result.value.success).toBe(true);
    });

    it('deve retornar warnings de validação', async () => {
      mockGoogleCloud.extractNFeData = vi.fn().mockResolvedValue(Result.ok({
        chaveAcesso: '12345678901234567890123456789012345678901234',
        numero: '123',
        serie: '1',
        dataEmissao: '2026-01-18',
        emitente: { cnpj: '12345678000199', razaoSocial: 'Empresa' },
        destinatario: { cnpj: '98765432000188', razaoSocial: 'Cliente' },
        valores: { total: 10000, baseIcms: 10000, icms: 1800 },
        // Sem itens = warning (na estrutura simplificada, items não existe)
      }));

      const workflow = new FiscalImportWorkflow(mockGoogleCloud, mockGoogleWorkspace);

      const input: FiscalImportInput = {
        source: 'upload',
        identifier: Buffer.from('<xml>nfe</xml>').toString('base64'),
        documentType: 'nfe',
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      expect(result.value.success).toBe(true);
      expect(result.value.warnings.length).toBeGreaterThan(0);
    });

    it('deve respeitar modo validateOnly', async () => {
      const workflow = new FiscalImportWorkflow(mockGoogleCloud, mockGoogleWorkspace, {
        validateOnly: true,
      });

      const input: FiscalImportInput = {
        source: 'upload',
        identifier: Buffer.from('<xml>nfe</xml>').toString('base64'),
        documentType: 'nfe',
        organizationId: 1,
        branchId: 1,
        userId: 'user-123',
      };

      const result = await workflow.execute(input);

      expect(result.isSuccess).toBe(true);
      expect(result.value.success).toBe(true);
      // Em modo validateOnly, não deve ter fiscalDocumentId
      // (documento não é salvo)
    });
  });
});
