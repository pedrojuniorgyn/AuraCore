/**
 * 🏦 CNAB 240 Generator - BTG Pactual
 * 
 * Gerador de arquivos CNAB 240 para remessa bancária
 * Foco: Pagamento de Títulos (Boletos) - Segmento J
 * 
 * Especificação: FEBRABAN CNAB 240
 */

import { format } from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

export interface BankAccountCNAB {
  bankCode: string; // Ex: "208" (BTG)
  bankName: string;
  agency: string;
  accountNumber: string;
  accountDigit: string;
  wallet: string;
  agreementNumber: string;
  remittanceNumber: number;
}

export interface CompanyInfo {
  document: string; // CNPJ (14 dígitos)
  name: string; // Razão Social
}

export interface PaymentTitle {
  id: number;
  partnerId: number;
  partnerDocument: string; // CPF/CNPJ do favorecido
  partnerName: string;
  amount: number;
  dueDate: Date;
  documentNumber: string;
  barCode?: string; // Código de barras do boleto (se houver)
}

export interface CNAB240Options {
  bankAccount: BankAccountCNAB;
  company: CompanyInfo;
  titles: PaymentTitle[];
  type: "PAYMENT" | "RECEIVABLE";
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formata string com tamanho fixo (preenche com espaços à direita)
 */
function formatAlpha(value: string, size: number): string {
  return value.substring(0, size).padEnd(size, " ");
}

/**
 * Formata número com tamanho fixo (preenche com zeros à esquerda)
 */
function formatNumeric(value: number | string, size: number): string {
  const str = value.toString().replace(/\D/g, "");
  return str.substring(0, size).padStart(size, "0");
}

/**
 * Formata valor monetário (sem vírgula, centavos)
 */
function formatMoney(value: number, size: number): string {
  const cents = Math.round(value * 100);
  return formatNumeric(cents, size);
}

/**
 * Formata data DDMMAAAA
 */
function formatDate(date: Date): string {
  return format(date, "ddMMyyyy");
}

/**
 * Formata data/hora DDMMAAAAHHMM
 */
function formatDateTime(date: Date): string {
  return format(date, "ddMMyyyyHHmm");
}

// ============================================================================
// CNAB 240 GENERATOR
// ============================================================================

export class CNAB240Generator {
  private bankAccount: BankAccountCNAB;
  private company: CompanyInfo;
  private titles: PaymentTitle[];
  private type: "PAYMENT" | "RECEIVABLE";
  private lines: string[] = [];
  private recordCount = 0;

  constructor(options: CNAB240Options) {
    this.bankAccount = options.bankAccount;
    this.company = options.company;
    this.titles = options.titles;
    this.type = options.type;
  }

  /**
   * Gera o arquivo CNAB 240 completo
   */
  generate(): string {
    this.lines = [];
    this.recordCount = 0;

    // Header do Arquivo
    this.generateFileHeader();

    // Lote de Pagamentos
    this.generateBatchHeader();
    this.generatePaymentSegments();
    this.generateBatchTrailer();

    // Trailer do Arquivo
    this.generateFileTrailer();

    return this.lines.join("\r\n");
  }

  /**
   * HEADER DO ARQUIVO (Registro 0)
   */
  private generateFileHeader(): void {
    let line = "";

    line += formatNumeric(this.bankAccount.bankCode, 3); // 1-3: Código do Banco
    line += "0000"; // 4-7: Lote de Serviço (0000 para header)
    line += "0"; // 8: Tipo de Registro (0 = Header de Arquivo)
    line += formatAlpha("", 9); // 9-17: Uso Exclusivo FEBRABAN
    line += "2"; // 18: Tipo de Inscrição (2 = CNPJ)
    line += formatNumeric(this.company.document, 14); // 19-32: CNPJ
    line += formatAlpha(this.bankAccount.agreementNumber || "", 20); // 33-52: Convênio
    line += formatNumeric(this.bankAccount.agency, 5); // 53-57: Agência
    line += formatAlpha("", 1); // 58: DV Agência
    line += formatNumeric(this.bankAccount.accountNumber, 12); // 59-70: Conta
    line += formatAlpha(this.bankAccount.accountDigit, 1); // 71: DV Conta
    line += formatAlpha("", 1); // 72: DV Ag/Conta
    line += formatAlpha(this.company.name, 30); // 73-102: Nome da Empresa
    line += formatAlpha(this.bankAccount.bankName, 30); // 103-132: Nome do Banco
    line += formatAlpha("", 10); // 133-142: Uso Exclusivo FEBRABAN
    line += "1"; // 143: Código de Remessa (1 = Remessa)
    line += formatDate(new Date()); // 144-151: Data de Geração
    line += format(new Date(), "HHmmss"); // 152-157: Hora de Geração
    line += formatNumeric(this.bankAccount.remittanceNumber, 6); // 158-163: NSA (Número Sequencial do Arquivo)
    line += "103"; // 164-166: Versão do Layout (103 = CNAB 240 v10.3)
    line += formatNumeric(0, 5); // 167-171: Densidade de Gravação
    line += formatAlpha("", 20); // 172-191: Reservado Banco
    line += formatAlpha("", 20); // 192-211: Reservado Empresa
    line += formatAlpha("", 29); // 212-240: Uso Exclusivo FEBRABAN

    this.lines.push(line);
    this.recordCount++;
  }

  /**
   * HEADER DO LOTE (Registro 1)
   */
  private generateBatchHeader(): void {
    let line = "";

    line += formatNumeric(this.bankAccount.bankCode, 3); // 1-3: Código do Banco
    line += "0001"; // 4-7: Lote de Serviço
    line += "1"; // 8: Tipo de Registro (1 = Header de Lote)
    line += "C"; // 9: Tipo de Operação (C = Lançamento a Crédito)
    line += "20"; // 10-11: Tipo de Serviço (20 = Pagamento Fornecedor)
    line += "01"; // 12-13: Forma de Lançamento (01 = Crédito em Conta Corrente)
    line += "045"; // 14-16: Versão do Layout do Lote
    line += formatAlpha("", 1); // 17: Uso Exclusivo FEBRABAN
    line += "2"; // 18: Tipo de Inscrição (2 = CNPJ)
    line += formatNumeric(this.company.document, 14); // 19-32: CNPJ
    line += formatAlpha(this.bankAccount.agreementNumber || "", 20); // 33-52: Convênio
    line += formatNumeric(this.bankAccount.agency, 5); // 53-57: Agência
    line += formatAlpha("", 1); // 58: DV Agência
    line += formatNumeric(this.bankAccount.accountNumber, 12); // 59-70: Conta
    line += formatAlpha(this.bankAccount.accountDigit, 1); // 71: DV Conta
    line += formatAlpha("", 1); // 72: DV Ag/Conta
    line += formatAlpha(this.company.name, 30); // 73-102: Nome da Empresa
    line += formatAlpha("", 40); // 103-142: Mensagem 1
    line += formatAlpha("", 40); // 143-182: Mensagem 2
    line += formatNumeric(this.bankAccount.remittanceNumber, 8); // 183-190: Número da Remessa
    line += formatDate(new Date()); // 191-198: Data de Gravação
    line += formatNumeric(0, 8); // 199-206: Data do Crédito (0 = crédito imediato)
    line += formatAlpha("", 33); // 207-239: Uso Exclusivo FEBRABAN
    line += " "; // 240: Uso Exclusivo FEBRABAN

    this.lines.push(line);
    this.recordCount++;
  }

  /**
   * SEGMENTOS DE PAGAMENTO (A e J)
   */
  private generatePaymentSegments(): void {
    let sequencial = 1;

    for (const title of this.titles) {
      // Segmento A (Dados do Pagamento)
      this.generateSegmentA(title, sequencial);
      sequencial++;

      // Segmento J (Dados do Boleto - se houver código de barras)
      if (title.barCode) {
        this.generateSegmentJ(title, sequencial);
        sequencial++;
      }
    }
  }

  /**
   * SEGMENTO A - Dados do Pagamento
   */
  private generateSegmentA(title: PaymentTitle, sequencial: number): void {
    let line = "";

    line += formatNumeric(this.bankAccount.bankCode, 3); // 1-3: Código do Banco
    line += "0001"; // 4-7: Lote de Serviço
    line += "3"; // 8: Tipo de Registro (3 = Detalhe)
    line += formatNumeric(sequencial, 5); // 9-13: Nº Sequencial do Registro
    line += "A"; // 14: Código do Segmento
    line += "0"; // 15: Tipo de Movimento (0 = Inclusão)
    line += "00"; // 16-17: Código de Instrução para Movimento
    line += "000"; // 18-20: Câmara de Compensação (000 = TED/DOC)
    line += formatNumeric(this.bankAccount.bankCode, 3); // 21-23: Banco Favorecido
    line += formatNumeric("", 5); // 24-28: Agência Favorecido (se houver)
    line += formatAlpha("", 1); // 29: DV Agência
    line += formatNumeric("", 12); // 30-41: Conta Favorecido
    line += formatAlpha("", 1); // 42: DV Conta
    line += formatAlpha("", 1); // 43: DV Ag/Conta
    line += formatAlpha(title.partnerName, 30); // 44-73: Nome do Favorecido
    line += formatAlpha(title.documentNumber, 20); // 74-93: Nº do Documento (Nosso número)
    line += formatDate(new Date()); // 94-101: Data do Pagamento
    line += "REL"; // 102-104: Tipo de Moeda (REL = Real)
    line += formatNumeric(0, 15); // 105-119: Quantidade de Moeda (0 quando REL)
    line += formatMoney(title.amount, 15); // 120-134: Valor do Pagamento
    line += formatAlpha("", 20); // 135-154: Nº do Documento Atribuído pela Empresa
    line += formatDate(new Date()); // 155-162: Data Real da Efetivação do Pagamento
    line += formatMoney(0, 15); // 163-177: Valor Real da Efetivação do Pagamento
    line += formatAlpha("", 40); // 178-217: Informações Complementares
    line += formatAlpha("", 6); // 218-223: Complemento de Registro (CNABível)
    line += "1"; // 224: Tipo de Inscrição do Favorecido (1=CPF, 2=CNPJ)
    line += formatNumeric(title.partnerDocument, 14); // 225-238: CPF/CNPJ Favorecido
    line += formatAlpha("", 2); // 239-240: Uso Exclusivo FEBRABAN

    this.lines.push(line);
    this.recordCount++;
  }

  /**
   * SEGMENTO J - Boleto (Código de Barras)
   */
  private generateSegmentJ(title: PaymentTitle, sequencial: number): void {
    let line = "";

    line += formatNumeric(this.bankAccount.bankCode, 3); // 1-3: Código do Banco
    line += "0001"; // 4-7: Lote de Serviço
    line += "3"; // 8: Tipo de Registro (3 = Detalhe)
    line += formatNumeric(sequencial, 5); // 9-13: Nº Sequencial
    line += "J"; // 14: Código do Segmento
    line += formatAlpha("", 1); // 15: Uso Exclusivo FEBRABAN
    line += "00"; // 16-17: Código de Movimento
    line += formatAlpha(title.barCode || "", 44); // 18-61: Código de Barras
    line += formatAlpha(title.partnerName, 30); // 62-91: Nome do Favorecido
    line += formatDate(title.dueDate); // 92-99: Data de Vencimento
    line += formatMoney(title.amount, 15); // 100-114: Valor do Título
    line += formatMoney(0, 15); // 115-129: Desconto + Abatimento
    line += formatMoney(0, 15); // 130-144: Mora + Multa
    line += formatDate(new Date()); // 145-152: Data do Pagamento
    line += formatMoney(title.amount, 15); // 153-167: Valor do Pagamento
    line += formatNumeric(0, 15); // 168-182: Quantidade de Moeda
    line += formatAlpha("", 20); // 183-202: Referência do Sacado (Nº Documento)
    line += formatNumeric(0, 4); // 203-206: Nosso Número
    line += formatAlpha("", 10); // 207-216: Código da Moeda (BRL)
    line += formatAlpha("", 10); // 217-226: Uso Exclusivo FEBRABAN
    line += formatAlpha("", 14); // 227-240: Uso Exclusivo FEBRABAN

    this.lines.push(line);
    this.recordCount++;
  }

  /**
   * TRAILER DO LOTE (Registro 5)
   */
  private generateBatchTrailer(): void {
    let line = "";

    const totalAmount = this.titles.reduce((sum, t) => sum + t.amount, 0);
    const qtdRecords = this.titles.length * 2 + 2; // Segmentos A+J + Header + Trailer

    line += formatNumeric(this.bankAccount.bankCode, 3); // 1-3: Código do Banco
    line += "0001"; // 4-7: Lote de Serviço
    line += "5"; // 8: Tipo de Registro (5 = Trailer de Lote)
    line += formatAlpha("", 9); // 9-17: Uso Exclusivo FEBRABAN
    line += formatNumeric(qtdRecords, 6); // 18-23: Quantidade de Registros do Lote
    line += formatNumeric(this.titles.length, 6); // 24-29: Quantidade de Títulos
    line += formatMoney(totalAmount, 17); // 30-46: Valor Total dos Títulos
    line += formatNumeric(0, 6); // 47-52: Quantidade de Moeda
    line += formatNumeric(0, 17); // 53-69: Valor Total Moeda
    line += formatAlpha("", 46); // 70-115: Número do Aviso de Débito
    line += formatAlpha("", 125); // 116-240: Uso Exclusivo FEBRABAN

    this.lines.push(line);
    this.recordCount++;
  }

  /**
   * TRAILER DO ARQUIVO (Registro 9)
   */
  private generateFileTrailer(): void {
    let line = "";

    line += formatNumeric(this.bankAccount.bankCode, 3); // 1-3: Código do Banco
    line += "9999"; // 4-7: Lote de Serviço (9999 para trailer)
    line += "9"; // 8: Tipo de Registro (9 = Trailer de Arquivo)
    line += formatAlpha("", 9); // 9-17: Uso Exclusivo FEBRABAN
    line += "000001"; // 18-23: Quantidade de Lotes
    line += formatNumeric(this.recordCount + 1, 6); // 24-29: Quantidade de Registros (incluindo este)
    line += formatNumeric(0, 6); // 30-35: Quantidade de Contas p/ Conc. (Lotes)
    line += formatAlpha("", 205); // 36-240: Uso Exclusivo FEBRABAN

    this.lines.push(line);
  }
}

/**
 * Função Helper para gerar CNAB 240
 */
export function generateCNAB240(options: CNAB240Options): string {
  const generator = new CNAB240Generator(options);
  return generator.generate();
}




























