/**
 * IBtgClient - Interface para cliente BTG Pactual
 *
 * E7-Onda A: Abstração dos serviços legados btg-boleto, btg-pix, btg-auth
 * E8 Fase 1.1: Expandido com DDA, Pix Payment e Health Check
 *
 * Esta interface unifica as operações BTG em uma única abstração,
 * permitindo que a implementação real ou mock seja injetada via DI.
 *
 * O BtgBankingAdapter usa IBtgClient internamente.
 */

// ============================================================================
// BOLETO TYPES
// ============================================================================

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

// ============================================================================
// PIX CHARGE TYPES (Cobrança - receber dinheiro)
// ============================================================================

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

// ============================================================================
// PIX PAYMENT TYPES (Pagamento - enviar dinheiro) - E8 Fase 1.1
// ============================================================================

/**
 * Request para pagamento Pix
 */
export interface BtgPixPaymentRequest {
  beneficiaryName: string;
  beneficiaryDocument: string;
  pixKey: string;
  amount: number;
  description?: string;
}

/**
 * Response de pagamento Pix BTG
 */
export interface BtgPixPaymentResponse {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  transactionId?: string;
  message: string;
}

// ============================================================================
// DDA TYPES (Débito Direto Autorizado) - E8 Fase 1.1
// ============================================================================

/**
 * DDA autorizado (representante/empresa autorizada a receber DDAs)
 */
export interface BtgDdaAuthorized {
  id: string;
  companyId: string;
  creditorName: string;
  creditorDocument: string;
  status: string;
  createdAt: string;
}

/**
 * Débito DDA (boleto a pagar)
 */
export interface BtgDdaDebit {
  id: string;
  barcode: string;
  digitableLine: string;
  amount: number;
  dueDate: string;
  creditorName: string;
  creditorDocument: string;
  status: string;
  description?: string;
}

/**
 * Parâmetros para listar débitos DDA
 */
export interface BtgDdaDebitsParams {
  companyId: string;
  ddaId: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  status?: string;
}

// ============================================================================
// HEALTH CHECK TYPES - E8 Fase 1.1
// ============================================================================

/**
 * Status de saúde da integração BTG
 */
export interface BtgHealthStatus {
  healthy: boolean;
  message: string;
  checkedAt: Date;
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

  // ========== Pix Payments (E8 Fase 1.1) ==========

  /**
   * Realiza pagamento via Pix (enviar dinheiro)
   *
   * Diferente de createPixCharge (que recebe), este método PAGA.
   *
   * @param data Dados do pagamento
   * @returns Confirmação do pagamento
   */
  createPixPayment(data: BtgPixPaymentRequest): Promise<BtgPixPaymentResponse>;

  // ========== DDA (E8 Fase 1.1) ==========

  /**
   * Lista DDAs autorizados para a empresa
   *
   * @param companyId ID da empresa no BTG
   * @returns Lista de DDAs autorizados
   */
  listDdaAuthorized(companyId: string): Promise<BtgDdaAuthorized[]>;

  /**
   * Lista débitos (boletos) de um DDA específico
   *
   * @param params Parâmetros de busca
   * @returns Lista de débitos DDA
   */
  listDdaDebits(params: BtgDdaDebitsParams): Promise<BtgDdaDebit[]>;

  // ========== Health Check (E8 Fase 1.1) ==========

  /**
   * Verifica saúde da conexão com BTG
   *
   * Testa autenticação e conectividade básica.
   *
   * @returns Status de saúde
   */
  healthCheck(): Promise<BtgHealthStatus>;
}
