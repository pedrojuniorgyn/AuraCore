/**
 * 📋 SEED CFOP DETERMINATION - COMMAND (ARCH-012)
 * 
 * Popula tabela cfop_determination com ~50 regras padrão.
 * Cobre os principais cenários de CTe, NFe e serviços de transporte.
 * 
 * F3.3: CFOP Determination
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { cfopDeterminationTable } from '../../infrastructure/persistence/schemas/cfop-determination.schema';
import { eq, and, isNull } from 'drizzle-orm';

interface SeedRule {
  operationType: string;
  direction: 'ENTRY' | 'EXIT';
  scope: 'INTRASTATE' | 'INTERSTATE' | 'FOREIGN';
  taxRegime?: string;
  documentType?: string;
  cfopCode: string;
  cfopDescription: string;
  priority: number;
}

const DEFAULT_RULES: SeedRule[] = [
  // =============================================
  // FRETE / TRANSPORTE (CTe)
  // =============================================
  // Saída: Prestação de serviço de transporte
  { operationType: 'FRETE', direction: 'EXIT', scope: 'INTRASTATE', documentType: 'CTE', cfopCode: '5353', cfopDescription: 'Prestação de serviço de transporte - estadual', priority: 10 },
  { operationType: 'FRETE', direction: 'EXIT', scope: 'INTERSTATE', documentType: 'CTE', cfopCode: '6353', cfopDescription: 'Prestação de serviço de transporte - interestadual', priority: 10 },
  { operationType: 'FRETE', direction: 'EXIT', scope: 'FOREIGN', documentType: 'CTE', cfopCode: '7353', cfopDescription: 'Prestação de serviço de transporte - exterior', priority: 10 },
  // Entrada: Aquisição de serviço de transporte
  { operationType: 'FRETE', direction: 'ENTRY', scope: 'INTRASTATE', documentType: 'CTE', cfopCode: '1353', cfopDescription: 'Aquisição de serviço de transporte - estadual', priority: 10 },
  { operationType: 'FRETE', direction: 'ENTRY', scope: 'INTERSTATE', documentType: 'CTE', cfopCode: '2353', cfopDescription: 'Aquisição de serviço de transporte - interestadual', priority: 10 },

  // Redespacho
  { operationType: 'REDESPACHO', direction: 'EXIT', scope: 'INTRASTATE', documentType: 'CTE', cfopCode: '5360', cfopDescription: 'Prestação de serviço de transporte - redespacho estadual', priority: 10 },
  { operationType: 'REDESPACHO', direction: 'EXIT', scope: 'INTERSTATE', documentType: 'CTE', cfopCode: '6360', cfopDescription: 'Prestação de serviço de transporte - redespacho interestadual', priority: 10 },

  // Subcontratação
  { operationType: 'SUBCONTRATACAO', direction: 'EXIT', scope: 'INTRASTATE', documentType: 'CTE', cfopCode: '5360', cfopDescription: 'Prestação de serviço de transporte - subcontratação estadual', priority: 20 },
  { operationType: 'SUBCONTRATACAO', direction: 'EXIT', scope: 'INTERSTATE', documentType: 'CTE', cfopCode: '6360', cfopDescription: 'Prestação de serviço de transporte - subcontratação interestadual', priority: 20 },

  // Transporte com lotação
  { operationType: 'LOTACAO', direction: 'EXIT', scope: 'INTRASTATE', documentType: 'CTE', cfopCode: '5357', cfopDescription: 'Prestação de serviço de transporte - lotação estadual', priority: 10 },
  { operationType: 'LOTACAO', direction: 'EXIT', scope: 'INTERSTATE', documentType: 'CTE', cfopCode: '6357', cfopDescription: 'Prestação de serviço de transporte - lotação interestadual', priority: 10 },

  // =============================================
  // VENDA DE MERCADORIAS (NFe)
  // =============================================
  // Normal
  { operationType: 'VENDA', direction: 'EXIT', scope: 'INTRASTATE', documentType: 'NFE', cfopCode: '5102', cfopDescription: 'Venda de mercadoria adquirida - estadual', priority: 10 },
  { operationType: 'VENDA', direction: 'EXIT', scope: 'INTERSTATE', documentType: 'NFE', cfopCode: '6102', cfopDescription: 'Venda de mercadoria adquirida - interestadual', priority: 10 },
  { operationType: 'VENDA', direction: 'EXIT', scope: 'FOREIGN', documentType: 'NFE', cfopCode: '7102', cfopDescription: 'Venda de mercadoria adquirida - exterior', priority: 10 },
  // Produção própria
  { operationType: 'VENDA_PRODUCAO', direction: 'EXIT', scope: 'INTRASTATE', documentType: 'NFE', cfopCode: '5101', cfopDescription: 'Venda de produção do estabelecimento - estadual', priority: 10 },
  { operationType: 'VENDA_PRODUCAO', direction: 'EXIT', scope: 'INTERSTATE', documentType: 'NFE', cfopCode: '6101', cfopDescription: 'Venda de produção do estabelecimento - interestadual', priority: 10 },
  // Substituição Tributária
  { operationType: 'VENDA', direction: 'EXIT', scope: 'INTRASTATE', taxRegime: 'ST', documentType: 'NFE', cfopCode: '5405', cfopDescription: 'Venda de mercadoria adquirida - ST estadual', priority: 5 },
  { operationType: 'VENDA', direction: 'EXIT', scope: 'INTERSTATE', taxRegime: 'ST', documentType: 'NFE', cfopCode: '6404', cfopDescription: 'Venda de mercadoria ST - interestadual', priority: 5 },

  // =============================================
  // COMPRA DE MERCADORIAS (NFe)
  // =============================================
  { operationType: 'COMPRA', direction: 'ENTRY', scope: 'INTRASTATE', documentType: 'NFE', cfopCode: '1102', cfopDescription: 'Compra para comercialização - estadual', priority: 10 },
  { operationType: 'COMPRA', direction: 'ENTRY', scope: 'INTERSTATE', documentType: 'NFE', cfopCode: '2102', cfopDescription: 'Compra para comercialização - interestadual', priority: 10 },
  { operationType: 'COMPRA', direction: 'ENTRY', scope: 'FOREIGN', documentType: 'NFE', cfopCode: '3102', cfopDescription: 'Compra para comercialização - exterior', priority: 10 },
  // Compra para uso/consumo
  { operationType: 'COMPRA_USO_CONSUMO', direction: 'ENTRY', scope: 'INTRASTATE', documentType: 'NFE', cfopCode: '1556', cfopDescription: 'Compra para uso ou consumo - estadual', priority: 10 },
  { operationType: 'COMPRA_USO_CONSUMO', direction: 'ENTRY', scope: 'INTERSTATE', documentType: 'NFE', cfopCode: '2556', cfopDescription: 'Compra para uso ou consumo - interestadual', priority: 10 },
  // Compra para ativo imobilizado
  { operationType: 'COMPRA_ATIVO', direction: 'ENTRY', scope: 'INTRASTATE', documentType: 'NFE', cfopCode: '1551', cfopDescription: 'Compra de ativo imobilizado - estadual', priority: 10 },
  { operationType: 'COMPRA_ATIVO', direction: 'ENTRY', scope: 'INTERSTATE', documentType: 'NFE', cfopCode: '2551', cfopDescription: 'Compra de ativo imobilizado - interestadual', priority: 10 },

  // =============================================
  // DEVOLUÇÃO
  // =============================================
  // Devolução de venda
  { operationType: 'DEVOLUCAO_VENDA', direction: 'ENTRY', scope: 'INTRASTATE', documentType: 'NFE', cfopCode: '1202', cfopDescription: 'Devolução de venda - estadual', priority: 10 },
  { operationType: 'DEVOLUCAO_VENDA', direction: 'ENTRY', scope: 'INTERSTATE', documentType: 'NFE', cfopCode: '2202', cfopDescription: 'Devolução de venda - interestadual', priority: 10 },
  // Devolução de compra
  { operationType: 'DEVOLUCAO_COMPRA', direction: 'EXIT', scope: 'INTRASTATE', documentType: 'NFE', cfopCode: '5202', cfopDescription: 'Devolução de compra - estadual', priority: 10 },
  { operationType: 'DEVOLUCAO_COMPRA', direction: 'EXIT', scope: 'INTERSTATE', documentType: 'NFE', cfopCode: '6202', cfopDescription: 'Devolução de compra - interestadual', priority: 10 },

  // =============================================
  // TRANSFERÊNCIA
  // =============================================
  { operationType: 'TRANSFERENCIA', direction: 'EXIT', scope: 'INTRASTATE', documentType: 'NFE', cfopCode: '5152', cfopDescription: 'Transferência de mercadoria - estadual', priority: 10 },
  { operationType: 'TRANSFERENCIA', direction: 'EXIT', scope: 'INTERSTATE', documentType: 'NFE', cfopCode: '6152', cfopDescription: 'Transferência de mercadoria - interestadual', priority: 10 },
  { operationType: 'TRANSFERENCIA', direction: 'ENTRY', scope: 'INTRASTATE', documentType: 'NFE', cfopCode: '1152', cfopDescription: 'Transferência de mercadoria - estadual (entrada)', priority: 10 },
  { operationType: 'TRANSFERENCIA', direction: 'ENTRY', scope: 'INTERSTATE', documentType: 'NFE', cfopCode: '2152', cfopDescription: 'Transferência de mercadoria - interestadual (entrada)', priority: 10 },

  // =============================================
  // REMESSA
  // =============================================
  { operationType: 'REMESSA_CONSERTO', direction: 'EXIT', scope: 'INTRASTATE', documentType: 'NFE', cfopCode: '5915', cfopDescription: 'Remessa de mercadoria para conserto - estadual', priority: 10 },
  { operationType: 'REMESSA_CONSERTO', direction: 'EXIT', scope: 'INTERSTATE', documentType: 'NFE', cfopCode: '6915', cfopDescription: 'Remessa de mercadoria para conserto - interestadual', priority: 10 },
  { operationType: 'RETORNO_CONSERTO', direction: 'ENTRY', scope: 'INTRASTATE', documentType: 'NFE', cfopCode: '1916', cfopDescription: 'Retorno de mercadoria de conserto - estadual', priority: 10 },
  { operationType: 'RETORNO_CONSERTO', direction: 'ENTRY', scope: 'INTERSTATE', documentType: 'NFE', cfopCode: '2916', cfopDescription: 'Retorno de mercadoria de conserto - interestadual', priority: 10 },
  { operationType: 'REMESSA_DEMONSTRACAO', direction: 'EXIT', scope: 'INTRASTATE', documentType: 'NFE', cfopCode: '5912', cfopDescription: 'Remessa para demonstração - estadual', priority: 10 },
  { operationType: 'REMESSA_DEMONSTRACAO', direction: 'EXIT', scope: 'INTERSTATE', documentType: 'NFE', cfopCode: '6912', cfopDescription: 'Remessa para demonstração - interestadual', priority: 10 },

  // =============================================
  // SERVIÇOS (NFS-e)
  // =============================================
  { operationType: 'SERVICO', direction: 'EXIT', scope: 'INTRASTATE', documentType: 'NFSE', cfopCode: '5933', cfopDescription: 'Prestação de serviço tributado pelo ISS', priority: 10 },
  { operationType: 'SERVICO', direction: 'EXIT', scope: 'INTERSTATE', documentType: 'NFSE', cfopCode: '6933', cfopDescription: 'Prestação de serviço tributado pelo ISS - interestadual', priority: 10 },

  // =============================================
  // OPERAÇÕES DIVERSAS
  // =============================================
  { operationType: 'BONIFICACAO', direction: 'EXIT', scope: 'INTRASTATE', documentType: 'NFE', cfopCode: '5910', cfopDescription: 'Remessa em bonificação - estadual', priority: 10 },
  { operationType: 'BONIFICACAO', direction: 'EXIT', scope: 'INTERSTATE', documentType: 'NFE', cfopCode: '6910', cfopDescription: 'Remessa em bonificação - interestadual', priority: 10 },
  { operationType: 'AMOSTRA_GRATIS', direction: 'EXIT', scope: 'INTRASTATE', documentType: 'NFE', cfopCode: '5911', cfopDescription: 'Remessa de amostra grátis - estadual', priority: 10 },
  { operationType: 'OUTROS', direction: 'EXIT', scope: 'INTRASTATE', documentType: 'NFE', cfopCode: '5949', cfopDescription: 'Outra saída de mercadoria não especificada - estadual', priority: 100 },
  { operationType: 'OUTROS', direction: 'EXIT', scope: 'INTERSTATE', documentType: 'NFE', cfopCode: '6949', cfopDescription: 'Outra saída de mercadoria não especificada - interestadual', priority: 100 },
  { operationType: 'OUTROS', direction: 'ENTRY', scope: 'INTRASTATE', documentType: 'NFE', cfopCode: '1949', cfopDescription: 'Outra entrada não especificada - estadual', priority: 100 },
  { operationType: 'OUTROS', direction: 'ENTRY', scope: 'INTERSTATE', documentType: 'NFE', cfopCode: '2949', cfopDescription: 'Outra entrada não especificada - interestadual', priority: 100 },
];

@injectable()
export class SeedCFOPDeterminationUseCase {
  async execute(organizationId: number): Promise<Result<{ inserted: number; skipped: number }, string>> {
    let inserted = 0;
    let skipped = 0;

    for (const rule of DEFAULT_RULES) {
      // Verificar se já existe
      const existing = await db
        .select({ id: cfopDeterminationTable.id })
        .from(cfopDeterminationTable)
        .where(
          and(
            eq(cfopDeterminationTable.organizationId, organizationId),
            eq(cfopDeterminationTable.operationType, rule.operationType),
            eq(cfopDeterminationTable.direction, rule.direction),
            eq(cfopDeterminationTable.scope, rule.scope),
            eq(cfopDeterminationTable.cfopCode, rule.cfopCode),
            isNull(cfopDeterminationTable.deletedAt)
          )
        );

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await db.insert(cfopDeterminationTable).values({
        id: globalThis.crypto.randomUUID(),
        organizationId,
        operationType: rule.operationType,
        direction: rule.direction,
        scope: rule.scope,
        taxRegime: rule.taxRegime ?? null,
        documentType: rule.documentType ?? null,
        cfopCode: rule.cfopCode,
        cfopDescription: rule.cfopDescription,
        isDefault: true,
        priority: rule.priority,
        status: 'ACTIVE',
      });
      inserted++;
    }

    return Result.ok({ inserted, skipped });
  }
}
