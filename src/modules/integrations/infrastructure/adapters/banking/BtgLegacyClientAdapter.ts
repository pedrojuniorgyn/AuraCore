/**
 * BtgLegacyClientAdapter - Adapter para serviços legados BTG
 *
 * E7-Onda A: Wrapper DDD para código legado
 *
 * Este adapter implementa a interface IBtgClient e delega para os serviços
 * legados em src/services/btg/.
 *
 * IMPORTANTE: Este é um adapter de transição. Quando a migração DDD estiver
 * completa, o código dos serviços BTG será movido para cá diretamente.
 *
 * @see IBtgClient
 */

import { injectable } from '@/shared/infrastructure/di/container';
import type {
  IBtgClient,
  BtgBoletoRequest,
  BtgBoletoResponse,
  BtgPixChargeRequest,
  BtgPixChargeResponse,
  BtgPixPaymentRequest,
  BtgPixPaymentResponse,
  BtgDdaAuthorized,
  BtgDdaDebit,
  BtgDdaDebitsParams,
  BtgHealthStatus,
} from '../../../domain/ports/output/IBtgClient';

// Imports dos serviços legados
// TODO: Após migração completa, mover código para cá
import {
  generateBTGBoleto,
  getBTGBoletoStatus,
  cancelBTGBoleto,
} from '@/services/btg/btg-boleto';
import {
  createBTGPixCharge,
  getBTGPixCharge,
  cancelBTGPixCharge,
} from '@/services/btg/btg-pix';
import {
  getBTGAccessToken,
  invalidateBTGToken,
  isBTGTokenValid,
} from '@/services/btg/btg-auth';
// E8 Fase 1.1 - Novos imports
import {
  createBTGPixPayment,
} from '@/services/btg/btg-payments';
import {
  listBTGDDAs,
  listBTGDDADebits,
} from '@/services/btg/btg-dda';
import {
  btgHealthCheck,
} from '@/services/btg/btg-client';

/**
 * Adapter para serviços BTG Pactual legados
 *
 * Implementa IBtgClient delegando para funções em src/services/btg/
 */
@injectable()
export class BtgLegacyClientAdapter implements IBtgClient {
  // ========== Autenticação ==========

  async getAccessToken(): Promise<string> {
    return getBTGAccessToken();
  }

  invalidateToken(): void {
    invalidateBTGToken();
  }

  isTokenValid(): boolean {
    return isBTGTokenValid();
  }

  // ========== Boletos ==========

  async generateBoleto(data: BtgBoletoRequest): Promise<BtgBoletoResponse> {
    const response = await generateBTGBoleto(data);
    return {
      id: response.id,
      nosso_numero: response.nosso_numero,
      linha_digitavel: response.linha_digitavel,
      codigo_barras: response.codigo_barras,
      pdf_url: response.pdf_url,
      valor: response.valor,
      vencimento: response.vencimento,
      status: response.status,
    };
  }

  async getBoletoStatus(boletoId: string): Promise<BtgBoletoResponse> {
    const response = await getBTGBoletoStatus(boletoId);
    return {
      id: response.id,
      nosso_numero: response.nosso_numero,
      linha_digitavel: response.linha_digitavel,
      codigo_barras: response.codigo_barras,
      pdf_url: response.pdf_url,
      valor: response.valor,
      vencimento: response.vencimento,
      status: response.status,
    };
  }

  async cancelBoleto(boletoId: string): Promise<void> {
    await cancelBTGBoleto(boletoId);
  }

  // ========== Pix ==========

  async createPixCharge(data: BtgPixChargeRequest): Promise<BtgPixChargeResponse> {
    const response = await createBTGPixCharge(data);
    return {
      txid: response.txid,
      location: response.location,
      qrCode: response.qrCode,
      qrCodeImage: response.qrCodeImage,
      valor: response.valor,
      status: response.status,
      expiracao: response.expiracao,
    };
  }

  async getPixChargeStatus(chargeId: string): Promise<BtgPixChargeResponse> {
    const response = await getBTGPixCharge(chargeId);
    return {
      txid: response.txid,
      location: response.location,
      qrCode: response.qrCode,
      qrCodeImage: response.qrCodeImage,
      valor: response.valor,
      status: response.status,
      expiracao: response.expiracao,
    };
  }

  async cancelPixCharge(chargeId: string): Promise<void> {
    await cancelBTGPixCharge(chargeId);
  }

  // ========== Pix Payments (E8 Fase 1.1) ==========

  async createPixPayment(data: BtgPixPaymentRequest): Promise<BtgPixPaymentResponse> {
    const response = await createBTGPixPayment({
      beneficiaryName: data.beneficiaryName,
      beneficiaryDocument: data.beneficiaryDocument,
      pixKey: data.pixKey,
      amount: data.amount,
      description: data.description,
    });
    return {
      id: response.id,
      status: response.status as BtgPixPaymentResponse['status'],
      transactionId: response.transactionId,
      message: response.message,
    };
  }

  // ========== DDA (E8 Fase 1.1) ==========

  async listDdaAuthorized(companyId: string): Promise<BtgDdaAuthorized[]> {
    const response = await listBTGDDAs(companyId);
    return response.map((dda) => ({
      id: dda.id,
      companyId: dda.companyId,
      creditorName: dda.creditorName,
      creditorDocument: dda.creditorDocument,
      status: dda.status,
      createdAt: dda.createdAt,
    }));
  }

  async listDdaDebits(params: BtgDdaDebitsParams): Promise<BtgDdaDebit[]> {
    const response = await listBTGDDADebits(
      params.companyId,
      params.ddaId,
      {
        startDate: params.startDate,
        endDate: params.endDate,
        status: params.status,
      }
    );
    return response.map((debit) => ({
      id: debit.id,
      barcode: debit.barcode,
      digitableLine: debit.digitableLine,
      amount: debit.amount,
      dueDate: debit.dueDate,
      creditorName: debit.creditorName,
      creditorDocument: debit.creditorDocument,
      status: debit.status,
      description: debit.description,
    }));
  }

  // ========== Health Check (E8 Fase 1.1) ==========

  async healthCheck(): Promise<BtgHealthStatus> {
    const isHealthy = await btgHealthCheck();
    return {
      healthy: isHealthy,
      message: isHealthy ? 'BTG API está acessível' : 'BTG API não está acessível',
      checkedAt: new Date(),
    };
  }
}
