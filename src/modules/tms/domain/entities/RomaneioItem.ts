import { Result } from '@/shared/domain';
import { EspecieEmbalagem, isValidEspecieEmbalagem } from '../value-objects/EspecieEmbalagem';

/**
 * Props do Item de Romaneio
 */
export interface RomaneioItemProps {
  id: string;
  romaneioId: string;
  
  sequencia: number;
  marcacaoVolume: string;
  especieEmbalagem: EspecieEmbalagem;
  quantidade: number;
  
  // Pesos em kg
  pesoLiquido: number;    // decimal 10,3
  pesoBruto: number;      // decimal 10,3
  
  // Dimensões em metros
  altura: number;         // decimal 10,3
  largura: number;        // decimal 10,3
  comprimento: number;    // decimal 10,3
  
  // Cubagem em m³ (calculada automaticamente)
  cubagem: number;        // decimal 10,6
  
  // Produto
  descricaoProduto: string;
  codigoProduto?: string;
  
  // Observações
  observacoes?: string;
}

/**
 * Entity: Item de Romaneio de Carga
 * 
 * Representa um item/volume individual discriminado no romaneio.
 * Cada item contém informações físicas (peso, dimensões, embalagem)
 * e descrição da mercadoria transportada.
 */
export class RomaneioItem {
  private constructor(private readonly _props: RomaneioItemProps) {}

  // Getters
  get id(): string {
    return this._props.id;
  }

  get romaneioId(): string {
    return this._props.romaneioId;
  }

  get sequencia(): number {
    return this._props.sequencia;
  }

  get marcacaoVolume(): string {
    return this._props.marcacaoVolume;
  }

  get especieEmbalagem(): EspecieEmbalagem {
    return this._props.especieEmbalagem;
  }

  get quantidade(): number {
    return this._props.quantidade;
  }

  get pesoLiquido(): number {
    return this._props.pesoLiquido;
  }

  get pesoBruto(): number {
    return this._props.pesoBruto;
  }

  get altura(): number {
    return this._props.altura;
  }

  get largura(): number {
    return this._props.largura;
  }

  get comprimento(): number {
    return this._props.comprimento;
  }

  get cubagem(): number {
    return this._props.cubagem;
  }

  get descricaoProduto(): string {
    return this._props.descricaoProduto;
  }

  get codigoProduto(): string | undefined {
    return this._props.codigoProduto;
  }

  get observacoes(): string | undefined {
    return this._props.observacoes;
  }

  /**
   * Cria um novo item de romaneio
   * Calcula cubagem automaticamente
   */
  static create(props: Omit<RomaneioItemProps, 'cubagem'>): Result<RomaneioItem, string> {
    // Validações de IDs
    if (!props.id || props.id.trim() === '') {
      return Result.fail('Item ID is required');
    }

    if (!props.romaneioId || props.romaneioId.trim() === '') {
      return Result.fail('Romaneio ID is required');
    }

    // Validações de campos
    if (!props.marcacaoVolume || props.marcacaoVolume.trim() === '') {
      return Result.fail('Marcação de volume is required');
    }

    if (!isValidEspecieEmbalagem(props.especieEmbalagem)) {
      return Result.fail(`Invalid especie embalagem: ${props.especieEmbalagem}`);
    }

    if (props.quantidade <= 0) {
      return Result.fail('Quantidade must be greater than 0');
    }

    if (props.pesoLiquido < 0) {
      return Result.fail('Peso líquido cannot be negative');
    }

    if (props.pesoBruto < 0) {
      return Result.fail('Peso bruto cannot be negative');
    }

    if (props.pesoBruto < props.pesoLiquido) {
      return Result.fail('Peso bruto must be greater than or equal to peso líquido');
    }

    if (props.altura <= 0) {
      return Result.fail('Altura must be greater than 0');
    }

    if (props.largura <= 0) {
      return Result.fail('Largura must be greater than 0');
    }

    if (props.comprimento <= 0) {
      return Result.fail('Comprimento must be greater than 0');
    }

    if (!props.descricaoProduto || props.descricaoProduto.trim() === '') {
      return Result.fail('Descrição do produto is required');
    }

    // Calcular cubagem automaticamente
    const cubagem = props.altura * props.largura * props.comprimento;

    const item = new RomaneioItem({
      ...props,
      cubagem,
    });

    return Result.ok(item);
  }

  /**
   * Reconstitui item do banco de dados
   * Usado pelo Mapper
   */
  static reconstitute(props: RomaneioItemProps): Result<RomaneioItem, string> {
    // Validações mínimas na reconstituição
    if (!props.id || props.id.trim() === '') {
      return Result.fail('RomaneioItem id is required for reconstitution');
    }

    if (!props.romaneioId || props.romaneioId.trim() === '') {
      return Result.fail('RomaneioItem romaneioId is required for reconstitution');
    }

    // Validar especieEmbalagem
    if (!isValidEspecieEmbalagem(props.especieEmbalagem)) {
      return Result.fail(`Invalid especieEmbalagem: ${props.especieEmbalagem}`);
    }

    const item = new RomaneioItem(props);
    return Result.ok(item);
  }

  /**
   * Recalcula cubagem com base nas dimensões atuais
   */
  recalcularCubagem(): void {
    this._props.cubagem = this._props.altura * this._props.largura * this._props.comprimento;
  }
}

