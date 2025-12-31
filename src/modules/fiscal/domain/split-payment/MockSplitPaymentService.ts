import { Money, Result } from '@/shared/domain';
import { ISplitPaymentService } from './ISplitPaymentService';
import {
  TaxBreakdown,
  SplitInstruction,
  PaymentInstruction,
  OperationType,
  SplitRequirementResult,
  SplitPaymentSummary,
  SplitRecipient,
  SplitPaymentStatus,
  TributoSplit,
} from './SplitPaymentTypes';

/**
 * MockSplitPaymentService: Implementação mock do Split Payment Service
 * 
 * E7.4.1 Semana 10 - Integração Final + E2E Tests
 * 
 * Contexto: Mock para desenvolvimento e testes
 * Em 2027: substituir por integração real com instituições financeiras
 * 
 * Referência: EC 132/2023, LC 214/2025
 */
export class MockSplitPaymentService implements ISplitPaymentService {
  private static instance: MockSplitPaymentService;

  private constructor() {
    // Singleton
  }

  /**
   * Obter instância singleton
   */
  static getInstance(): MockSplitPaymentService {
    if (!MockSplitPaymentService.instance) {
      MockSplitPaymentService.instance = new MockSplitPaymentService();
    }
    return MockSplitPaymentService.instance;
  }

  /**
   * Calcula a divisão do pagamento entre tributos (mock)
   */
  async calculateSplit(
    totalAmount: Money,
    taxBreakdown: TaxBreakdown,
    reference: string,
    dueDate: Date,
    uf: string,
    municipio: string
  ): Promise<SplitInstruction[]> {
    const instructions: SplitInstruction[] = [];

    // Simular delay de processamento
    await this.simulateNetworkDelay();

    // Split IBS UF
    if (taxBreakdown.ibsUf.amount > 0) {
      instructions.push({
        recipient: this.getMockRecipient('ESTADUAL', uf),
        amount: taxBreakdown.ibsUf,
        tributo: 'IBS_UF',
        reference,
        dueDate,
        barcode: this.generateMockBarcode('IBS_UF', uf),
        digitableLine: this.generateMockDigitableLine('IBS_UF', uf),
      });
    }

    // Split IBS Municipal
    if (taxBreakdown.ibsMun.amount > 0) {
      instructions.push({
        recipient: this.getMockRecipient('MUNICIPAL', municipio),
        amount: taxBreakdown.ibsMun,
        tributo: 'IBS_MUN',
        reference,
        dueDate,
        barcode: this.generateMockBarcode('IBS_MUN', municipio),
        digitableLine: this.generateMockDigitableLine('IBS_MUN', municipio),
      });
    }

    // Split CBS
    if (taxBreakdown.cbs.amount > 0) {
      instructions.push({
        recipient: this.getMockRecipient('FEDERAL', 'BR'),
        amount: taxBreakdown.cbs,
        tributo: 'CBS',
        reference,
        dueDate,
        barcode: this.generateMockBarcode('CBS', 'BR'),
        digitableLine: this.generateMockDigitableLine('CBS', 'BR'),
      });
    }

    // Split IS (se houver)
    if (taxBreakdown.is && taxBreakdown.is.amount > 0) {
      instructions.push({
        recipient: this.getMockRecipient('FEDERAL', 'BR'),
        amount: taxBreakdown.is,
        tributo: 'IS',
        reference,
        dueDate,
        barcode: this.generateMockBarcode('IS', 'BR'),
        digitableLine: this.generateMockDigitableLine('IS', 'BR'),
      });
    }

    return instructions;
  }

  /**
   * Valida se split payment é obrigatório
   */
  isSplitRequired(
    operationDate: Date,
    operationType: OperationType,
    totalAmount: Money
  ): SplitRequirementResult {
    const year = operationDate.getFullYear();

    // Split obrigatório a partir de 2027
    if (year < 2027) {
      return {
        required: false,
        reason: 'Split Payment é obrigatório apenas a partir de 2027',
      };
    }

    // Split obrigatório para operações acima de R$ 5.000
    // (valor fictício para exemplo - na prática será definido pela legislação)
    const minimumAmount = 5000;
    if (totalAmount.amount < minimumAmount) {
      return {
        required: false,
        reason: `Split Payment é obrigatório apenas para valores acima de R$ ${minimumAmount.toFixed(2)}`,
      };
    }

    return {
      required: true,
      reason: 'Split Payment obrigatório conforme LC 214/2025',
      mandatoryFrom: new Date('2027-01-01'),
    };
  }

  /**
   * Gera instruções de pagamento para instituição financeira
   */
  async generatePaymentInstructions(split: SplitInstruction[]): Promise<PaymentInstruction[]> {
    await this.simulateNetworkDelay();

    return split.map(instruction => ({
      pixKey: instruction.recipient.account?.pixKey,
      bankCode: instruction.recipient.account?.bankCode,
      agency: instruction.recipient.account?.agency,
      account: instruction.recipient.account?.account,
      amount: instruction.amount,
      reference: instruction.reference,
      dueDate: instruction.dueDate,
      tributo: instruction.tributo,
      barcode: instruction.barcode,
    }));
  }

  /**
   * Valida se as instruções de split estão corretas
   */
  validateSplit(split: SplitInstruction[], totalAmount: Money): boolean {
    // Calcular soma dos splits
    const splitSum = split.reduce((sum, instruction) => sum + instruction.amount.amount, 0);

    // Validar se soma dos splits não excede o total (com tolerância de 0.01)
    return splitSum <= totalAmount.amount + 0.01;
  }

  /**
   * Gera resumo do split payment
   */
  generateSummary(split: SplitInstruction[]): SplitPaymentSummary {
    const totalAmountResult = Money.create(
      split.reduce((sum, s) => sum + s.amount.amount, 0),
      'BRL'
    );
    
    // Verificação de Result (não deve falhar com valores válidos)
    if (!Result.isOk(totalAmountResult)) {
      throw new Error(`Failed to create totalAmount: ${totalAmountResult.error}`);
    }
    const totalAmount = totalAmountResult.value;

    const breakdownByTributo = new Map<TributoSplit, Money>();
    const breakdownByRecipient = new Map<string, Money>();

    for (const instruction of split) {
      // Por tributo
      const currentTributo = breakdownByTributo.get(instruction.tributo);
      if (currentTributo) {
        const tributoMoneyResult = Money.create(
          currentTributo.amount + instruction.amount.amount,
          'BRL'
        );
        if (!Result.isOk(tributoMoneyResult)) {
          throw new Error(`Failed to create tributo Money: ${tributoMoneyResult.error}`);
        }
        breakdownByTributo.set(instruction.tributo, tributoMoneyResult.value);
      } else {
        breakdownByTributo.set(instruction.tributo, instruction.amount);
      }

      // Por destinatário
      const recipientKey = `${instruction.recipient.type}-${instruction.recipient.code}`;
      const currentRecipient = breakdownByRecipient.get(recipientKey);
      if (currentRecipient) {
        const recipientMoneyResult = Money.create(
          currentRecipient.amount + instruction.amount.amount,
          'BRL'
        );
        if (!Result.isOk(recipientMoneyResult)) {
          throw new Error(`Failed to create recipient Money: ${recipientMoneyResult.error}`);
        }
        breakdownByRecipient.set(recipientKey, recipientMoneyResult.value);
      } else {
        breakdownByRecipient.set(recipientKey, instruction.amount);
      }
    }

    return {
      totalAmount,
      totalInstructions: split.length,
      breakdownByTributo,
      breakdownByRecipient,
      status: 'PENDING' as SplitPaymentStatus,
    };
  }

  /**
   * Obtém destinatários cadastrados (mock)
   */
  async getRecipients(uf?: string, municipio?: string): Promise<Array<{
    type: string;
    code: string;
    name: string;
    cnpj: string;
    pixKey?: string;
  }>> {
    await this.simulateNetworkDelay();

    const recipients = [];

    if (uf) {
      recipients.push({
        type: 'ESTADUAL',
        code: uf,
        name: `Secretaria da Fazenda do Estado de ${uf}`,
        cnpj: this.generateMockCnpj(uf),
        pixKey: `${uf.toLowerCase()}@sefaz.gov.br`,
      });
    }

    if (municipio) {
      recipients.push({
        type: 'MUNICIPAL',
        code: municipio,
        name: `Secretaria Municipal da Fazenda - ${municipio}`,
        cnpj: this.generateMockCnpj(municipio),
        pixKey: `${municipio}@prefeitura.gov.br`,
      });
    }

    // Sempre incluir Federal (CBS)
    recipients.push({
      type: 'FEDERAL',
      code: 'BR',
      name: 'Receita Federal do Brasil',
      cnpj: '00000000000191',
      pixKey: 'cbs@receita.fazenda.gov.br',
    });

    return recipients;
  }

  /**
   * Gera destinatário mockado
   */
  private getMockRecipient(type: 'FEDERAL' | 'ESTADUAL' | 'MUNICIPAL', code: string): SplitRecipient {
    const names = {
      FEDERAL: 'Receita Federal do Brasil',
      ESTADUAL: `Secretaria da Fazenda do Estado de ${code}`,
      MUNICIPAL: `Secretaria Municipal da Fazenda - ${code}`,
    };

    return {
      type,
      code,
      name: names[type],
      cnpj: this.generateMockCnpj(code),
      account: {
        bankCode: '001', // Banco do Brasil (mock)
        agency: '0001',
        account: `${code}001`,
        accountType: 'CHECKING',
        pixKey: type === 'FEDERAL' ? 'cbs@receita.fazenda.gov.br' : `${code.toLowerCase()}@sefaz.gov.br`,
      },
    };
  }

  /**
   * Gera CNPJ mockado
   */
  private generateMockCnpj(code: string): string {
    // Mock: usar hash do código para gerar CNPJ fictício
    const hash = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const cnpjBase = hash.toString().padStart(12, '0').slice(-12);
    return `${cnpjBase}01`; // Adicionar dígitos verificadores fictícios
  }

  /**
   * Gera código de barras mockado
   */
  private generateMockBarcode(tributo: string, code: string): string {
    const timestamp = Date.now().toString().slice(-10);
    const tributoCode = tributo.replace('_', '').slice(0, 3);
    return `${tributoCode}${code}${timestamp}`.padEnd(48, '0');
  }

  /**
   * Gera linha digitável mockada
   */
  private generateMockDigitableLine(tributo: string, code: string): string {
    const barcode = this.generateMockBarcode(tributo, code);
    // Simplificação: linha digitável baseada no código de barras
    return barcode.match(/.{1,5}/g)?.join('.') || barcode;
  }

  /**
   * Simula delay de rede (mock)
   */
  private async simulateNetworkDelay(): Promise<void> {
    const delay = Math.random() * 100 + 50; // 50-150ms
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

