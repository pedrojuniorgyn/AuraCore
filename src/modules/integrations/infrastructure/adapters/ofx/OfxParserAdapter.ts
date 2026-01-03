/**
 * OfxParserAdapter - Parser de arquivos OFX
 * E7.9 Integrações - Semana 2 (TODO)
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IBankStatementParser } from '../../../domain/ports/output/IBankStatementParser';
import { Money } from '@/shared/domain/value-objects/Money';

@injectable()
export class OfxParserAdapter implements IBankStatementParser {
  async parseOFX(content: string): Promise<Result<{ accountNumber: string; bankCode: string; startDate: Date; endDate: Date; openingBalance: Money; closingBalance: Money; transactions: Array<{ id: string; date: Date; amount: Money; type: 'CREDIT' | 'DEBIT'; description: string; balance?: Money; fitId?: string; checkNumber?: string; memo?: string }> }, string>> {
    return Result.fail('OFX parser not implemented yet - Semana 2');
  }

  async parseCSV(content: string, bankCode: string): Promise<Result<{ accountNumber: string; bankCode: string; startDate: Date; endDate: Date; openingBalance: Money; closingBalance: Money; transactions: Array<{ id: string; date: Date; amount: Money; type: 'CREDIT' | 'DEBIT'; description: string; balance?: Money; fitId?: string; checkNumber?: string; memo?: string }> }, string>> {
    return Result.fail('CSV parser not implemented yet - Semana 2');
  }
}

