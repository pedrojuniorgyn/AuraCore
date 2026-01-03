import { injectable } from 'tsyringe';
import { parse as parseOFX } from 'ofx-parser';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';
import type {
  IBankStatementParser,
  BankTransaction,
  BankStatement,
} from '../../../domain/ports/output/IBankStatementParser';

/**
 * OfxParserAdapter - Parser de extratos bancários OFX e CSV
 * 
 * E7.9 Integrações - Semana 2
 * 
 * Usa biblioteca ofx-parser para processar arquivos OFX.
 * CSV é processado manualmente considerando formato específico de cada banco.
 */
@injectable()
export class OfxParserAdapter implements IBankStatementParser {
  async parseOFX(content: string): Promise<Result<BankStatement, string>> {
    try {
      // Processar OFX (parseOFX retorna Promise)
      const parsed = await parseOFX(content);

      if (!parsed || !parsed.OFX) {
        return Result.fail('OFX_INVALID_FORMAT: Could not parse OFX content');
      }

      // Extrair conta bancária
      const bankAccounts = parsed.OFX.BANKMSGSRSV1?.STMTTRNRS;
      if (!bankAccounts || bankAccounts.length === 0) {
        return Result.fail('OFX_NO_ACCOUNT: No bank account found in OFX file');
      }

      const account = bankAccounts[0];
      const statement = account.STMTRS;
      const accountInfo = statement.BANKACCTFROM;

      // Extrair transações
      const transactions: BankTransaction[] = [];
      const txList = statement.BANKTRANLIST?.STMTTRN || [];

      for (const tx of txList) {
        const amountValue = parseFloat(tx.TRNAMT || '0');
        const amountResult = Money.create(Math.abs(amountValue), 'BRL');
        
        if (!Result.isOk(amountResult)) {
          continue; // Pular transação com valor inválido
        }

        // Balance (opcional)
        let balanceMoney = undefined;
        if (statement.LEDGERBAL?.BALAMT) {
          const balanceResult = Money.create(parseFloat(statement.LEDGERBAL.BALAMT), 'BRL');
          if (Result.isOk(balanceResult)) {
            balanceMoney = balanceResult.value;
          }
        }

        transactions.push({
          id: tx.FITID || `TX-${Date.now()}-${Math.random()}`,
          date: this.parseOFXDate(tx.DTPOSTED),
          amount: amountResult.value,
          type: amountValue >= 0 ? 'CREDIT' : 'DEBIT',
          description: tx.MEMO || tx.NAME || 'Unknown transaction',
          balance: balanceMoney,
          fitId: tx.FITID,
          checkNumber: tx.CHECKNUM,
          memo: tx.MEMO,
        });
      }

      // Montar statement completo
      const openingBalanceResult = Money.create(
        parseFloat(statement.LEDGERBAL?.BALAMT || '0'),
        'BRL'
      );
      const closingBalanceResult = Money.create(
        parseFloat(statement.AVAILBAL?.BALAMT || statement.LEDGERBAL?.BALAMT || '0'),
        'BRL'
      );

      if (!Result.isOk(openingBalanceResult) || !Result.isOk(closingBalanceResult)) {
        return Result.fail('OFX_INVALID_BALANCE: Could not parse account balance');
      }

      const bankStatement: BankStatement = {
        accountNumber: accountInfo.ACCTID || 'UNKNOWN',
        bankCode: accountInfo.BANKID || 'UNKNOWN',
        startDate: this.parseOFXDate(statement.BANKTRANLIST?.DTSTART),
        endDate: this.parseOFXDate(statement.BANKTRANLIST?.DTEND),
        openingBalance: openingBalanceResult.value,
        closingBalance: closingBalanceResult.value,
        transactions,
      };

      return Result.ok(bankStatement);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`OFX_PARSE_ERROR: ${message}`);
    }
  }

  async parseCSV(content: string): Promise<Result<BankStatement, string>> {
    try {
      const trimmedContent = content.trim();
      
      if (!trimmedContent || trimmedContent.length === 0) {
        return Result.fail('CSV_EMPTY: CSV file is empty');
      }

      const lines = trimmedContent.split('\n');
      
      if (lines.length === 0) {
        return Result.fail('CSV_EMPTY: CSV file is empty');
      }

      // Assumir primeira linha é header
      const header = lines[0].split(',').map(h => h.trim());
      const transactions: BankTransaction[] = [];

      // Processar linhas de dados (skip header)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = this.parseCSVLine(line);

        // Mapear colunas (assumir ordem: Data, Descrição, Valor, Saldo)
        // NOTA: Formato CSV varia por banco - pode precisar customização
        const dateStr = columns[0] || '';
        const description = columns[1] || 'Unknown';
        const amountStr = columns[2] || '0';
        const balanceStr = columns[3] || '0';

        // Parse amount
        const amountValue = this.parseMoneyString(amountStr);
        const amountResult = Money.create(Math.abs(amountValue), 'BRL');
        
        if (!Result.isOk(amountResult)) {
          continue; // Pular linha inválida
        }

        // Parse balance (opcional)
        let balanceMoney = undefined;
        if (balanceStr) {
          const balanceValue = this.parseMoneyString(balanceStr);
          const balanceResult = Money.create(Math.abs(balanceValue), 'BRL');
          if (Result.isOk(balanceResult)) {
            balanceMoney = balanceResult.value;
          }
        }

        transactions.push({
          id: `CSV-${i}`,
          date: this.parseCSVDate(dateStr),
          amount: amountResult.value,
          type: amountValue >= 0 ? 'CREDIT' : 'DEBIT',
          description,
          balance: balanceMoney,
        });
      }

      // Calcular balances do statement
      const firstBalance = transactions[0]?.balance;
      const lastBalance = transactions[transactions.length - 1]?.balance;

      const openingBalanceResult = firstBalance 
        ? Result.ok(firstBalance) 
        : Money.create(0, 'BRL');
      const closingBalanceResult = lastBalance 
        ? Result.ok(lastBalance) 
        : Money.create(0, 'BRL');

      if (!Result.isOk(openingBalanceResult) || !Result.isOk(closingBalanceResult)) {
        return Result.fail('CSV_INVALID_BALANCE');
      }

      const bankStatement: BankStatement = {
        accountNumber: 'CSV-IMPORT',
        bankCode: 'UNKNOWN',
        startDate: transactions[0]?.date || new Date(),
        endDate: transactions[transactions.length - 1]?.date || new Date(),
        openingBalance: openingBalanceResult.value,
        closingBalance: closingBalanceResult.value,
        transactions,
      };

      return Result.ok(bankStatement);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`CSV_PARSE_ERROR: ${message}`);
    }
  }

  // ========== Métodos Auxiliares ==========

  private parseOFXDate(dateStr?: string): Date {
    if (!dateStr) return new Date();

    // OFX formato: YYYYMMDDHHMMSS
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(8, 10)) || 0;
    const minute = parseInt(dateStr.substring(10, 12)) || 0;
    const second = parseInt(dateStr.substring(12, 14)) || 0;

    return new Date(year, month, day, hour, minute, second);
  }

  private parseCSVDate(dateStr: string): Date {
    // Tentar múltiplos formatos
    
    // Formato DD/MM/YYYY
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Formato YYYY-MM-DD
    if (dateStr.includes('-')) {
      return new Date(dateStr);
    }

    // Fallback
    return new Date(dateStr);
  }

  private parseCSVLine(line: string): string[] {
    // Parser CSV considerando aspas
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  }

  private parseMoneyString(value: string): number {
    // Remover símbolos monetários e espaços
    const cleaned = value
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '') // Remover TODOS os separadores de milhares (regex global)
      .replace(',', '.'); // Trocar vírgula decimal por ponto

    return parseFloat(cleaned) || 0;
  }
}
