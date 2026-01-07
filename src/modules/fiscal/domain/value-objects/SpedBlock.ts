/**
 * 📄 SPED BLOCK - VALUE OBJECT
 * 
 * Representa um bloco no arquivo SPED (ex: Bloco 0, Bloco C, etc.)
 * Cada bloco contém múltiplos registros
 * 
 * Épico: E7.13 - Migration to DDD
 */

import { Result } from "@/shared/domain";
import { SpedRegister } from "./SpedRegister";

export interface SpedBlockProps {
  blockId: string;  // Ex: "0", "C", "D", "E", "H", "9"
  registers: SpedRegister[];
}

export class SpedBlock {
  private constructor(private readonly props: SpedBlockProps) {}

  static create(props: SpedBlockProps): Result<SpedBlock, string> {
    // Validar block ID
    if (!props.blockId || props.blockId.length === 0) {
      return Result.fail('Block ID não pode ser vazio');
    }

    // Validar que tem pelo menos 2 registros (abertura + fechamento)
    if (!props.registers || props.registers.length < 2) {
      return Result.fail(`Bloco ${props.blockId} deve ter ao menos 2 registros (abertura e fechamento)`);
    }

    // Validar formato dos registros de abertura e fechamento
    const firstRegisterCode = props.registers[0].code;
    const lastRegisterCode = props.registers[props.registers.length - 1].code;

    if (firstRegisterCode !== `${props.blockId}001`) {
      return Result.fail(
        `Bloco ${props.blockId} deve iniciar com registro ${props.blockId}001, encontrado ${firstRegisterCode}`
      );
    }

    // Validar registro de fechamento
    // EXCEÇÃO: Bloco 9 termina com 9999 (encerramento do arquivo SPED)
    const expectedLastCode = props.blockId === '9' ? '9999' : `${props.blockId}990`;
    if (lastRegisterCode !== expectedLastCode) {
      return Result.fail(
        `Bloco ${props.blockId} deve terminar com registro ${expectedLastCode}, encontrado ${lastRegisterCode}`
      );
    }

    return Result.ok(new SpedBlock(props));
  }

  /**
   * Retorna todas as linhas do bloco como string[]
   */
  toLines(): string[] {
    return this.props.registers.map((register) => register.toString());
  }

  get blockId(): string {
    return this.props.blockId;
  }

  get registerCount(): number {
    return this.props.registers.length;
  }
}

