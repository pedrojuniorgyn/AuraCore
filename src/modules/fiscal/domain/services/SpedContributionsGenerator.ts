/**
 * 📄 SPED CONTRIBUTIONS GENERATOR - Domain Service
 * Geração de EFD-Contribuições (PIS/COFINS)
 * 
 * Blocos Implementados:
 * - Bloco 0: Cadastros (Abertura)
 * - Bloco A: Receitas (Documentos fiscais de saída)
 * - Bloco C: Créditos (Documentos fiscais de entrada com crédito)
 * - Bloco M: Apuração de PIS/COFINS
 * - Bloco 9: Encerramento
 * 
 * @epic E7.13 - Services → DDD/Hexagonal
 * @layer Domain
 */

import { Result } from '@/shared/domain';
import { SpedRegister, SpedBlock, SpedDocument } from '../value-objects';

// ==========================================
// INTERFACES DE DADOS NECESSÁRIOS
// ==========================================

export interface SpedContributionsInput {
  organizationId: number;
  branchId: number;
  referenceMonth: number; // 1-12
  referenceYear: number;
  finality: 'ORIGINAL' | 'SUBSTITUTION';
}

export interface CompanyDataContrib {
  document: string; // CNPJ da empresa
  name?: string; // Razão social
  accountantDocument?: string; // CRC do contador
  accountantName?: string; // Nome do contador
  accountantCrcState?: string; // UF do CRC
}

export interface CteContrib {
  cteNumber: string;
  accessKey: string;
  issueDate: Date;
  customerDocument: string;
  cfop: string;
  totalAmount: number;
  icmsAmount: number;
}

export interface NFeContrib {
  documentNumber: string;
  accessKey: string;
  issueDate: Date;
  partnerDocument: string;
  netAmount: number;
  cfop: string;
}

export interface TaxTotalsContrib {
  baseDebito: number;   // Base de cálculo para débitos (receitas de CTes)
  baseCredito: number;  // Base de cálculo para créditos (compras em NFes)
}

export interface SpedContributionsData {
  company: CompanyDataContrib;
  ctes: CteContrib[];
  nfesEntrada: NFeContrib[];
  taxTotals: TaxTotalsContrib;
}

// ==========================================
// DOMAIN SERVICE
// ==========================================

export class SpedContributionsGenerator {
  /**
   * Gera documento SPED Contributions completo
   * 
   * @param input - Configurações do período e empresa
   * @param data - Dados fiscais do sistema
   * @returns Result com SpedDocument ou string error
   */
  generate(
    input: SpedContributionsInput,
    data: SpedContributionsData
  ): Result<SpedDocument, string> {
    try {
      // Validações
      const validation = this.validateInput(input, data);
      if (Result.isFail(validation)) {
        return validation;
      }

      // Gerar blocos
      const block0Result = this.generateBlock0(input, data.company);
      if (Result.isFail(block0Result)) return block0Result;

      const blockAResult = this.generateBlockA(input, data.ctes);
      if (Result.isFail(blockAResult)) return blockAResult;

      const blockCResult = this.generateBlockC(input, data.nfesEntrada);
      if (Result.isFail(blockCResult)) return blockCResult;

      const blockMResult = this.generateBlockM(input, data.taxTotals);
      if (Result.isFail(blockMResult)) return blockMResult;

      const blocks = [
        block0Result.value,
        blockAResult.value,
        blockCResult.value,
        blockMResult.value,
      ];

      const block9Result = this.generateBlock9(blocks);
      if (Result.isFail(block9Result)) return block9Result;

      blocks.push(block9Result.value);

      // Criar documento final
      return SpedDocument.create({
        documentType: 'EFD_CONTRIBUICOES',  // Valor correto do enum SpedDocumentType
        blocks: blocks,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao gerar SPED Contribuições: ${errorMessage}`);
    }
  }

  // ==========================================
  // BLOCO 0: ABERTURA
  // ==========================================

  private generateBlock0(
    input: SpedContributionsInput,
    company: CompanyDataContrib
  ): Result<SpedBlock, string> {
    const registers: SpedRegister[] = [];

    const startDate = `01${String(input.referenceMonth).padStart(2, '0')}${input.referenceYear}`;
    const lastDay = new Date(input.referenceYear, input.referenceMonth, 0).getDate();
    const endDate = `${String(lastDay).padStart(2, '0')}${String(input.referenceMonth).padStart(2, '0')}${input.referenceYear}`;

    // 0001: Abertura do Bloco 0 (DEVE ser o primeiro registro do bloco)
    const reg0001 = SpedRegister.create({
      registerCode: '0001',
      fields: ['0']
    });
    if (Result.isFail(reg0001)) return reg0001;
    registers.push(reg0001.value);

    // 0000: Abertura do Arquivo Digital
    const finalityCode = input.finality === 'SUBSTITUTION' ? '1' : '0';
    
    const reg0000 = SpedRegister.create({
      registerCode: '0000',
      fields: ['009', company.name || 'AURA CORE TMS', startDate, endDate, finalityCode, '']
    });
    if (Result.isFail(reg0000)) return reg0000;
    registers.push(reg0000.value);

    // 0035: Identificação SCP
    const reg0035 = SpedRegister.create({
      registerCode: '0035',
      fields: [company.document, '']
    });
    if (Result.isFail(reg0035)) return reg0035;
    registers.push(reg0035.value);

    // 0100: Dados do Contabilista (usa dados da empresa ou defaults)
    const accountantName = company.accountantName || 'CONTADOR RESPONSAVEL';
    const accountantDoc = company.accountantDocument || '00000000000';
    const accountantCrc = company.accountantCrcState || 'SP';
    
    const reg0100 = SpedRegister.create({
      registerCode: '0100',
      fields: [accountantName, accountantDoc, `00000/${accountantCrc}`, '', '', '', '', '']
    });
    if (Result.isFail(reg0100)) return reg0100;
    registers.push(reg0100.value);

    // 0990: Encerramento do Bloco 0
    const totalRecords = registers.length + 1;
    const reg0990 = SpedRegister.create({
      registerCode: '0990',
      fields: [totalRecords.toString()]
    });
    if (Result.isFail(reg0990)) return reg0990;
    registers.push(reg0990.value);

    return SpedBlock.create({ blockId: '0', registers });
  }

  // ==========================================
  // BLOCO A: RECEITAS (DOCUMENTOS DE SAÍDA)
  // ==========================================

  private generateBlockA(
    input: SpedContributionsInput,
    ctes: CteContrib[]
  ): Result<SpedBlock, string> {
    const registers: SpedRegister[] = [];

    // A001: Abertura do Bloco A
    const regA001 = SpedRegister.create({
      registerCode: 'A001',
      fields: ['0']
    });
    if (Result.isFail(regA001)) return regA001;
    registers.push(regA001.value);

    // A100 + A170: CTes (Documentos de Transporte)
    for (const cte of ctes) {
      const dataEmissao = this.formatDate(cte.issueDate);
      const codParticipante = cte.customerDocument.replace(/\D/g, '');
      
      // Base de cálculo = Valor total - ICMS
      const baseCalculo = cte.totalAmount - cte.icmsAmount;

      // A100: Documento - Nota Fiscal de Serviço
      const regA100 = SpedRegister.create({
        registerCode: 'A100',
        fields: [
          '0', // IND_OPER: 0 = Operação representativa de aquisição, custos, despesa ou encargo
          '1', // IND_EMIT: 1 = Emissão própria
          codParticipante,
          '57', // COD_MOD: 57 = CT-e
          '00', // COD_SIT: 00 = Documento regular
          cte.cteNumber,
          cte.accessKey,
          dataEmissao,
          cte.totalAmount.toFixed(2),
          '01', // IND_NAT: 01 = Natureza da Operação Sujeita à Tributação
          baseCalculo.toFixed(2),
          ''
        ]
      });
      if (Result.isFail(regA100)) return regA100;
      registers.push(regA100.value);

      // A170: Complemento - PIS/PASEP
      const aliquotaPis = 1.65;
      const pisSaida = (baseCalculo * aliquotaPis) / 100;
      
      const regA170Pis = SpedRegister.create({
        registerCode: 'A170',
        fields: [
          cte.cteNumber,
          '01', // CST_PIS: 01 = Operação Tributável com Alíquota Básica
          '01', // CFOP (primeiro dígito)
          baseCalculo.toFixed(2),
          aliquotaPis.toFixed(2),
          pisSaida.toFixed(2),
          '',
          ''
        ]
      });
      if (Result.isFail(regA170Pis)) return regA170Pis;
      registers.push(regA170Pis.value);

      // A170: Complemento - COFINS
      const aliquotaCofins = 7.6;
      const cofinsSaida = (baseCalculo * aliquotaCofins) / 100;
      
      const regA170Cofins = SpedRegister.create({
        registerCode: 'A170',
        fields: [
          cte.cteNumber,
          '01', // CST_COFINS: 01 = Operação Tributável com Alíquota Básica
          '02', // CFOP (primeiro dígito)
          baseCalculo.toFixed(2),
          aliquotaCofins.toFixed(2),
          cofinsSaida.toFixed(2),
          '',
          ''
        ]
      });
      if (Result.isFail(regA170Cofins)) return regA170Cofins;
      registers.push(regA170Cofins.value);
    }

    // A990: Encerramento do Bloco A
    const totalRecords = registers.length + 1;
    const regA990 = SpedRegister.create({
      registerCode: 'A990',
      fields: [totalRecords.toString()]
    });
    if (Result.isFail(regA990)) return regA990;
    registers.push(regA990.value);

    return SpedBlock.create({ blockId: 'A', registers });
  }

  // ==========================================
  // BLOCO C: CRÉDITOS (DOCUMENTOS DE ENTRADA)
  // ==========================================

  private generateBlockC(
    input: SpedContributionsInput,
    nfesEntrada: NFeContrib[]
  ): Result<SpedBlock, string> {
    const registers: SpedRegister[] = [];

    // C001: Abertura do Bloco C
    const regC001 = SpedRegister.create({
      registerCode: 'C001',
      fields: ['0']
    });
    if (Result.isFail(regC001)) return regC001;
    registers.push(regC001.value);

    // C100: NFe de Entrada (com crédito)
    for (const nfe of nfesEntrada) {
      const dataEmissao = this.formatDate(nfe.issueDate);
      
      // Créditos PIS/COFINS
      const aliquotaPis = 1.65;
      const aliquotaCofins = 7.6;
      
      const pisCredito = (nfe.netAmount * aliquotaPis) / 100;
      const cofinsCredito = (nfe.netAmount * aliquotaCofins) / 100;

      const regC100 = SpedRegister.create({
        registerCode: 'C100',
        fields: [
          '0', // IND_OPER: 0 = Entrada
          '1', // IND_EMIT: 1 = Emissão própria (nota emitida pelo fornecedor)
          nfe.partnerDocument,
          '55', // COD_MOD: 55 = NF-e
          '00', // COD_SIT: 00 = Documento regular
          nfe.documentNumber,
          nfe.accessKey,
          dataEmissao,
          nfe.netAmount.toFixed(2),
          pisCredito.toFixed(2),
          cofinsCredito.toFixed(2),
          ''
        ]
      });
      if (Result.isFail(regC100)) return regC100;
      registers.push(regC100.value);
    }

    // C990: Encerramento do Bloco C
    const totalRecords = registers.length + 1;
    const regC990 = SpedRegister.create({
      registerCode: 'C990',
      fields: [totalRecords.toString()]
    });
    if (Result.isFail(regC990)) return regC990;
    registers.push(regC990.value);

    return SpedBlock.create({ blockId: 'C', registers });
  }

  // ==========================================
  // BLOCO M: APURAÇÃO DE PIS/COFINS
  // ==========================================

  private generateBlockM(
    input: SpedContributionsInput,
    taxTotals: TaxTotalsContrib
  ): Result<SpedBlock, string> {
    const registers: SpedRegister[] = [];

    // M001: Abertura do Bloco M
    const regM001 = SpedRegister.create({
      registerCode: 'M001',
      fields: ['0']
    });
    if (Result.isFail(regM001)) return regM001;
    registers.push(regM001.value);

    // Alíquotas PIS/COFINS (regime não-cumulativo)
    const ALIQUOTA_PIS = 0.0165;    // 1.65%
    const ALIQUOTA_COFINS = 0.076;  // 7.6%

    // Calcular impostos a partir da BASE DE CÁLCULO
    const pisDebito = taxTotals.baseDebito * ALIQUOTA_PIS;
    const cofinsDebito = taxTotals.baseDebito * ALIQUOTA_COFINS;
    const pisCredito = taxTotals.baseCredito * ALIQUOTA_PIS;
    const cofinsCredito = taxTotals.baseCredito * ALIQUOTA_COFINS;

    // Saldo a pagar (débito - crédito)
    const pisAPagar = Math.max(pisDebito - pisCredito, 0);
    const cofinsAPagar = Math.max(cofinsDebito - cofinsCredito, 0);

    // M200: Contribuição para o PIS/PASEP do Período
    const regM200 = SpedRegister.create({
      registerCode: 'M200',
      fields: [
        '01', // IND_AJ: 01 = Sem ajuste
        pisAPagar.toFixed(2),
        ''
      ]
    });
    if (Result.isFail(regM200)) return regM200;
    registers.push(regM200.value);

    // M600: Contribuição para a COFINS do Período
    const regM600 = SpedRegister.create({
      registerCode: 'M600',
      fields: [
        '01', // IND_AJ: 01 = Sem ajuste
        cofinsAPagar.toFixed(2),
        ''
      ]
    });
    if (Result.isFail(regM600)) return regM600;
    registers.push(regM600.value);

    // M990: Encerramento do Bloco M
    const totalRecords = registers.length + 1;
    const regM990 = SpedRegister.create({
      registerCode: 'M990',
      fields: [totalRecords.toString()]
    });
    if (Result.isFail(regM990)) return regM990;
    registers.push(regM990.value);

    return SpedBlock.create({ blockId: 'M', registers });
  }

  // ==========================================
  // BLOCO 9: ENCERRAMENTO
  // ==========================================

  private generateBlock9(blocks: SpedBlock[]): Result<SpedBlock, string> {
    const registers: SpedRegister[] = [];

    // 9001: Abertura do Bloco 9
    const reg9001 = SpedRegister.create({
      registerCode: '9001',
      fields: ['0']
    });
    if (Result.isFail(reg9001)) return reg9001;
    registers.push(reg9001.value);

    // 9900: Totalizadores — contar registros DINAMICAMENTE de todos os blocos
    const registerCounts = new Map<string, number>();
    for (const block of blocks) {
      for (const reg of block.registers) {
        const regCode = reg.code;
        registerCounts.set(regCode, (registerCounts.get(regCode) ?? 0) + 1);
      }
    }

    // Adicionar os próprios registros do bloco 9
    registerCounts.set('9001', 1);
    registerCounts.set('9990', 1);
    registerCounts.set('9999', 1);

    // Contar quantos 9900 teremos (+1 para o 9900 referenciando a si mesmo)
    const totalRegisterTypes = registerCounts.size + 1;
    registerCounts.set('9900', totalRegisterTypes);

    // Gerar 9900 em ordem de código de registro
    const sortedCodes = Array.from(registerCounts.keys()).sort();
    for (const code of sortedCodes) {
      const count = registerCounts.get(code) ?? 0;
      const reg9900 = SpedRegister.create({
        registerCode: '9900',
        fields: [code, count.toString()]
      });
      if (Result.isFail(reg9900)) return reg9900;
      registers.push(reg9900.value);
    }

    // Calcular total de registros em TODOS os blocos + bloco 9
    const totalRegistros = blocks.reduce((sum, block) => sum + block.registerCount, 0) + registers.length + 2;

    // 9990: Encerramento do Bloco 9
    const reg9990 = SpedRegister.create({
      registerCode: '9990',
      fields: [(registers.length + 2).toString()] // +2 para incluir 9990 e 9999
    });
    if (Result.isFail(reg9990)) return reg9990;
    registers.push(reg9990.value);

    // 9999: Encerramento do Arquivo Digital
    const reg9999 = SpedRegister.create({
      registerCode: '9999',
      fields: [totalRegistros.toString()]
    });
    if (Result.isFail(reg9999)) return reg9999;
    registers.push(reg9999.value);

    return SpedBlock.create({ blockId: '9', registers });
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private validateInput(
    input: SpedContributionsInput,
    data: SpedContributionsData
  ): Result<void, string> {
    if (input.referenceYear < 2000 || input.referenceYear > 2100) {
      return Result.fail('Ano de referência inválido');
    }

    if (input.referenceMonth < 1 || input.referenceMonth > 12) {
      return Result.fail('Mês de referência inválido. Deve estar entre 1 e 12');
    }

    if (!['ORIGINAL', 'SUBSTITUTION'].includes(input.finality)) {
      return Result.fail('Finalidade inválida. Use ORIGINAL ou SUBSTITUTION');
    }

    if (!data.company.document || data.company.document.length !== 14) {
      return Result.fail('CNPJ da empresa inválido');
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

