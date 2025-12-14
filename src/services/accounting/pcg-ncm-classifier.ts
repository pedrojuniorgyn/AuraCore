/**
 * 🧠 CLASSIFICADOR PCG x NCM
 * 
 * Serviço de Inteligência Fiscal que vincula Plano Gerencial (PCG) com NCM.
 * Permite sugestão inteligente de NCMs e aplicação automática de flags fiscais.
 * 
 * Uso:
 * - Dropdown de NCM em formulários (baseado na conta gerencial selecionada)
 * - Auto-preenchimento de flags fiscais (Monofásico, ST, etc.)
 * - Classificação automática de itens na importação de NFe
 */

import { db } from "@/lib/db";
import { pcgNcmRules, managementChartOfAccounts } from "@/lib/db/schema";
import { eq, and, isNull, like, asc } from "drizzle-orm";

export interface PcgNcmMatch {
  pcgId: number;
  pcgCode: string;
  pcgName: string;
  ncmCode: string;
  ncmDescription: string;
  flags: {
    pisCofinsMono: boolean;
    icmsSt: boolean;
    icmsDif: boolean;
    ipiSuspenso: boolean;
    importacao: boolean;
  };
  priority: number;
  matchType: "EXACT" | "WILDCARD";
}

/**
 * Sugere NCMs baseado na conta gerencial selecionada
 * 
 * @param pcgId - ID da conta gerencial (ex: G-1000 Combustível)
 * @param organizationId - ID da organização
 * @returns Array de NCMs sugeridos com flags fiscais
 * 
 * @example
 * // Usuário selecionou PCG "Peças de Reposição"
 * const suggestions = await suggestNcmsByPcg(2, 1);
 * // Retorna: [
 * //   { ncmCode: "87083090", description: "Sistemas de Freio", ... },
 * //   { ncmCode: "8708*", description: "Peças Veículos (Genérico)", ... }
 * // ]
 */
export async function suggestNcmsByPcg(
  pcgId: number,
  organizationId: number
): Promise<PcgNcmMatch[]> {
  try {
    const rules = await db
      .select({
        rule: pcgNcmRules,
        pcg: managementChartOfAccounts,
      })
      .from(pcgNcmRules)
      .leftJoin(
        managementChartOfAccounts,
        eq(pcgNcmRules.pcgId, managementChartOfAccounts.id)
      )
      .where(
        and(
          eq(pcgNcmRules.organizationId, organizationId),
          eq(pcgNcmRules.pcgId, pcgId),
          eq(pcgNcmRules.isActive, 1),
          isNull(pcgNcmRules.deletedAt)
        )
      )
      .orderBy(asc(pcgNcmRules.priority));

    return rules.map(({ rule, pcg }) => ({
      pcgId: rule.pcgId,
      pcgCode: pcg?.code || "",
      pcgName: pcg?.name || "",
      ncmCode: rule.ncmCode,
      ncmDescription: rule.ncmDescription || "",
      flags: {
        pisCofinsMono: rule.flagPisCofinsMono === 1,
        icmsSt: rule.flagIcmsSt === 1,
        icmsDif: rule.flagIcmsDif === 1,
        ipiSuspenso: rule.flagIpiSuspenso === 1,
        importacao: rule.flagImportacao === 1,
      },
      priority: rule.priority,
      matchType: rule.ncmCode.includes("*") ? "WILDCARD" : "EXACT",
    }));
  } catch (error: any) {
    console.error("❌ Erro ao sugerir NCMs por PCG:", error);
    return [];
  }
}

/**
 * Busca flags fiscais de um NCM específico
 * 
 * @param ncmCode - Código NCM (8 dígitos)
 * @param organizationId - ID da organização
 * @returns Match com flags fiscais ou null se não encontrado
 * 
 * @example
 * // Usuário digitou NCM "27101251"
 * const flags = await getFiscalFlagsByNcm("27101251", 1);
 * // Retorna: { 
 * //   pcgCode: "G-1000",
 * //   flags: { pisCofinsMono: true, icmsSt: false, ... }
 * // }
 */
export async function getFiscalFlagsByNcm(
  ncmCode: string,
  organizationId: number
): Promise<PcgNcmMatch | null> {
  try {
    // Normaliza NCM (remove pontos/formatação)
    const cleanNcm = ncmCode.replace(/\D/g, "");

    // 1. Busca por NCM EXATO (prioridade máxima)
    const [exactMatch] = await db
      .select({
        rule: pcgNcmRules,
        pcg: managementChartOfAccounts,
      })
      .from(pcgNcmRules)
      .leftJoin(
        managementChartOfAccounts,
        eq(pcgNcmRules.pcgId, managementChartOfAccounts.id)
      )
      .where(
        and(
          eq(pcgNcmRules.organizationId, organizationId),
          eq(pcgNcmRules.ncmCode, cleanNcm),
          eq(pcgNcmRules.isActive, 1),
          isNull(pcgNcmRules.deletedAt)
        )
      )
      .orderBy(asc(pcgNcmRules.priority))
      .limit(1);

    if (exactMatch) {
      const { rule, pcg } = exactMatch;
      return {
        pcgId: rule.pcgId,
        pcgCode: pcg?.code || "",
        pcgName: pcg?.name || "",
        ncmCode: rule.ncmCode,
        ncmDescription: rule.ncmDescription || "",
        flags: {
          pisCofinsMono: rule.flagPisCofinsMono === 1,
          icmsSt: rule.flagIcmsSt === 1,
          icmsDif: rule.flagIcmsDif === 1,
          ipiSuspenso: rule.flagIpiSuspenso === 1,
          importacao: rule.flagImportacao === 1,
        },
        priority: rule.priority,
        matchType: "EXACT",
      };
    }

    // 2. Se não achou exato, busca WILDCARD (ex: 8421* para 84212300)
    const wildcardRules = await db
      .select({
        rule: pcgNcmRules,
        pcg: managementChartOfAccounts,
      })
      .from(pcgNcmRules)
      .leftJoin(
        managementChartOfAccounts,
        eq(pcgNcmRules.pcgId, managementChartOfAccounts.id)
      )
      .where(
        and(
          eq(pcgNcmRules.organizationId, organizationId),
          like(pcgNcmRules.ncmCode, "%*"),
          eq(pcgNcmRules.isActive, 1),
          isNull(pcgNcmRules.deletedAt)
        )
      )
      .orderBy(asc(pcgNcmRules.priority));

    for (const { rule, pcg } of wildcardRules) {
      const pattern = rule.ncmCode.replace("*", "");
      if (cleanNcm.startsWith(pattern)) {
        return {
          pcgId: rule.pcgId,
          pcgCode: pcg?.code || "",
          pcgName: pcg?.name || "",
          ncmCode: rule.ncmCode,
          ncmDescription: rule.ncmDescription || "",
          flags: {
            pisCofinsMono: rule.flagPisCofinsMono === 1,
            icmsSt: rule.flagIcmsSt === 1,
            icmsDif: rule.flagIcmsDif === 1,
            ipiSuspenso: rule.flagIpiSuspenso === 1,
            importacao: rule.flagImportacao === 1,
          },
          priority: rule.priority,
          matchType: "WILDCARD",
        };
      }
    }

    // 3. Não encontrou nenhuma regra
    console.log(`⚠️  NCM ${cleanNcm} não encontrado nas regras PCG`);
    return null;
  } catch (error: any) {
    console.error("❌ Erro ao buscar flags fiscais por NCM:", error);
    return null;
  }
}

/**
 * Classifica item automaticamente usando PCG
 * USO: Importação automática de NFe (substitui classificação por PCC)
 * 
 * @param ncmCode - Código NCM do item
 * @param organizationId - ID da organização
 * @returns Classificação com PCG e flags ou null
 * 
 * @example
 * // Durante importação de NFe, item com NCM 27101251
 * const classification = await classifyItemByPcg("27101251", 1);
 * // Retorna: {
 * //   pcgId: 1,
 * //   pcgCode: "G-1000",
 * //   pcgName: "Custo Gerencial Diesel",
 * //   flags: { pisCofinsMono: true, ... }
 * // }
 */
export async function classifyItemByPcg(
  ncmCode: string,
  organizationId: number
): Promise<{
  pcgId: number;
  pcgCode: string;
  pcgName: string;
  flags: {
    pisCofinsMono: boolean;
    icmsSt: boolean;
    icmsDif: boolean;
    ipiSuspenso: boolean;
    importacao: boolean;
  };
} | null> {
  const match = await getFiscalFlagsByNcm(ncmCode, organizationId);

  if (match) {
    return {
      pcgId: match.pcgId,
      pcgCode: match.pcgCode,
      pcgName: match.pcgName,
      flags: match.flags,
    };
  }

  return null;
}

/**
 * Lista todas as contas gerenciais (PCG) ativas
 * USO: Popular dropdown de "Conta Gerencial" no formulário
 * 
 * @param organizationId - ID da organização
 * @returns Array de contas gerenciais
 */
export async function listActivePcgs(
  organizationId: number
): Promise<Array<{ id: number; code: string; name: string; category: string | null }>> {
  try {
    const pcgs = await db
      .select({
        id: managementChartOfAccounts.id,
        code: managementChartOfAccounts.code,
        name: managementChartOfAccounts.name,
        category: managementChartOfAccounts.category,
      })
      .from(managementChartOfAccounts)
      .where(
        and(
          eq(managementChartOfAccounts.organizationId, organizationId),
          eq(managementChartOfAccounts.status, "ACTIVE"),
          isNull(managementChartOfAccounts.deletedAt)
        )
      )
      .orderBy(asc(managementChartOfAccounts.code));

    return pcgs.map((p) => ({
      id: p.id,
      code: p.code || "",
      name: p.name,
      category: p.category,
    }));
  } catch (error: any) {
    console.error("❌ Erro ao listar PCGs:", error);
    return [];
  }
}

/**
 * Busca reversa: dado um NCM, retorna qual PCG ele pertence
 * USO: Auditoria/conferência de classificações
 * 
 * @param ncmCode - Código NCM
 * @param organizationId - ID da organização
 * @returns PCG vinculado ou null
 */
export async function findPcgByNcm(
  ncmCode: string,
  organizationId: number
): Promise<{ pcgId: number; pcgCode: string; pcgName: string } | null> {
  const match = await getFiscalFlagsByNcm(ncmCode, organizationId);
  
  if (match) {
    return {
      pcgId: match.pcgId,
      pcgCode: match.pcgCode,
      pcgName: match.pcgName,
    };
  }
  
  return null;
}





