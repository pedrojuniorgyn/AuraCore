/**
 * INcmCategorizationService - Port for NCM automatic categorization
 *
 * Abstraction for categorizing fiscal items based on their NCM code
 * (Nomenclatura Comum do Mercosul). Maps NCM codes to financial categories
 * and chart of accounts entries.
 *
 * @module fiscal/domain/ports/output
 * @see ARCH-011: Repositories/Gateways implement interface from domain/ports/output/
 * @see E7 DDD Migration of ncm-categorization-service.ts
 */

import type { Result } from '@/shared/domain';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Categorization result for an NCM code
 */
export interface NcmCategorization {
  /** Financial category ID (null if not categorized) */
  categoryId: number | null;
  /** Financial category name */
  categoryName: string | null;
  /** Chart of accounts ID (null if not mapped) */
  chartAccountId: number | null;
  /** Chart of accounts code (e.g., "3.1.01.001") */
  chartAccountCode: string | null;
  /** Chart of accounts name */
  chartAccountName: string | null;
  /** Description / notes */
  description: string | null;
}

// ============================================================================
// PORT INTERFACE
// ============================================================================

/**
 * Port: NCM Categorization Service
 *
 * Categorizes products/items based on their NCM code (8 digits).
 * Used primarily during NFe import to automatically classify items
 * into financial categories and chart of accounts.
 *
 * RULES:
 * - NCM codes are 8 digits (e.g., "84719012")
 * - Categorization is per-organization (each org has its own NCM mapping)
 * - Fallback returns a generic "Outros" category when no specific mapping exists
 */
export interface INcmCategorizationService {
  /**
   * Gets categorization for a single NCM code
   *
   * @param ncmCode - 8-digit NCM code
   * @param organizationId - Organization ID
   * @returns Categorization or null if NCM not mapped
   */
  getNCMCategorization(
    ncmCode: string,
    organizationId: number,
  ): Promise<Result<NcmCategorization | null, string>>;

  /**
   * Gets categorization for multiple NCM codes at once (batch)
   *
   * More efficient than calling getNCMCategorization multiple times
   * as it uses a single database query.
   *
   * @param ncmCodes - Array of 8-digit NCM codes
   * @param organizationId - Organization ID
   * @returns Map of NCM code to categorization
   */
  batchGetNCMCategorization(
    ncmCodes: string[],
    organizationId: number,
  ): Promise<Result<Map<string, NcmCategorization>, string>>;

  /**
   * Gets categorization with fallback to a generic category
   *
   * If no specific mapping exists for the NCM, returns a fallback
   * category (typically "Outros" or "Diversos"). Always returns
   * a categorization (never null).
   *
   * @param ncmCode - 8-digit NCM code
   * @param organizationId - Organization ID
   * @returns Categorization (always returns a result, never null)
   */
  getNCMCategorizationWithFallback(
    ncmCode: string,
    organizationId: number,
  ): Promise<Result<NcmCategorization, string>>;
}
