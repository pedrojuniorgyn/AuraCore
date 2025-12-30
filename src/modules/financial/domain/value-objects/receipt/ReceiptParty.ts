import { Result } from '@/shared/domain';

/**
 * Tipo de documento
 */
export type DocumentType = 'CPF' | 'CNPJ';

/**
 * Tipos de documento válidos
 */
const VALID_TIPO_DOCUMENTO = ['CPF', 'CNPJ'] as const;

/**
 * Verifica se um valor é um tipo de documento válido
 */
function isValidTipoDocumento(tipo: string): tipo is DocumentType {
  return VALID_TIPO_DOCUMENTO.includes(tipo as DocumentType);
}

/**
 * Endereço
 */
export interface Address {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

/**
 * Props do ReceiptParty
 */
export interface ReceiptPartyProps {
  nome: string;
  documento: string;
  tipoDocumento: DocumentType;
  endereco?: Address;
}

/**
 * Value Object: Parte do Recibo (Pagador ou Recebedor)
 * 
 * Representa uma pessoa física ou jurídica envolvida no recibo.
 * 
 * Validações:
 * - CPF: 11 dígitos
 * - CNPJ: 14 dígitos
 * - Nome obrigatório
 */
export class ReceiptParty {
  private constructor(private readonly _props: ReceiptPartyProps) {}

  get nome(): string {
    return this._props.nome;
  }

  get documento(): string {
    return this._props.documento;
  }

  get tipoDocumento(): DocumentType {
    return this._props.tipoDocumento;
  }

  get endereco(): Address | undefined {
    return this._props.endereco;
  }

  /**
   * Factory method
   */
  static create(props: ReceiptPartyProps): Result<ReceiptParty, string> {
    // Validar nome
    if (!props.nome || props.nome.trim().length === 0) {
      return Result.fail('Nome is required');
    }

    if (props.nome.trim().length < 3) {
      return Result.fail('Nome must be at least 3 characters');
    }

    // Validar documento
    const cleanDoc = props.documento.replace(/\D/g, '');
    
    if (props.tipoDocumento === 'CPF') {
      if (cleanDoc.length !== 11) {
        return Result.fail('CPF must have 11 digits');
      }
    } else if (props.tipoDocumento === 'CNPJ') {
      if (cleanDoc.length !== 14) {
        return Result.fail('CNPJ must have 14 digits');
      }
    } else {
      return Result.fail('Invalid document type');
    }

    // Validar endereço se presente
    if (props.endereco) {
      if (!props.endereco.logradouro || props.endereco.logradouro.trim().length === 0) {
        return Result.fail('Endereco logradouro is required when endereco is provided');
      }
      if (!props.endereco.cidade || props.endereco.cidade.trim().length === 0) {
        return Result.fail('Endereco cidade is required when endereco is provided');
      }
      if (!props.endereco.estado || props.endereco.estado.trim().length === 0) {
        return Result.fail('Endereco estado is required when endereco is provided');
      }
    }

    return Result.ok(new ReceiptParty({
      nome: props.nome.trim(),
      documento: cleanDoc,
      tipoDocumento: props.tipoDocumento,
      endereco: props.endereco,
    }));
  }

  /**
   * Reconstitui do banco
   */
  static reconstitute(props: ReceiptPartyProps): Result<ReceiptParty, string> {
    // Validar tipoDocumento (ENFORCE-015)
    if (!isValidTipoDocumento(props.tipoDocumento)) {
      return Result.fail(`Invalid tipo documento: ${props.tipoDocumento}. Must be CPF or CNPJ`);
    }
    
    return Result.ok(new ReceiptParty(props));
  }

  /**
   * Formata documento para exibição
   */
  formatDocumento(): string {
    if (this._props.tipoDocumento === 'CPF') {
      // XXX.XXX.XXX-XX
      return this._props.documento.replace(
        /(\d{3})(\d{3})(\d{3})(\d{2})/,
        '$1.$2.$3-$4'
      );
    } else {
      // XX.XXX.XXX/XXXX-XX
      return this._props.documento.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        '$1.$2.$3/$4-$5'
      );
    }
  }

  /**
   * Formata endereço completo
   */
  formatEndereco(): string | undefined {
    if (!this._props.endereco) {
      return undefined;
    }

    const parts = [
      `${this._props.endereco.logradouro}, ${this._props.endereco.numero}`,
      this._props.endereco.complemento,
      this._props.endereco.bairro,
      `${this._props.endereco.cidade}/${this._props.endereco.estado}`,
      this._props.endereco.cep,
    ].filter(Boolean);

    return parts.join(' - ');
  }

  /**
   * Igualdade
   */
  equals(other: ReceiptParty): boolean {
    if (!other) {
      return false;
    }

    return (
      this._props.documento === other._props.documento &&
      this._props.tipoDocumento === other._props.tipoDocumento
    );
  }
}

