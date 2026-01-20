/**
 * IBtgClient - Interface para cliente BTG Pactual
 *
 * E7-Onda A: Abstração dos serviços legados btg-boleto, btg-pix, btg-auth
 *
 * Esta interface unifica as operações BTG em uma única abstração,
 * permitindo que a implementação real ou mock seja injetada via DI.
 *
 * O BtgBankingAdapter usa IBtgClient internamente.
 */

/**
 * Request para geração de boleto
 */
export interface BtgBoletoRequest {
  payerName: string;
  payerDocument: string;
  payerEmail?: string;
  payerPhone?: string;
  valor: number;
  dataVencimento: string; // YYYY-MM-DD
  nossoNumero?: string;
  seuNumero?: string;
  descricao?: string;
  instrucoes?: string;
  valorMulta?: number;
  valorJuros?: number;
  valorDesconto?: number;
  diasDesconto?: number;
}

/**
 * Response de boleto BTG
 */
export interface BtgBoletoResponse {
  id: string;
  nosso_numero: string;
  linha_digitavel: string;
  codigo_barras: string;
  pdf_url: string;
  valor: number;
  vencimento: string;
  status: string;
}

/**
 * Request para criação de cobrança Pix
 */
export interface BtgPixChargeRequest {
  valor: number;
  chavePix: string;
  payerName?: string;
  payerDocument?: string;
  expiracao?: number;
  descricao?: string;
}

/**
 * Response de cobrança Pix BTG
 */
export interface BtgPixChargeResponse {
  txid: string;
  location: string;
  qrCode: string;
  qrCodeImage: string;
  valor: number;
  status: string;
  expiracao: string;
}

/**
 * Port: Cliente BTG Pactual
 *
 * REGRAS CRÍTICAS:
 * - Esta interface é implementada por BtgLegacyClientAdapter (produção) e MockBtgClient (testes)
 * - Autenticação OAuth2 é gerenciada internamente (token cache)
 * - Timeout padrão: 30 segundos
 */
export interface IBtgClient {
  // ========== Autenticação ==========

  /**
   * Obtém token de acesso OAuth2 válido
   * O token é automaticamente cacheado e renovado quando necessário
   *
   * @returns Token de acesso
   * @throws Error se autenticação falhar
   */
  getAccessToken(): Promise<string>;

  /**
   * Invalida cache de token (força renovação na próxima chamada)
   */
  invalidateToken(): void;

  /**
   * Verifica se token atual está válido
   */
  isTokenValid(): boolean;

  // ========== Boletos ==========

  /**
   * Gera boleto via BTG Pactual
   *
   * @param data Dados do boleto
   * @returns Boleto gerado com código de barras e PDF
   */
  generateBoleto(data: BtgBoletoRequest): Promise<BtgBoletoResponse>;

  /**
   * Consulta status de boleto
   *
   * @param boletoId ID do boleto
   * @returns Status atual do boleto
   */
  getBoletoStatus(boletoId: string): Promise<BtgBoletoResponse>;

  /**
   * Cancela boleto
   *
   * @param boletoId ID do boleto
   */
  cancelBoleto(boletoId: string): Promise<void>;

  // ========== Pix ==========

  /**
   * Cria cobrança Pix
   *
   * @param data Dados da cobrança
   * @returns Cobrança criada com QR Code
   */
  createPixCharge(data: BtgPixChargeRequest): Promise<BtgPixChargeResponse>;

  /**
   * Consulta status de cobrança Pix
   *
   * @param chargeId ID da cobrança (txid)
   * @returns Status atual da cobrança
   */
  getPixChargeStatus(chargeId: string): Promise<BtgPixChargeResponse>;

  /**
   * Cancela cobrança Pix
   *
   * @param chargeId ID da cobrança (txid)
   */
  cancelPixCharge(chargeId: string): Promise<void>;
}
