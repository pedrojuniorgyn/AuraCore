/**
 * NcmCategorizationAdapter - Infrastructure Adapter for NCM categorization
 *
 * Implements INcmCategorizationService by delegating to the legacy
 * ncm-categorization-service.ts. Wraps legacy functions in Result pattern.
 *
 * @see INcmCategorizationService
 * @see ARCH-011: Implements interface from domain/ports/output/
 * @see INFRA-002: Zero business logic in Infrastructure
 * @since E10 - Legacy service wrapping
 */

import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type {
  INcmCategorizationService,
  NcmCategorization,
} from '../../domain/ports/output/INcmCategorizationService';

// Import legacy service functions
import {
  getNCMCategorization as legacyGetNCMCategorization,
  batchGetNCMCategorization as legacyBatchGetNCMCategorization,
  getNCMCategorizationWithFallback as legacyGetNCMCategorizationWithFallback,
} from '@/services/ncm-categorization-service';

@injectable()
export class NcmCategorizationAdapter implements INcmCategorizationService {
  /**
   * Gets categorization for a single NCM code via legacy service
   */
  async getNCMCategorization(
    ncmCode: string,
    organizationId: number,
  ): Promise<Result<NcmCategorization | null, string>> {
    try {
      const result = await legacyGetNCMCategorization(ncmCode, organizationId);
      return Result.ok(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro na categorização NCM ${ncmCode}: ${message}`);
    }
  }

  /**
   * Batch categorization via legacy service
   */
  async batchGetNCMCategorization(
    ncmCodes: string[],
    organizationId: number,
  ): Promise<Result<Map<string, NcmCategorization>, string>> {
    try {
      const result = await legacyBatchGetNCMCategorization(ncmCodes, organizationId);
      return Result.ok(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro na categorização batch NCM: ${message}`);
    }
  }

  /**
   * Categorization with fallback via legacy service
   */
  async getNCMCategorizationWithFallback(
    ncmCode: string,
    organizationId: number,
  ): Promise<Result<NcmCategorization, string>> {
    try {
      const result = await legacyGetNCMCategorizationWithFallback(ncmCode, organizationId);
      return Result.ok(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro na categorização NCM com fallback: ${message}`);
    }
  }
}
