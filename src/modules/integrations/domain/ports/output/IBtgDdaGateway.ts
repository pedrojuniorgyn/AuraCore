/**
 * IBtgDdaGateway - Port for BTG DDA (Débito Direto Autorizado) operations
 *
 * Abstraction for the legacy BtgDdaService that manages DDA boletos:
 * - Fetching boletos from BTG Pactual API
 * - Syncing boletos to local inbox
 * - Smart matching boletos to existing payables
 * - Creating payables from DDA boletos
 *
 * @module integrations/domain/ports/output
 * @see ARCH-011: Repositories/Gateways implement interface from domain/ports/output/
 * @see E7-Onda A: DDD Migration of btg-dda-service.ts
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Boleto DDA retrieved from BTG Pactual
 */
export interface DdaBoleto {
  /** External identifier from BTG */
  externalId: string;
  /** Beneficiary (creditor) name */
  beneficiaryName: string;
  /** Beneficiary CNPJ/CPF */
  beneficiaryDocument: string;
  /** Amount in BRL */
  amount: number;
  /** Due date */
  dueDate: Date;
  /** Issue date (optional) */
  issueDate?: Date;
  /** Barcode (44 digits) */
  barcode: string;
  /** Digitable line */
  digitableLine?: string;
}

/**
 * Result of the smart matching algorithm
 */
export interface SmartMatchResult {
  /** Whether a match was found with sufficient confidence */
  matched: boolean;
  /** ID of the matched payable (if matched) */
  payableId?: number;
  /** Confidence score (0-100) */
  score: number;
  /** Human-readable reason for the match/non-match */
  reason: string;
}

// ============================================================================
// PORT INTERFACE
// ============================================================================

/**
 * Port: BTG DDA Gateway
 *
 * Manages DDA (Débito Direto Autorizado) operations with BTG Pactual bank.
 * DDA is a system that allows companies to receive boletos electronically
 * before they are sent physically.
 *
 * RULES:
 * - All operations require organizationId and bankAccountId context
 * - mTLS certificates are required for BTG API communication
 * - Smart matching uses value, due date, and CNPJ proximity scoring
 */
export interface IBtgDdaGateway {
  /**
   * Fetches DDA boletos from BTG Pactual API
   *
   * Requires valid mTLS certificates configured for the organization.
   *
   * @param organizationId - Organization ID
   * @param bankAccountId - Bank account ID
   * @returns List of boletos retrieved from BTG
   * @throws Error if certificates are missing or API fails
   */
  fetchDdaBoletos(
    organizationId: number,
    bankAccountId: number,
  ): Promise<DdaBoleto[]>;

  /**
   * Synchronizes DDA boletos with local inbox
   *
   * Fetches new boletos from BTG, inserts them into the DDA inbox,
   * and attempts automatic matching with existing payables.
   *
   * @param organizationId - Organization ID
   * @param bankAccountId - Bank account ID
   * @returns Number of newly imported boletos
   */
  syncDdaInbox(
    organizationId: number,
    bankAccountId: number,
  ): Promise<number>;

  /**
   * Links a DDA boleto to an existing payable (manual match)
   *
   * Updates both the DDA record (status → LINKED) and the payable
   * (barcode + document number).
   *
   * @param ddaId - DDA inbox record ID
   * @param payableId - Account payable ID to link
   * @param organizationId - Organization ID for security check
   */
  linkDdaToPayable(
    ddaId: number,
    payableId: string, // UUID (char(36)) — payable ID agora é UUID
    organizationId: number,
  ): Promise<void>;

  /**
   * Creates a new Account Payable from a DDA boleto
   *
   * Used when no existing payable matches the boleto. Creates a new payable
   * and links it to the DDA record.
   *
   * @param ddaId - DDA inbox record ID
   * @param organizationId - Organization ID
   * @param bankAccountId - Bank account ID (to derive branchId)
   * @returns ID of the newly created payable
   */
  createPayableFromDda(
    ddaId: number,
    organizationId: number,
    bankAccountId: number,
  ): Promise<string>; // Retorna UUID do payable criado
}
