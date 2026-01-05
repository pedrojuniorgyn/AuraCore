/**
 * 📄 SPED REGISTER - VALUE OBJECT
 * 
 * Representa um registro (linha) no arquivo SPED
 * Formato: |REG|CAMPO1|CAMPO2|...|
 * 
 * Épico: E7.13 - Migration to DDD
 */

import { Result } from "@/shared/domain";

export interface SpedRegisterProps {
  registerCode: string;  // Ex: "0000", "C100", "E110"
  fields: (string | number | null)[];  // Campos do registro
}

export class SpedRegister {
  private constructor(private readonly props: SpedRegisterProps) {}

  static create(props: SpedRegisterProps): Result<SpedRegister, string> {
    // Validar código do registro
    if (!props.registerCode || props.registerCode.length === 0) {
      return Result.fail('Código do registro não pode ser vazio');
    }

    // Validar que tem pelo menos 1 campo
    if (!props.fields || props.fields.length === 0) {
      return Result.fail('Registro deve ter ao menos 1 campo');
    }

    return Result.ok(new SpedRegister(props));
  }

  /**
   * Formata o registro como string pipe-delimited
   * Formato: |REG|CAMPO1|CAMPO2|...|
   */
  toString(): string {
    const fields = this.props.fields.map((field) => {
      if (field === null || field === undefined) {
        return '';
      }
      return String(field);
    });

    return `|${this.props.registerCode}|${fields.join('|')}|`;
  }

  get code(): string {
    return this.props.registerCode;
  }

  get fieldCount(): number {
    return this.props.fields.length;
  }
}

