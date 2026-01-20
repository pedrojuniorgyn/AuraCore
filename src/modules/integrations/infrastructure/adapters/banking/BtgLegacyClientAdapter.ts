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
}
