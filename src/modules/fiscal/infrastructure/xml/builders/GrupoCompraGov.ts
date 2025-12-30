/**
 * XML Builder: Grupo Compra Governamental
 * 
 * Conforme Nota Técnica 2025.001 e 2025.002
 * Tags: <compraGov>, <tpEnte>, <pReducao>
 * 
 * Redução de alíquota para compras de entes públicos
 */
export class GrupoCompraGov {
  /**
   * Tipos de ente governamental
   * Nota: Distrito Federal está incluído no tipo 2 (Estadual/DF)
   */
  static readonly ENTITY_TYPES = {
    FEDERAL: 1,
    ESTADUAL: 2, // Inclui Distrito Federal
    MUNICIPAL: 3,
  } as const;

  /**
   * Gera XML do grupo Compra Governamental
   */
  static build(params: {
    entityType: number;
    reductionRate: number;
  }): string {
    const xml: string[] = [];
    
    xml.push('  <compraGov>');
    
    // Tipo de Ente (obrigatório)
    xml.push(`    <tpEnte>${params.entityType}</tpEnte>`);
    
    // Percentual de Redução (obrigatório)
    xml.push(`    <pReducao>${this.formatDecimal(params.reductionRate)}</pReducao>`);
    
    xml.push('  </compraGov>');
    
    return xml.join('\n');
  }

  /**
   * Formata número para XML (2 casas decimais)
   */
  private static formatDecimal(value: number): string {
    return value.toFixed(2);
  }

  /**
   * Valida campos obrigatórios antes de gerar XML
   */
  static validate(params: {
    entityType: number;
    reductionRate: number;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validar tipo de ente (1 a 3)
    if (!params.entityType || params.entityType < 1 || params.entityType > 3) {
      errors.push('Tipo de ente inválido (deve ser 1-3)');
    }
    
    // Validar percentual de redução (0 a 100)
    if (params.reductionRate === null || params.reductionRate === undefined) {
      errors.push('Percentual de redução é obrigatório');
    } else if (params.reductionRate < 0 || params.reductionRate > 100) {
      errors.push('Percentual de redução deve estar entre 0 e 100');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Retorna descrição do tipo de ente
   */
  static getEntityTypeName(entityType: number): string {
    switch (entityType) {
      case this.ENTITY_TYPES.FEDERAL:
        return 'Federal';
      case this.ENTITY_TYPES.ESTADUAL:
        return 'Estadual/DF';
      case this.ENTITY_TYPES.MUNICIPAL:
        return 'Municipal';
      default:
        return 'Desconhecido';
    }
  }

  /**
   * Verifica se CNPJ é de ente governamental
   * (Validação simplificada - em produção, consultar base de dados)
   */
  static isGovernmentEntity(cnpj: string): boolean {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    // CNPJs públicos geralmente terminam em 0001 e têm padrões específicos
    // Esta é uma validação simplificada
    // Em produção, consultar SIAFI, Serpro ou base própria
    
    // Exemplos conhecidos (lista parcial):
    const governmentPrefixes = [
      '00394460', // União (Tesouro Nacional)
      '00000000', // Administração direta federal
      '26990000', // Prefeituras (padrão aproximado)
      '00360305', // Banco do Brasil (operações gov)
    ];
    
    return governmentPrefixes.some(prefix => cleanCnpj.startsWith(prefix));
  }

  /**
   * Calcula valor da redução aplicada
   */
  static calculateReduction(originalValue: number, reductionRate: number): number {
    if (reductionRate < 0 || reductionRate > 100) {
      throw new Error('Percentual de redução deve estar entre 0 e 100');
    }
    
    return originalValue * (reductionRate / 100);
  }

  /**
   * Calcula valor após redução
   */
  static applyReduction(originalValue: number, reductionRate: number): number {
    const reduction = this.calculateReduction(originalValue, reductionRate);
    return originalValue - reduction;
  }
}

