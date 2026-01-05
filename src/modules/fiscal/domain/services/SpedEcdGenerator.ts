/**
 * 📄 SPED ECD GENERATOR - Domain Service
 * Geração de Escrituração Contábil Digital (ECD)
 * 
 * Blocos Implementados:
 * - Bloco 0: Cadastros (Abertura)
 * - Bloco J: Plano de Contas
 * - Bloco I: Lançamentos Contábeis (Livro Diário)
 * - Bloco K: Saldos das Contas (Razão)
 * - Bloco 9: Encerramento
 * 
 * @epic E7.13 - Services → DDD/Hexagonal
 * @layer Domain
 */

import { Result } from '@/shared/domain';
import { SpedRegister, SpedBlock, SpedDocument } from '../value-objects';
import { SpedError } from '../errors/SpedError';

// ==========================================
// INTERFACES DE DADOS NECESSÁRIOS
// ==========================================

export interface SpedEcdInput {
  organizationId: number;
  branchId: number;
  referenceYear: number;
  bookType: 'G' | 'R'; // G = Livro Geral, R = Livro Razão Auxiliar
}

export interface CompanyData {
  document: string; // CNPJ da empresa
  name: string; // Razão social
  accountantDocument?: string; // CRC do contador
  accountantName?: string; // Nome do contador
  accountantCrcState?: string; // UF do CRC
}

export interface ChartAccount {
  code: string;
  name: string;
  type: string; // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  parentCode: string | null;
  isAnalytical: boolean;
}

export interface JournalEntryData {
  id: string;
  entryNumber: string;
  entryDate: Date;
  description: string;
}

export interface JournalEntryLine {
  lineNumber: number;
  accountCode: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
}

export interface AccountBalance {
  code: string;
  totalDebit: number;
  totalCredit: number;
}

export interface SpedEcdData {
  company: CompanyData;
  accounts: ChartAccount[];
  journalEntries: Map<string, {
    entry: JournalEntryData;
    lines: JournalEntryLine[];
  }>;
  balances: AccountBalance[];
}

// ==========================================
// DOMAIN SERVICE
// ==========================================

export class SpedEcdGenerator {
  /**
   * Gera documento SPED ECD completo
   * 
   * @param input - Configurações do período e empresa
   * @param data - Dados contábeis do sistema
   * @returns Result com SpedDocument ou SpedError
   */
  generate(input: SpedEcdInput, data: SpedEcdData): Result<SpedDocument, SpedError> {
    try {
      // Validações
      const validation = this.validateInput(input, data);
      if (Result.isFail(validation)) {
        return validation;
      }

      // Gerar blocos
      const block0Result = this.generateBlock0(input, data.company);
      if (Result.isFail(block0Result)) return block0Result;

      const blockJResult = this.generateBlockJ(input, data.accounts);
      if (Result.isFail(blockJResult)) return blockJResult;

      const blockIResult = this.generateBlockI(input, data.journalEntries);
      if (Result.isFail(blockIResult)) return blockIResult;

      const blockKResult = this.generateBlockK(input, data.balances);
      if (Result.isFail(blockKResult)) return blockKResult;

      const blocks = [
        block0Result.value,
        blockJResult.value,
        blockIResult.value,
        blockKResult.value,
      ];

      const block9Result = this.generateBlock9(blocks);
      if (Result.isFail(block9Result)) return block9Result;

      blocks.push(block9Result.value);

      // Criar documento final
      return SpedDocument.create({
        documentType: 'ECD',
        blocks: blocks,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new SpedError(`Erro ao gerar SPED ECD: ${errorMessage}`));
    }
  }

  // ==========================================
  // BLOCO 0: ABERTURA
  // ==========================================

  private generateBlock0(
    input: SpedEcdInput,
    company: CompanyData
  ): Result<SpedBlock, SpedError> {
    const registers: SpedRegister[] = [];

    const startDate = `0101${input.referenceYear}`;
    const endDate = `3112${input.referenceYear}`;

    // 0000: Abertura do Arquivo Digital
    const reg0000 = SpedRegister.create(
      '0000',
      'LECDE', // Leiaute ECD
      '010000', // Versão do leiaute
      startDate,
      endDate,
      company.name,
      '', // Código da finalidade (vazio para ECD)
      '0', // Código da empresa
      input.bookType, // Tipo de escrituração
      'A' // Tipo de escrituração (A = Analítica)
    );
    if (Result.isFail(reg0000)) return reg0000;
    registers.push(reg0000.value);

    // 0001: Abertura do Bloco 0
    const reg0001 = SpedRegister.create('0001', '0');
    if (Result.isFail(reg0001)) return reg0001;
    registers.push(reg0001.value);

    // 0007: Dados da Empresa
    const reg0007 = SpedRegister.create(
      '0007',
      company.document,
      company.name,
      '', '', '', '', '', '', ''
    );
    if (Result.isFail(reg0007)) return reg0007;
    registers.push(reg0007.value);

    // 0020: Dados do Contabilista
    const accountantName = company.accountantName || 'CONTADOR RESPONSAVEL';
    const accountantDoc = company.accountantDocument || '00000000000';
    const accountantCrc = company.accountantCrcState || 'SP';
    
    const reg0020 = SpedRegister.create(
      '0020',
      accountantName,
      accountantDoc,
      `00000/${accountantCrc}`,
      '', '', '', '', ''
    );
    if (Result.isFail(reg0020)) return reg0020;
    registers.push(reg0020.value);

    // 0990: Encerramento do Bloco 0
    const totalRecords = registers.length + 1; // +1 para o próprio 0990
    const reg0990 = SpedRegister.create('0990', totalRecords.toString());
    if (Result.isFail(reg0990)) return reg0990;
    registers.push(reg0990.value);

    return SpedBlock.create('0', registers);
  }

  // ==========================================
  // BLOCO J: PLANO DE CONTAS
  // ==========================================

  private generateBlockJ(
    input: SpedEcdInput,
    accounts: ChartAccount[]
  ): Result<SpedBlock, SpedError> {
    const registers: SpedRegister[] = [];

    // J001: Abertura do Bloco J
    const regJ001 = SpedRegister.create('J001', '0');
    if (Result.isFail(regJ001)) return regJ001;
    registers.push(regJ001.value);

    // J005: Plano de Contas
    for (const account of accounts) {
      const nivel = account.code.split('.').length;
      const tipoSaldo = account.type === 'ASSET' || account.type === 'EXPENSE' ? 'D' : 'C';
      const natureza = account.isAnalytical ? 'A' : 'S'; // A = Analítica, S = Sintética

      const regJ005 = SpedRegister.create(
        'J005',
        account.code,
        account.name,
        account.parentCode || '',
        nivel.toString(),
        natureza,
        tipoSaldo,
        ''
      );
      if (Result.isFail(regJ005)) return regJ005;
      registers.push(regJ005.value);
    }

    // J990: Encerramento do Bloco J
    const totalRecords = registers.length + 1;
    const regJ990 = SpedRegister.create('J990', totalRecords.toString());
    if (Result.isFail(regJ990)) return regJ990;
    registers.push(regJ990.value);

    return SpedBlock.create('J', registers);
  }

  // ==========================================
  // BLOCO I: LANÇAMENTOS CONTÁBEIS
  // ==========================================

  private generateBlockI(
    input: SpedEcdInput,
    journalEntries: Map<string, { entry: JournalEntryData; lines: JournalEntryLine[] }>
  ): Result<SpedBlock, SpedError> {
    const registers: SpedRegister[] = [];

    // I001: Abertura do Bloco I
    const regI001 = SpedRegister.create('I001', '0');
    if (Result.isFail(regI001)) return regI001;
    registers.push(regI001.value);

    // I200 e I250: Lançamentos e Partidas
    for (const [, { entry, lines }] of journalEntries) {
      const dataLancamento = this.formatDate(entry.entryDate);

      // I200: Lançamento
      const regI200 = SpedRegister.create(
        'I200',
        entry.entryNumber,
        dataLancamento,
        '0.00', // Valor do lançamento (totalizador)
        entry.description,
        '',
        ''
      );
      if (Result.isFail(regI200)) return regI200;
      registers.push(regI200.value);

      // I250: Partidas (Débito/Crédito)
      for (const line of lines) {
        if (line.debitAmount > 0) {
          const regI250Debit = SpedRegister.create(
            'I250',
            line.accountCode,
            line.debitAmount.toFixed(2),
            'D',
            ''
          );
          if (Result.isFail(regI250Debit)) return regI250Debit;
          registers.push(regI250Debit.value);
        }

        if (line.creditAmount > 0) {
          const regI250Credit = SpedRegister.create(
            'I250',
            line.accountCode,
            line.creditAmount.toFixed(2),
            'C',
            ''
          );
          if (Result.isFail(regI250Credit)) return regI250Credit;
          registers.push(regI250Credit.value);
        }
      }
    }

    // I990: Encerramento do Bloco I
    const totalRecords = registers.length + 1;
    const regI990 = SpedRegister.create('I990', totalRecords.toString());
    if (Result.isFail(regI990)) return regI990;
    registers.push(regI990.value);

    return SpedBlock.create('I', registers);
  }

  // ==========================================
  // BLOCO K: SALDOS DAS CONTAS
  // ==========================================

  private generateBlockK(
    input: SpedEcdInput,
    balances: AccountBalance[]
  ): Result<SpedBlock, SpedError> {
    const registers: SpedRegister[] = [];

    // K001: Abertura do Bloco K
    const regK001 = SpedRegister.create('K001', '0');
    if (Result.isFail(regK001)) return regK001;
    registers.push(regK001.value);

    // K155: Saldos Finais
    const dataFinal = `3112${input.referenceYear}`;

    for (const balance of balances) {
      const saldoFinal = Math.abs(balance.totalDebit - balance.totalCredit);
      
      // Ignorar contas zeradas
      if (saldoFinal > 0) {
        const indicadorSaldo = balance.totalDebit >= balance.totalCredit ? 'D' : 'C';

        const regK155 = SpedRegister.create(
          'K155',
          dataFinal,
          balance.code,
          saldoFinal.toFixed(2),
          indicadorSaldo,
          ''
        );
        if (Result.isFail(regK155)) return regK155;
        registers.push(regK155.value);
      }
    }

    // K990: Encerramento do Bloco K
    const totalRecords = registers.length + 1;
    const regK990 = SpedRegister.create('K990', totalRecords.toString());
    if (Result.isFail(regK990)) return regK990;
    registers.push(regK990.value);

    return SpedBlock.create('K', registers);
  }

  // ==========================================
  // BLOCO 9: ENCERRAMENTO
  // ==========================================

  private generateBlock9(blocks: SpedBlock[]): Result<SpedBlock, SpedError> {
    const registers: SpedRegister[] = [];

    // 9001: Abertura do Bloco 9
    const reg9001 = SpedRegister.create('9001', '0');
    if (Result.isFail(reg9001)) return reg9001;
    registers.push(reg9001.value);

    // 9900: Totalizadores
    const reg9900_0000 = SpedRegister.create('9900', '0000', '1');
    const reg9900_0001 = SpedRegister.create('9900', '0001', '1');
    const reg9900_0990 = SpedRegister.create('9900', '0990', '1');
    const reg9900_J001 = SpedRegister.create('9900', 'J001', '1');
    const reg9900_J990 = SpedRegister.create('9900', 'J990', '1');
    const reg9900_I001 = SpedRegister.create('9900', 'I001', '1');
    const reg9900_I990 = SpedRegister.create('9900', 'I990', '1');
    const reg9900_K001 = SpedRegister.create('9900', 'K001', '1');
    const reg9900_K990 = SpedRegister.create('9900', 'K990', '1');
    const reg9900_9001 = SpedRegister.create('9900', '9001', '1');
    const reg9900_9900 = SpedRegister.create('9900', '9900', '11'); // 11 totalizadores
    const reg9900_9990 = SpedRegister.create('9900', '9990', '1');
    const reg9900_9999 = SpedRegister.create('9900', '9999', '1');

    if (Result.isFail(reg9900_0000)) return reg9900_0000;
    if (Result.isFail(reg9900_0001)) return reg9900_0001;
    if (Result.isFail(reg9900_0990)) return reg9900_0990;
    if (Result.isFail(reg9900_J001)) return reg9900_J001;
    if (Result.isFail(reg9900_J990)) return reg9900_J990;
    if (Result.isFail(reg9900_I001)) return reg9900_I001;
    if (Result.isFail(reg9900_I990)) return reg9900_I990;
    if (Result.isFail(reg9900_K001)) return reg9900_K001;
    if (Result.isFail(reg9900_K990)) return reg9900_K990;
    if (Result.isFail(reg9900_9001)) return reg9900_9001;
    if (Result.isFail(reg9900_9900)) return reg9900_9900;
    if (Result.isFail(reg9900_9990)) return reg9900_9990;
    if (Result.isFail(reg9900_9999)) return reg9900_9999;

    registers.push(reg9900_0000.value);
    registers.push(reg9900_0001.value);
    registers.push(reg9900_0990.value);
    registers.push(reg9900_J001.value);
    registers.push(reg9900_J990.value);
    registers.push(reg9900_I001.value);
    registers.push(reg9900_I990.value);
    registers.push(reg9900_K001.value);
    registers.push(reg9900_K990.value);
    registers.push(reg9900_9001.value);
    registers.push(reg9900_9900.value);
    registers.push(reg9900_9990.value);
    registers.push(reg9900_9999.value);

    // Calcular total de registros em TODOS os blocos
    const totalRegistros = blocks.reduce((sum, block) => sum + block.registers.length, 0) + registers.length + 1;

    // 9990: Encerramento do Bloco 9
    const reg9990 = SpedRegister.create('9990', (registers.length + 1).toString());
    if (Result.isFail(reg9990)) return reg9990;
    registers.push(reg9990.value);

    // 9999: Encerramento do Arquivo Digital
    const reg9999 = SpedRegister.create('9999', totalRegistros.toString());
    if (Result.isFail(reg9999)) return reg9999;
    registers.push(reg9999.value);

    return SpedBlock.create('9', registers);
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private validateInput(input: SpedEcdInput, data: SpedEcdData): Result<void, SpedError> {
    if (input.referenceYear < 2000 || input.referenceYear > 2100) {
      return Result.fail(new SpedError('Ano de referência inválido'));
    }

    if (!['G', 'R'].includes(input.bookType)) {
      return Result.fail(new SpedError('Tipo de livro inválido. Use G (Geral) ou R (Razão Auxiliar)'));
    }

    if (!data.company.document || data.company.document.length !== 14) {
      return Result.fail(new SpedError('CNPJ da empresa inválido'));
    }

    if (!data.company.name || data.company.name.trim() === '') {
      return Result.fail(new SpedError('Nome da empresa é obrigatório'));
    }

    if (data.accounts.length === 0) {
      return Result.fail(new SpedError('Plano de contas vazio'));
    }

    return Result.ok(undefined);
  }

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}${month}${year}`;
  }
}

