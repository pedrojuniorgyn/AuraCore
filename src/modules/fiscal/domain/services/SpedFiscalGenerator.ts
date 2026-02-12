/**
 * 📄 SPED FISCAL GENERATOR - DOMAIN SERVICE
 * 
 * Domain service encapsulating pure business logic for EFD-ICMS/IPI generation
 * 
 * Responsibilities:
 * - Generate SPED Fiscal file (EFD-ICMS/IPI)
 * - Create all required blocks (0, C, D, E, H, 9)
 * - Format registers according to SPED specifications
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 */

import { Result } from "@/shared/domain";
import { SpedError } from "../errors";
import {
  SpedRegister,
  SpedBlock,
  SpedDocument,
  SpedDocumentType,
} from "../value-objects";
import {
  ISpedDataRepository,
  SpedFiscalPeriod,
  OrganizationData,
  PartnerData,
  ProductData,
  InvoiceData,
  CteData,
  ApurationData,
} from '../ports/output/ISpedDataRepository';

export interface GenerateSpedFiscalInput {
  period: SpedFiscalPeriod;
}

export class SpedFiscalGenerator {
  constructor(private readonly repository: ISpedDataRepository) {}

  /**
   * Gera arquivo SPED Fiscal completo
   */
  async generate(
    input: GenerateSpedFiscalInput
  ): Promise<Result<SpedDocument, string>> {
    const { period } = input;

    // Validar período
    if (period.referenceMonth < 1 || period.referenceMonth > 12) {
      return Result.fail(
        `Período inválido: mês ${period.referenceMonth}/${period.referenceYear}`
      );
    }

    try {
      // Gerar todos os blocos
      const block0Result = await this.generateBlock0(period);
      if (block0Result.isFailure) return Result.fail(block0Result.error);

      const blockCResult = await this.generateBlockC(period);
      if (blockCResult.isFailure) return Result.fail(blockCResult.error);

      const blockDResult = await this.generateBlockD(period);
      if (blockDResult.isFailure) return Result.fail(blockDResult.error);

      const blockEResult = await this.generateBlockE(period);
      if (blockEResult.isFailure) return Result.fail(blockEResult.error);

      const blockHResult = await this.generateBlockH(period);
      if (blockHResult.isFailure) return Result.fail(blockHResult.error);

      const blocks = [
        block0Result.value,
        blockCResult.value,
        blockDResult.value,
        blockEResult.value,
        blockHResult.value,
      ];

      // Gerar Bloco 9 (encerramento) com contagem de registros
      const block9 = this.generateBlock9(blocks);

      // Criar documento SPED
      const documentResult = SpedDocument.create({
        documentType: 'EFD_ICMS_IPI',
        blocks: [...blocks, block9],
      });

      if (documentResult.isFailure) {
        return Result.fail(documentResult.error);
      }

      return Result.ok(documentResult.value);
    } catch (error) {
      return Result.fail(
        `Erro ao gerar SPED Fiscal: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  }

  /**
   * BLOCO 0: Abertura, Identificação e Cadastros
   */
  private async generateBlock0(
    period: SpedFiscalPeriod
  ): Promise<Result<SpedBlock, string>> {
    const registers: SpedRegister[] = [];

    // 0001: Abertura do Bloco 0
    registers.push(
      SpedRegister.create({
        registerCode: '0001',
        fields: ['0'],
      }).value!
    );

    // Buscar dados da organização primeiro (usado em 0000, 0005 e 0100)
    const orgResult = await this.repository.getOrganization(period.organizationId);
    if (orgResult.isFailure) {
      return Result.fail(
        `Organização não encontrada: ID ${period.organizationId}`
      );
    }

    // 0000: Abertura do Arquivo
    const startDate = this.formatDate(
      new Date(period.referenceYear, period.referenceMonth - 1, 1)
    );
    const endDate = this.formatDate(
      new Date(period.referenceYear, period.referenceMonth, 0)
    );

    registers.push(
      SpedRegister.create({
        registerCode: '0000',
        fields: [
          '014',  // Código da versão do leiaute
          '0',    // Tipo de escrituração (0 = original)
          startDate,
          endDate,
          orgResult.value.name || 'AURA CORE TMS',
          '01',   // Finalidade do arquivo
          'A',    // Indicador de situação especial
          period.finality === 'SUBSTITUTION' ? '1' : '0',
          '0',    // Indicador de grande porte
          'G',    // Tipo de entidade
          '',     // Indicador de início de escrituração
          '',     // Indicador de finalização de escrituração
        ],
      }).value!
    );

    // 0005: Dados Complementares da Empresa

    const org = orgResult.value;
    registers.push(
      SpedRegister.create({
        registerCode: '0005',
        fields: [
          org.name,
          org.document,
          org.ie || '',  // IE
          org.im || '',  // IM
          '',  // SUFRAMA
          '',  // Logradouro
          '',  // Número
          '',  // Complemento
          '',  // Bairro
        ],
      }).value!
    );

    // 0100: Dados do Contabilista (usa dados da organização ou defaults)
    const accountantName = org.accountantName || 'CONTADOR RESPONSAVEL';
    const accountantDoc = org.accountantDocument || '00000000000';
    const accountantCrc = org.accountantCrc
      ? `${org.accountantCrc}/${org.accountantCrcState || 'SP'}`
      : `00000/${org.accountantCrcState || 'SP'}`;

    registers.push(
      SpedRegister.create({
        registerCode: '0100',
        fields: [
          accountantName,
          accountantDoc,
          accountantCrc,
          '',  // CEP
          '',  // Logradouro
          '',  // Número
          '',  // Complemento
          '',  // Bairro
        ],
      }).value!
    );

    // 0150: Participantes (Fornecedores/Clientes)
    const partnersResult = await this.repository.getPartners(period);
    if (partnersResult.isSuccess) {
      for (const partner of partnersResult.value) {
        registers.push(
          SpedRegister.create({
            registerCode: '0150',
            fields: [
              partner.document.replace(/\D/g, ''),
              partner.legalName || '',
              '',  // País
              partner.document.length > 11 ? '01' : '02',  // CNPJ ou CPF
              '',  // IE
              '',  // IM
              '',  // SUFRAMA
              partner.addressStreet || '',
              '',  // Número
              partner.addressCity || '',
              partner.addressState || '',
            ],
          }).value!
        );
      }
    }

    // 0990: Encerramento do Bloco 0
    registers.push(
      SpedRegister.create({
        registerCode: '0990',
        fields: [registers.length + 1],
      }).value!
    );

    return SpedBlock.create({
      blockId: '0',
      registers,
    });
  }

  /**
   * BLOCO C: Documentos Fiscais I - Mercadorias (ICMS/IPI)
   */
  private async generateBlockC(
    period: SpedFiscalPeriod
  ): Promise<Result<SpedBlock, string>> {
    const registers: SpedRegister[] = [];

    // C001: Abertura do Bloco C
    registers.push(
      SpedRegister.create({
        registerCode: 'C001',
        fields: ['0'],
      }).value!
    );

    // Buscar NFes do período
    const invoicesResult = await this.repository.getInvoices(period);
    if (invoicesResult.isSuccess) {
      for (const invoice of invoicesResult.value) {
        const dataEmissao = this.formatDate(invoice.issueDate);
        const codParticipante = invoice.partnerDocument.replace(/\D/g, '');

        // C100: Nota Fiscal (Código 01)
        registers.push(
          SpedRegister.create({
            registerCode: 'C100',
            fields: [
              '0',  // Indicador do tipo de operação
              '1',  // Indicador do emitente
              codParticipante,
              invoice.model,
              '00',  // Código da situação do documento
              invoice.series,
              invoice.documentNumber,
              invoice.accessKey,
              dataEmissao,
              dataEmissao,  // Data de entrada/saída
              invoice.totalAmount.toFixed(2),
              '',  // Indicador do tipo do frete
              '',  // Valor do desconto
              '',  // Valor das despesas acessórias
              '',  // Valor do IPI
            ],
          }).value!
        );

        // C190: Totalizador por CFOP e CST
        registers.push(
          SpedRegister.create({
            registerCode: 'C190',
            fields: [
              invoice.cfop,
              invoice.icmsBase?.toFixed(2) || '0.00',
              invoice.icmsAmount?.toFixed(2) || '0.00',
              '',  // Alíquota do ICMS
              '',  // Base de cálculo reduzida
              '',  // Isentas ou não tributadas
            ],
          }).value!
        );
      }
    }

    // C990: Encerramento do Bloco C
    registers.push(
      SpedRegister.create({
        registerCode: 'C990',
        fields: [registers.length + 1],
      }).value!
    );

    return SpedBlock.create({
      blockId: 'C',
      registers,
    });
  }

  /**
   * BLOCO D: Documentos Fiscais II - Serviços (ICMS)
   */
  private async generateBlockD(
    period: SpedFiscalPeriod
  ): Promise<Result<SpedBlock, string>> {
    const registers: SpedRegister[] = [];

    // D001: Abertura do Bloco D
    registers.push(
      SpedRegister.create({
        registerCode: 'D001',
        fields: ['0'],
      }).value!
    );

    // Buscar CTes do período
    const ctesResult = await this.repository.getCtes(period);
    if (ctesResult.isSuccess) {
      for (const cte of ctesResult.value) {
        const dataEmissao = this.formatDate(cte.issueDate);
        const codParticipante = cte.customerDocument.replace(/\D/g, '');

        // D100: Conhecimento de Transporte (Código 57)
        registers.push(
          SpedRegister.create({
            registerCode: 'D100',
            fields: [
              '0',
              '1',  // Indicador do emitente
              codParticipante,
              '57',  // Modelo (CTe)
              '00',
              cte.cteNumber,
              cte.accessKey,
              dataEmissao,
              dataEmissao,
              cte.totalAmount.toFixed(2),
              '',  // Indicador de frete
              '',  // Desconto
              '',  // Serviços
            ],
          }).value!
        );

        // D190: Totalizador por CFOP
        registers.push(
          SpedRegister.create({
            registerCode: 'D190',
            fields: [
              cte.cfop,
              cte.totalAmount.toFixed(2),
              cte.icmsAmount?.toFixed(2) || '0.00',
              '',
              '',
              '',
              '',
            ],
          }).value!
        );
      }
    }

    // D990: Encerramento do Bloco D
    registers.push(
      SpedRegister.create({
        registerCode: 'D990',
        fields: [registers.length + 1],
      }).value!
    );

    return SpedBlock.create({
      blockId: 'D',
      registers,
    });
  }

  /**
   * BLOCO E: Apuração do ICMS e do IPI
   */
  private async generateBlockE(
    period: SpedFiscalPeriod
  ): Promise<Result<SpedBlock, string>> {
    const registers: SpedRegister[] = [];

    // E001: Abertura do Bloco E
    registers.push(
      SpedRegister.create({
        registerCode: 'E001',
        fields: ['0'],
      }).value!
    );

    // E100: Período da Apuração do ICMS
    const startDate = this.formatDate(
      new Date(period.referenceYear, period.referenceMonth - 1, 1)
    );
    const endDate = this.formatDate(
      new Date(period.referenceYear, period.referenceMonth, 0)
    );

    registers.push(
      SpedRegister.create({
        registerCode: 'E100',
        fields: [startDate, endDate],
      }).value!
    );

    // E110: Apuração do ICMS
    const apurationResult = await this.repository.getApuration(period);
    if (apurationResult.isSuccess) {
      const apuration = apurationResult.value;
      const saldo = apuration.icmsDebit - apuration.icmsCredit;

      registers.push(
        SpedRegister.create({
          registerCode: 'E110',
          fields: [
            apuration.icmsDebit.toFixed(2),
            '0.00',  // Ajustes a débito
            apuration.icmsCredit.toFixed(2),
            '0.00',  // Ajustes a crédito
            '0.00',  // Estornos de débitos
            '0.00',  // Estornos de créditos
            Math.max(saldo, 0).toFixed(2),  // Saldo devedor
            '0.00',  // Deduções do imposto apurado
            '0.00',  // Débitos especiais
          ],
        }).value!
      );
    }

    // E990: Encerramento do Bloco E
    registers.push(
      SpedRegister.create({
        registerCode: 'E990',
        fields: [registers.length + 1],
      }).value!
    );

    return SpedBlock.create({
      blockId: 'E',
      registers,
    });
  }

  /**
   * BLOCO H: Inventário Físico
   */
  private async generateBlockH(
    period: SpedFiscalPeriod
  ): Promise<Result<SpedBlock, string>> {
    const registers: SpedRegister[] = [];

    // H001: Abertura do Bloco H
    registers.push(
      SpedRegister.create({
        registerCode: 'H001',
        fields: ['0'],
      }).value!
    );

    // H005: Totalizador do Inventário
    const lastDay = new Date(period.referenceYear, period.referenceMonth, 0);
    const inventoryDate = this.formatDate(lastDay);

    registers.push(
      SpedRegister.create({
        registerCode: 'H005',
        fields: [
          inventoryDate,
          '0.00',  // Valor total do inventário
          '01',    // Motivo do inventário
        ],
      }).value!
    );

    // H990: Encerramento do Bloco H
    registers.push(
      SpedRegister.create({
        registerCode: 'H990',
        fields: [registers.length + 1],
      }).value!
    );

    return SpedBlock.create({
      blockId: 'H',
      registers,
    });
  }

  /**
   * BLOCO 9: Controle e Encerramento do Arquivo Digital
   */
  private generateBlock9(blocks: SpedBlock[]): SpedBlock {
    const registers: SpedRegister[] = [];

    // 9001: Abertura do Bloco 9
    registers.push(
      SpedRegister.create({
        registerCode: '9001',
        fields: ['0'],
      }).value!
    );

    // Contar registros por tipo em todos os blocos
    const registerCounts = new Map<string, number>();
    for (const block of blocks) {
      for (const line of block.toLines()) {
        const registerCode = line.split('|')[1];
        registerCounts.set(
          registerCode,
          (registerCounts.get(registerCode) || 0) + 1
        );
      }
    }

    // 9900: Registros do Arquivo
    for (const [code, count] of Array.from(registerCounts.entries()).sort()) {
      registers.push(
        SpedRegister.create({
          registerCode: '9900',
          fields: [code, count],
        }).value!
      );
    }

    // Adicionar os próprios registros do bloco 9
    registers.push(
      SpedRegister.create({
        registerCode: '9900',
        fields: ['9001', 1],
      }).value!
    );
    registers.push(
      SpedRegister.create({
        registerCode: '9900',
        fields: ['9900', registerCounts.size + 2],
      }).value!
    );
    registers.push(
      SpedRegister.create({
        registerCode: '9900',
        fields: ['9990', 1],
      }).value!
    );
    registers.push(
      SpedRegister.create({
        registerCode: '9900',
        fields: ['9999', 1],
      }).value!
    );

    // 9990: Encerramento do Bloco 9
    registers.push(
      SpedRegister.create({
        registerCode: '9990',
        fields: [registers.length + 2],  // +2 para incluir 9990 e 9999
      }).value!
    );

    // 9999: Encerramento do Arquivo Digital
    const totalLines = blocks.reduce(
      (sum, block) => sum + block.registerCount,
      registers.length + 1  // +1 para incluir o próprio 9999
    );

    registers.push(
      SpedRegister.create({
        registerCode: '9999',
        fields: [totalLines],
      }).value!
    );

    return SpedBlock.create({
      blockId: '9',
      registers,
    }).value!;
  }

  /**
   * Formata data no padrão DDMMAAAA
   */
  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}${month}${year}`;
  }
}

