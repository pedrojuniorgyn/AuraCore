/**
 * 📄 SPED DOCUMENT - VALUE OBJECT
 * 
 * Representa um arquivo SPED completo
 * Contém múltiplos blocos ordenados
 * 
 * Épico: E7.13 - Migration to DDD
 */

import { Result } from "@/shared/domain";
import { SpedBlock } from "./SpedBlock";

export type SpedDocumentType = 
  | 'EFD_ICMS_IPI'          // SPED Fiscal
  | 'ECD'                    // Escrituração Contábil Digital
  | 'EFD_CONTRIBUICOES';     // SPED Contribuições

export interface SpedDocumentProps {
  documentType: SpedDocumentType;
  blocks: SpedBlock[];
}

export class SpedDocument {
  private constructor(private readonly props: SpedDocumentProps) {}

  static create(props: SpedDocumentProps): Result<SpedDocument, string> {
    // Validar que tem pelo menos 2 blocos (0 e 9 são obrigatórios)
    if (!props.blocks || props.blocks.length < 2) {
      return Result.fail('Documento SPED deve ter ao menos 2 blocos (0 e 9)');
    }

    // Validar que o primeiro bloco é o bloco 0
    if (props.blocks[0].blockId !== '0') {
      return Result.fail(`Documento SPED deve iniciar com Bloco 0, encontrado ${props.blocks[0].blockId}`);
    }

    // Validar que o último bloco é o bloco 9
    const lastBlock = props.blocks[props.blocks.length - 1];
    if (lastBlock.blockId !== '9') {
      return Result.fail(`Documento SPED deve terminar com Bloco 9, encontrado ${lastBlock.blockId}`);
    }

    return Result.ok(new SpedDocument(props));
  }

  /**
   * Gera o conteúdo completo do arquivo SPED
   * Retorna string com todas as linhas separadas por \n
   */
  toFileContent(): string {
    const allLines: string[] = [];

    for (const block of this.props.blocks) {
      allLines.push(...block.toLines());
    }

    return allLines.join('\n');
  }

  /**
   * Gera o arquivo como Buffer (encoding ISO-8859-1)
   * SPED requer encoding ISO-8859-1, não UTF-8!
   */
  toBuffer(): Buffer {
    const content = this.toFileContent();
    return Buffer.from(content, 'latin1'); // ISO-8859-1 = latin1
  }

  get documentType(): SpedDocumentType {
    return this.props.documentType;
  }

  get blockCount(): number {
    return this.props.blocks.length;
  }

  get totalLines(): number {
    return this.props.blocks.reduce((sum, block) => sum + block.registerCount, 0);
  }
}

