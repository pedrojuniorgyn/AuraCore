/**
 * XML Builder: Grupo CompraGov (Compras Governamentais)
 * 
 * Gera XML conforme NT 2025.001 (CT-e) e NT 2025.002 (NF-e)
 * 
 * Estrutura:
 * <compraGov>
 *   <tpEnteGov>1</tpEnteGov>
 *   <UFEnteGov>DF</UFEnteGov>
 * </compraGov>
 * 
 * Identifica compras realizadas por entes públicos,
 * que podem ter alíquotas reduzidas de IBS/CBS.
 */

export interface GovernmentPurchaseData {
  entityType: 1 | 2 | 3; // 1=União, 2=Estado/DF, 3=Município
  uf?: string; // UF do ente (obrigatório se tipo 2 ou 3)
  municipalityCode?: string; // Código IBGE (obrigatório se tipo 3)
}

export class GrupoCompraGov {
  /**
   * Tipos de ente governamental
   */
  static readonly ENTITY_TYPES = {
    FEDERAL: 1 as const, // União
    STATE: 2 as const, // Estado ou Distrito Federal
    MUNICIPAL: 3 as const, // Município
  };

  /**
   * Gera XML do grupo compraGov
   */
  static build(data: GovernmentPurchaseData): string {
    const xml: string[] = [];

    xml.push('<compraGov>');
    xml.push(`  <tpEnteGov>${data.entityType}</tpEnteGov>`);
    
    // UF obrigatório para Estado/DF e Município
    if (data.uf && (data.entityType === 2 || data.entityType === 3)) {
      xml.push(`  <UFEnteGov>${data.uf}</UFEnteGov>`);
    }
    
    // Código município obrigatório para Município
    if (data.municipalityCode && data.entityType === 3) {
      xml.push(`  <cMunEnteGov>${data.municipalityCode}</cMunEnteGov>`);
    }
    
    xml.push('</compraGov>');

    return xml.join('\n');
  }

  /**
   * Valida campos obrigatórios
   */
  static validate(data: GovernmentPurchaseData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar tipo de ente
    if (!data.entityType || ![1, 2, 3].includes(data.entityType)) {
      errors.push('Tipo de ente governamental deve ser 1 (União), 2 (Estado/DF) ou 3 (Município)');
    }

    // Validar UF para Estado/DF e Município
    if (data.entityType === 2 || data.entityType === 3) {
      if (!data.uf || data.uf.trim().length !== 2) {
        errors.push('UF é obrigatória para Estado/DF ou Município (2 letras)');
      }
    }

    // Validar código município para Município
    if (data.entityType === 3) {
      if (!data.municipalityCode || data.municipalityCode.trim().length !== 7) {
        errors.push('Código do município é obrigatório e deve ter 7 dígitos');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Helper para obter descrição do tipo de ente
   */
  static getEntityTypeDescription(entityType: 1 | 2 | 3): string {
    switch (entityType) {
      case 1:
        return 'União Federal';
      case 2:
        return 'Estado ou Distrito Federal';
      case 3:
        return 'Município';
      default:
        return 'Tipo desconhecido';
    }
  }
}
