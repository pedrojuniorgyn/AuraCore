import { Result } from '@/shared/domain';

/**
 * Value Object: CST (Código de Situação Tributária do ICMS)
 * 
 * Estrutura: XYZ (3 dígitos)
 * - X: Origem da mercadoria (0-8)
 * - YZ: Tributação do ICMS (00-90)
 * 
 * Origem:
 * 0 - Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8
 * 1 - Estrangeira - Importação direta, exceto a indicada no código 6
 * 2 - Estrangeira - Adquirida no mercado interno, exceto a indicada no código 7
 * 3 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40% e inferior ou igual a 70%
 * 4 - Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos
 * 5 - Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%
 * 6 - Estrangeira - Importação direta, sem similar nacional, constante em lista da CAMEX
 * 7 - Estrangeira - Adquirida no mercado interno, sem similar nacional, constante em lista da CAMEX
 * 8 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 70%
 * 
 * Tributação:
 * 00 - Tributada integralmente
 * 10 - Tributada e com cobrança do ICMS por substituição tributária
 * 20 - Com redução de base de cálculo
 * 30 - Isenta ou não tributada e com cobrança do ICMS por substituição tributária
 * 40 - Isenta
 * 41 - Não tributada
 * 50 - Suspensão
 * 51 - Diferimento
 * 60 - ICMS cobrado anteriormente por substituição tributária
 * 70 - Com redução de base de cálculo e cobrança do ICMS por substituição tributária
 * 90 - Outras
 */

export interface CSTProps {
  origem: string;
  tributacao: string;
}

export class CST {
  private readonly _props: CSTProps;

  private constructor(props: CSTProps) {
    this._props = Object.freeze({ ...props });
  }

  get origem(): string {
    return this._props.origem;
  }

  get tributacao(): string {
    return this._props.tributacao;
  }

  get code(): string {
    return `${this._props.origem}${this._props.tributacao}`;
  }

  /**
   * CST é de mercadoria isenta ou não tributada?
   */
  get isento(): boolean {
    return ['40', '41', '50'].includes(this._props.tributacao);
  }

  /**
   * CST indica substituição tributária?
   */
  get hasSubstituicao(): boolean {
    return ['10', '30', '60', '70'].includes(this._props.tributacao);
  }

  /**
   * CST indica redução de base de cálculo?
   */
  get hasReducao(): boolean {
    return ['20', '70'].includes(this._props.tributacao);
  }

  /**
   * CST indica diferimento?
   */
  get isDiferido(): boolean {
    return this._props.tributacao === '51';
  }

  /**
   * CST indica tributação normal?
   */
  get isTributado(): boolean {
    return this._props.tributacao === '00';
  }

  /**
   * Descrição da tributação
   */
  get descricaoTributacao(): string {
    const descricoes: Record<string, string> = {
      '00': 'Tributada integralmente',
      '10': 'Tributada com ST',
      '20': 'Com redução de BC',
      '30': 'Isenta com ST',
      '40': 'Isenta',
      '41': 'Não tributada',
      '50': 'Suspensão',
      '51': 'Diferimento',
      '60': 'ICMS ST cobrado anteriormente',
      '70': 'Redução de BC com ST',
      '90': 'Outras',
    };
    return descricoes[this._props.tributacao] ?? 'Desconhecida';
  }

  /**
   * Descrição da origem
   */
  get descricaoOrigem(): string {
    const descricoes: Record<string, string> = {
      '0': 'Nacional',
      '1': 'Estrangeira - Importação direta',
      '2': 'Estrangeira - Mercado interno',
      '3': 'Nacional - CI 40%-70%',
      '4': 'Nacional - PPB',
      '5': 'Nacional - CI ≤ 40%',
      '6': 'Estrangeira - Importação direta sem similar',
      '7': 'Estrangeira - Mercado interno sem similar',
      '8': 'Nacional - CI > 70%',
    };
    return descricoes[this._props.origem] ?? 'Desconhecida';
  }

  /**
   * Factory method
   */
  static create(code: string): Result<CST, string> {
    // Remover formatação
    const cleanCode = code.replace(/\D/g, '');

    // Validar tamanho
    if (cleanCode.length !== 3) {
      return Result.fail(`CST must have 3 digits, got: ${code}`);
    }

    const origem = cleanCode[0];
    const tributacao = cleanCode.substring(1, 3);

    // Validar origem
    const origensValidas = ['0', '1', '2', '3', '4', '5', '6', '7', '8'];
    if (!origensValidas.includes(origem)) {
      return Result.fail(`Invalid CST origin: ${origem}. Must be 0-8.`);
    }

    // Validar tributação
    const tributacoesValidas = ['00', '10', '20', '30', '40', '41', '50', '51', '60', '70', '90'];
    if (!tributacoesValidas.includes(tributacao)) {
      return Result.fail(`Invalid CST taxation: ${tributacao}. Must be one of: ${tributacoesValidas.join(', ')}`);
    }

    return Result.ok(new CST({ origem, tributacao }));
  }

  /**
   * Verifica igualdade
   */
  equals(other: CST): boolean {
    return this.code === other.code;
  }
}

