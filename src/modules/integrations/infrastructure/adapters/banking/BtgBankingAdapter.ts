import { injectable, inject } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';
import { BankSlip } from '../../../domain/value-objects/BankSlip';
import { PixCharge } from '../../../domain/value-objects/PixCharge';
import type {
  IBankingGateway,
  CreateBankSlipRequest,
  BankSlipResponse,
  CreatePixChargeRequest,
  PixChargeResponse,
  PaymentRequest,
  PaymentResponse,
  DdaDebit,
} from '../../../domain/ports/output/IBankingGateway';
import type {
  IBtgClient,
  BtgBoletoResponse as BtgBoletoResponseType,
  BtgPixChargeResponse as BtgPixChargeResponseType,
} from '../../../domain/ports/output/IBtgClient';

/**
 * BtgBankingAdapter - Implementação real de operações bancárias
 *
 * E7.9 Integrações - Semana 2
 * E7-Onda A: Refatorado para usar IBtgClient via DI
 *
 * Delega para IBtgClient (implementado por BtgLegacyClientAdapter) que:
 * - Gerencia autenticação OAuth2
 * - Gerencia operações de boleto
 * - Gerencia operações de Pix
 */
@injectable()
export class BtgBankingAdapter implements IBankingGateway {
  constructor(
    @inject(TOKENS.BtgClient)
    private readonly btgClient: IBtgClient
  ) {}

  async createBankSlip(request: CreateBankSlipRequest): Promise<Result<BankSlipResponse, string>> {
    try {
      // Garantir autenticação
      await this.ensureAuthenticated();

      // Mapear para formato BTG
      const boletoRequest = {
        payerName: request.recipientName,
        payerDocument: request.recipientDocument,
        valor: request.amount.amount,
        dataVencimento: request.dueDate.toISOString().split('T')[0], // YYYY-MM-DD
        descricao: request.description,
      };

      // Chamar cliente BTG via DI
      const response: BtgBoletoResponseType = await this.btgClient.generateBoleto(boletoRequest);

      // Mapear resposta para Value Object
      const amountResult = Money.create(response.valor, 'BRL');
      if (!Result.isOk(amountResult)) {
        return Result.fail('Invalid amount in BTG response');
      }

      return Result.ok({
        id: response.id,
        barcode: response.codigo_barras,
        digitableLine: response.linha_digitavel,
        dueDate: new Date(response.vencimento),
        amount: amountResult.value,
        status: this.mapBoletoStatus(response.status),
        pdfUrl: response.pdf_url,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`BANKING_SLIP_CREATION_FAILED: ${message}`);
    }
  }

  async cancelBankSlip(slipId: string): Promise<Result<void, string>> {
    try {
      await this.ensureAuthenticated();
      await this.btgClient.cancelBoleto(slipId);
      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`BANKING_SLIP_CANCELLATION_FAILED: ${message}`);
    }
  }

  async queryBankSlipStatus(slipId: string): Promise<Result<BankSlipResponse, string>> {
    try {
      await this.ensureAuthenticated();
      const response: BtgBoletoResponseType = await this.btgClient.getBoletoStatus(slipId);

      const amountResult = Money.create(response.valor, 'BRL');
      if (!Result.isOk(amountResult)) {
        return Result.fail('Invalid amount in BTG response');
      }

      return Result.ok({
        id: response.id,
        barcode: response.codigo_barras,
        digitableLine: response.linha_digitavel,
        dueDate: new Date(response.vencimento),
        amount: amountResult.value,
        status: this.mapBoletoStatus(response.status),
        pdfUrl: response.pdf_url,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`BANKING_SLIP_QUERY_FAILED: ${message}`);
    }
  }

  async createPixCharge(request: CreatePixChargeRequest): Promise<Result<PixChargeResponse, string>> {
    try {
      await this.ensureAuthenticated();

      // Mapear para formato BTG
      const pixRequest = {
        valor: request.amount.amount,
        chavePix: process.env.BTG_PIX_KEY || '', // Chave Pix da empresa
        payerName: request.recipientName,
        payerDocument: request.recipientDocument,
        expiracao: request.expirationMinutes ?? 30, // Minutos
        descricao: request.description,
      };

      // Chamar cliente BTG via DI
      const response: BtgPixChargeResponseType = await this.btgClient.createPixCharge(pixRequest);

      // Calcular expiração
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + (request.expirationMinutes ?? 30));

      // Mapear resposta
      const amountResult = Money.create(response.valor, 'BRL');
      if (!Result.isOk(amountResult)) {
        return Result.fail('Invalid amount in BTG response');
      }

      return Result.ok({
        txId: response.txid,
        qrCode: response.qrCode,
        qrCodeImage: response.qrCodeImage,
        amount: amountResult.value,
        expiresAt,
        status: this.mapPixStatus(response.status),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`BANKING_PIX_CREATION_FAILED: ${message}`);
    }
  }

  async queryPixChargeStatus(txId: string): Promise<Result<PixChargeResponse, string>> {
    try {
      await this.ensureAuthenticated();
      const response: BtgPixChargeResponseType = await this.btgClient.getPixChargeStatus(txId);

      const amountResult = Money.create(response.valor, 'BRL');
      if (!Result.isOk(amountResult)) {
        return Result.fail('Invalid amount in BTG response');
      }

      return Result.ok({
        txId: response.txid,
        qrCode: response.qrCode,
        qrCodeImage: '', // BTG pode não retornar imagem na consulta
        amount: amountResult.value,
        expiresAt: new Date(response.expiracao),
        status: this.mapPixStatus(response.status),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`BANKING_PIX_QUERY_FAILED: ${message}`);
    }
  }

  async executePayment(request: PaymentRequest): Promise<Result<PaymentResponse, string>> {
    // TODO: E7.9 Semana 2 - Implementar com btg-payments.ts
    return Result.fail('BANKING_PAYMENT_NOT_IMPLEMENTED: Payment execution not yet implemented');
  }

  async queryPaymentStatus(paymentId: string): Promise<Result<PaymentResponse, string>> {
    // TODO: E7.9 Semana 2 - Implementar com btg-payments.ts
    return Result.fail('BANKING_PAYMENT_NOT_IMPLEMENTED: Payment query not yet implemented');
  }

  async queryDdaDebits(cnpj: string): Promise<Result<DdaDebit[], string>> {
    // TODO: E7.9 Semana 2 - Implementar com btg-dda.ts
    return Result.fail('BANKING_DDA_NOT_IMPLEMENTED: DDA query not yet implemented');
  }

  async authorizeDdaDebit(debitId: string): Promise<Result<void, string>> {
    // TODO: E7.9 Semana 2 - Implementar com btg-dda.ts
    return Result.fail('BANKING_DDA_NOT_IMPLEMENTED: DDA authorization not yet implemented');
  }

  async queryBalance(accountId: string): Promise<Result<Money, string>> {
    // TODO: E7.9 Semana 2 - Implementar consulta de saldo
    return Result.fail('BANKING_BALANCE_NOT_IMPLEMENTED: Balance query not yet implemented');
  }

  // ========== Métodos Auxiliares ==========

  private async ensureAuthenticated(): Promise<void> {
    // Garante que o token OAuth2 está válido
    // BtgClient já gerencia cache e refresh automático
    await this.btgClient.getAccessToken();
  }

  private mapBoletoStatus(btgStatus: string): 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' {
    const status = btgStatus.toUpperCase();
    
    if (status.includes('PAGO') || status.includes('PAID')) {
      return 'PAID';
    }
    if (status.includes('CANCEL') || status.includes('BAIXADO')) {
      return 'CANCELLED';
    }
    if (status.includes('VENCIDO') || status.includes('EXPIRED')) {
      return 'EXPIRED';
    }
    
    return 'PENDING';
  }

  private mapPixStatus(btgStatus: string): 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED' {
    const status = btgStatus.toUpperCase();
    
    if (status.includes('COMPLETED') || status.includes('PAGO')) {
      return 'COMPLETED';
    }
    if (status.includes('CANCEL')) {
      return 'CANCELLED';
    }
    if (status.includes('EXPIRED') || status.includes('VENCIDO')) {
      return 'EXPIRED';
    }
    
    return 'ACTIVE';
  }
}
