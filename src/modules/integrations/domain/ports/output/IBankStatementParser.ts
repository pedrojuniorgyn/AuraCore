/**
 * IBankStatementParser - Port para parsing de extratos bancários
 * 
 * E7.9 Integrações - Semana 1
 * 
 * Abstrai parsing de diferentes formatos:
 * - OFX (Open Financial Exchange)
 * - CSV (bancos específicos)
 * - PDF (futuro, com OCR)
 * 
 * Princípios Hexagonais:
 * - Domain NÃO conhece detalhes de formato de arquivo
 * - Implementations: OfxParserAdapter (real), MockBankStatementParser (teste)
 */

import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';

export interface BankTransaction {
  id: string;
  date: Date;
  amount: Money;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  balance?: Money;
  fitId?: string;  // ID único do banco
  checkNumber?: string;
  memo?: string;
}

export interface BankStatement {
  accountNumber: string;
  bankCode: string;
  startDate: Date;
  endDate: Date;
  openingBalance: Money;
  closingBalance: Money;
  transactions: BankTransaction[];
}

/**
 * IBankStatementParser - Port para parsing de extratos
 * 
 * IMPORTANTE: Todas as operações retornam Result<T> ou Result<T, string>
 * NUNCA Result<T, Error> (regra MCP ENFORCE-012)
 */
export interface IBankStatementParser {
  parseOFX(content: string): Promise<Result<BankStatement, string>>;
  parseCSV(content: string, bankCode: string): Promise<Result<BankStatement, string>>;
}

