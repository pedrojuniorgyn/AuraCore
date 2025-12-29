import { Result } from '@/shared/domain';

/**
 * Value Object: CSOSN (Código de Situação da Operação no Simples Nacional)
 * 
 * Aplicável apenas para empresas optantes pelo Simples Nacional.
 * 
 * Códigos:
 * 101 - Tributada com permissão de crédito
 * 102 - Tributada sem permissão de crédito
 * 103 - Isenção do ICMS para faixa de receita bruta
 * 201 - Tributada com ST com permissão de crédito
 * 202 - Tributada com ST sem permissão de crédito
 * 203 - Isenção do ICMS para faixa de receita bruta com ST
 * 300 - Imune
 * 400 - Não tributada
 * 500 - ICMS cobrado anteriormente por ST ou por antecipação
 * 900 - Outros
 */

export interface CSOSNProps {
  code: string;
}

export class CSOSN {
  private readonly _props: CSOSNProps;

  private constructor(props: CSOSNProps) {
    this._props = Object.freeze({ ...props });
  }

  get code(): string {
    return this._props.code;
  }

  /**
   * Sempre true, pois CSOSN é só para Simples Nacional
   */
  get isSimplesNacional(): boolean {
    return true;
  }

  /**
   * Permite crédito de ICMS?
   */
  get permiteCreditoICMS(): boolean {
    return ['101', '201'].includes(this._props.code);
  }

  /**
   * Tem substituição tributária?
   */
  get hasSubstituicao(): boolean {
    return ['201', '202', '203', '500'].includes(this._props.code);
  }

  /**
   * É isento ou não tributado?
   */
  get isento(): boolean {
    return ['103', '203', '300', '400'].includes(this._props.code);
  }

  /**
   * Descrição
   */
  get descricao(): string {
    const descricoes: Record<string, string> = {
      '101': 'Tributada com crédito',
      '102': 'Tributada sem crédito',
      '103': 'Isenção por faixa de receita',
      '201': 'Tributada ST com crédito',
      '202': 'Tributada ST sem crédito',
      '203': 'Isenção por faixa com ST',
      '300': 'Imune',
      '400': 'Não tributada',
      '500': 'ICMS ST cobrado anteriormente',
      '900': 'Outros',
    };
    return descricoes[this._props.code] ?? 'Desconhecida';
  }

  /**
   * Factory method
   */
  static create(code: string): Result<CSOSN, string> {
    // Remover formatação
    const cleanCode = code.replace(/\D/g, '');

    // Validar tamanho
    if (cleanCode.length !== 3) {
      return Result.fail(`CSOSN must have 3 digits, got: ${code}`);
    }

    // Validar código
    const codigosValidos = ['101', '102', '103', '201', '202', '203', '300', '400', '500', '900'];
    if (!codigosValidos.includes(cleanCode)) {
      return Result.fail(`Invalid CSOSN code: ${cleanCode}. Must be one of: ${codigosValidos.join(', ')}`);
    }

    return Result.ok(new CSOSN({ code: cleanCode }));
  }

  /**
   * Verifica igualdade
   */
  equals(other: CSOSN): boolean {
    return this.code === other.code;
  }
}

