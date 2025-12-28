/**
 * Interfaces tipadas para a estrutura interna do OFX
 * Baseado na especificação OFX para transações bancárias e de cartão de crédito
 */
export interface OFXTransactionRaw {
  TRNTYPE?: string;
  DTPOSTED?: string;
  TRNAMT?: string;
  FITID?: string;
  MEMO?: string;
  NAME?: string;
}

export interface OFXBankTransactionList {
  STMTTRN?: OFXTransactionRaw | OFXTransactionRaw[];
}

export interface OFXStatementResponse {
  BANKTRANLIST?: OFXBankTransactionList;
}

export interface OFXCreditCardStatementResponse {
  BANKTRANLIST?: OFXBankTransactionList;
}

export interface OFXStatementTransactionResponse {
  STMTRS?: OFXStatementResponse;
  CCSTMTRS?: OFXCreditCardStatementResponse;
}

export interface OFXBankMessageSetResponse {
  STMTTRNRS?: OFXStatementTransactionResponse | OFXStatementTransactionResponse[];
}

export interface OFXCreditCardMessageSetResponse {
  CCSTMTTRNRS?: OFXStatementTransactionResponse | OFXStatementTransactionResponse[];
}

export interface OFXData {
  BANKMSGSRSV1?: OFXBankMessageSetResponse;
  CREDITCARDMSGSRSV1?: OFXCreditCardMessageSetResponse;
}

export interface OFXResult {
  OFX?: OFXData;
}

/**
 * Declaração de tipos para o módulo ofx-js
 * 
 * ofx-js é uma biblioteca para parsing de arquivos OFX (Open Financial Exchange)
 * que não fornece tipos TypeScript oficiais.
 * 
 * Esta declaração fornece tipagem básica para as funções utilizadas no AuraCore.
 */
declare module "ofx-js" {
  /**
   * Faz o parsing de uma string contendo dados OFX
   * @param data - String contendo o conteúdo do arquivo OFX
   * @returns Promise que resolve para um objeto com a estrutura OFX parseada
   */
  export function parse(data: string): Promise<unknown>;
}

