/**
 * Input Port: Importação de NFe via XML
 *
 * Define contrato para importação de documentos NFe a partir de XML.
 * Suporta múltiplas origens: upload manual, download automático da SEFAZ,
 * ou processamento de e-mails com XML anexo.
 *
 * O XML é parseado para extrair dados essenciais: chave de acesso,
 * número, emitente e valor total.
 *
 * @module fiscal/domain/ports/input
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 * @see Layout NFe: Manual de Orientação do Contribuinte (MOC)
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';

export interface ImportNfeXmlInput {
  /** Conteúdo XML completo da NFe */
  xmlContent: string;
  /** Origem da importação */
  source: 'MANUAL' | 'SEFAZ' | 'EMAIL';
}

export interface ImportNfeXmlOutput {
  /** ID do documento fiscal criado */
  documentId: string;
  /** Chave de acesso da NFe (44 dígitos) */
  fiscalKey: string;
  /** Número do documento */
  documentNumber: string;
  /** Nome/Razão social do emitente */
  senderName: string;
  /** Valor total da NFe */
  totalValue: number;
  /** Data/hora da importação */
  importedAt: Date;
}

export interface IImportNfeXmlUseCase {
  execute(input: ImportNfeXmlInput, context: ExecutionContext): Promise<Result<ImportNfeXmlOutput, string>>;
}
