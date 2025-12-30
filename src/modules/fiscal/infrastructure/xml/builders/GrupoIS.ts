import { Money } from '@/shared/domain';
import { Aliquota } from '../../../domain/tax/value-objects/Aliquota';

/**
 * XML Builder: Grupo IS (Imposto Seletivo)
 * 
 * Conforme Nota Técnica 2025.001 e 2025.002
 * Aplica-se a produtos específicos (combustíveis, bebidas, tabaco, minerais, etc.)
 * Tags: <IS>, <vBCIS>, <pIS>, <vIS>
 */
export class GrupoIS {
  /**
   * Gera XML do grupo Imposto Seletivo
   */
  static build(params: {
    baseCalculo: Money;
    aliquota: Aliquota;
    valorIS: Money;
    ncm: string;
    categoria: string;
  }): string {
    const xml: string[] = [];
    
    xml.push('  <IS>');
    
    // NCM (obrigatório para IS)
    xml.push(`    <NCM>${params.ncm}</NCM>`);
    
    // Categoria do produto (obrigatório)
    xml.push(`    <catProd>${this.escapeXml(params.categoria)}</catProd>`);
    
    // Base de Cálculo (obrigatório)
    xml.push(`    <vBCIS>${this.formatDecimal(params.baseCalculo.amount)}</vBCIS>`);
    
    // Alíquota (obrigatório)
    xml.push(`    <pIS>${this.formatDecimal(params.aliquota.percentual)}</pIS>`);
    
    // Valor do IS (obrigatório)
    xml.push(`    <vIS>${this.formatDecimal(params.valorIS.amount)}</vIS>`);
    
    xml.push('  </IS>');
    
    return xml.join('\n');
  }

  /**
   * Formata número para XML (2 casas decimais)
   */
  private static formatDecimal(value: number): string {
    return value.toFixed(2);
  }

  /**
   * Escapa caracteres especiais XML
   */
  private static escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Valida campos obrigatórios antes de gerar XML
   */
  static validate(params: {
    baseCalculo: Money;
    aliquota: Aliquota;
    valorIS: Money;
    ncm: string;
    categoria: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!params.ncm || params.ncm.trim() === '') {
      errors.push('NCM é obrigatório para Imposto Seletivo');
    } else if (!/^\d{8}$/.test(params.ncm.replace(/\D/g, ''))) {
      errors.push('NCM deve ter 8 dígitos');
    }
    
    if (!params.categoria || params.categoria.trim() === '') {
      errors.push('Categoria do produto é obrigatória');
    }
    
    if (!params.baseCalculo || params.baseCalculo.amount < 0) {
      errors.push('Base de cálculo inválida');
    }
    
    if (!params.aliquota || params.aliquota.percentual < 0) {
      errors.push('Alíquota inválida');
    }
    
    if (!params.valorIS || params.valorIS.amount < 0) {
      errors.push('Valor do IS inválido');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Lista de NCMs sujeitos ao Imposto Seletivo
   * (Conforme PLP 68/2024 - lista simplificada)
   */
  static readonly NCM_SUJEITOS_IS = [
    // Bebidas alcoólicas
    '2203', '2204', '2205', '2206', '2207', '2208',
    // Cigarros e tabaco
    '2402', '2403',
    // Veículos
    '8703', '8711',
    // Embarcações e aeronaves
    '8901', '8902', '8903', '8904', '8905',
    // Produtos de mineração
    '2601', '2602', '2603', '2604', '2605', '2606', '2607', '2608', '2609', '2610',
    '2611', '2612', '2613', '2614', '2615', '2616', '2617', '2618', '2619', '2620', '2621',
    // Bens prejudiciais à saúde/meio ambiente (lista parcial)
    '3303', // Perfumes e cosméticos (alguns)
  ];

  /**
   * Verifica se NCM está sujeito ao IS
   */
  static isSubjectToIS(ncm: string): boolean {
    const cleanNcm = ncm.replace(/\D/g, '').substring(0, 4);
    return this.NCM_SUJEITOS_IS.some(prefix => cleanNcm.startsWith(prefix));
  }
}

