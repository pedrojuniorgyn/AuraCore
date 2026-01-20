/**
 * AuthorizeCteUseCase - Application Command
 *
 * Caso de uso para autorização de CTe na SEFAZ.
 * Orquestra busca de dados, construção de XML, assinatura e transmissão.
 *
 * @module fiscal/application/use-cases
 * @see ARCH-010: Use Cases implementam Input Ports
 * @see E8 Fase 3: Use Cases Orquestradores
 */

import { inject, injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { ISefazGateway } from '@/modules/integrations/domain/ports/output/ISefazGateway';
import type {
  IAuthorizeCteUseCase,
  AuthorizeCteInput,
  AuthorizeCteOutput,
} from '../../domain/ports/input/IAuthorizeCteUseCase';

// Database access (needed until full DDD migration with repositories)
import { db } from '@/lib/db';
import { cteHeader, fiscalSettings } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// Legacy services (TODO E8 Fase 4: Migrate to Domain Services)
// These still perform DB lookups internally
import { buildCteXml } from '@/services/fiscal/cte-builder';
import { createXmlSignerFromDb } from '@/services/fiscal/xml-signer';

// ============================================================================
// USE CASE
// ============================================================================

/**
 * Caso de uso para autorização de CTe na SEFAZ.
 *
 * Fluxo:
 * 1. Buscar CTe do banco
 * 2. Validar estado (DRAFT/SIGNED only)
 * 3. Buscar configurações fiscais
 * 4. Gerar XML (legacy service)
 * 5. Assinar XML (legacy service)
 * 6. Transmitir via ISefazGateway
 * 7. Atualizar CTe com resultado
 *
 * Regras:
 * - USE-CASE-001: Commands em application/commands ou use-cases
 * - USE-CASE-003: Implementa interface de domain/ports/input/
 * - USE-CASE-004: Método único: execute()
 * - USE-CASE-006: Retorna Promise<Result<Output, string>>
 * - USE-CASE-010: Usa DI para dependencies
 * - USE-CASE-011: @injectable() decorator
 *
 * TODO (E8 Fase 4): Substituir serviços legacy por:
 *   - ICteRepository para buscar CTe
 *   - CteBuilderService.build() (Domain Service)
 *   - XmlSignerService (novo Domain Service)
 */
@injectable()
export class AuthorizeCteUseCase implements IAuthorizeCteUseCase {
  constructor(
    @inject(TOKENS.SefazGateway) private readonly sefazGateway: ISefazGateway
  ) {}

  async execute(input: AuthorizeCteInput): Promise<Result<AuthorizeCteOutput, string>> {
    try {
      // 1. Validar input
      const validationResult = this.validateInput(input);
      if (Result.isFail(validationResult)) {
        return validationResult;
      }

      // 2. Buscar CTe
      const [cte] = await db
        .select()
        .from(cteHeader)
        .where(eq(cteHeader.id, input.cteId));

      if (!cte) {
        return Result.fail(`CTe #${input.cteId} não encontrado`);
      }

      // 3. Validar estado
      if (cte.status === 'AUTHORIZED') {
        return Result.fail('CTe já está autorizado');
      }
      if (cte.status === 'CANCELLED') {
        return Result.fail('CTe está cancelado, não pode ser autorizado');
      }
      if (!cte.pickupOrderId) {
        return Result.fail('CTe sem ordem de coleta vinculada');
      }

      // 4. Buscar configurações fiscais
      const [settings] = await db
        .select()
        .from(fiscalSettings)
        .where(
          and(
            eq(fiscalSettings.organizationId, input.organizationId),
            eq(fiscalSettings.branchId, input.branchId)
          )
        );

      const environment = settings?.cteEnvironment === 'production' ? 'production' : 'homologation';

      // 5. Gerar XML (legacy - busca dados do DB)
      console.log(`🔨 [AuthorizeCteUseCase] Gerando XML do CTe #${input.cteId}...`);
      const xmlSemAssinatura = await buildCteXml({
        pickupOrderId: cte.pickupOrderId,
        organizationId: input.organizationId,
      });

      // 6. Assinar XML (legacy)
      console.log('🔐 [AuthorizeCteUseCase] Assinando XML...');
      const signer = await createXmlSignerFromDb(input.organizationId);

      const certInfo = signer.verifyCertificate();
      if (!certInfo.valid) {
        return Result.fail('Certificado digital inválido ou vencido');
      }

      const xmlAssinado = signer.signCteXml(xmlSemAssinatura);
      console.log('✅ [AuthorizeCteUseCase] XML assinado com sucesso');

      // 7. Extrair UF do emitente do XML
      const ufMatch = xmlSemAssinatura.match(/<enderEmit>[\s\S]*?<UF>(.*?)<\/UF>/);
      const uf = ufMatch?.[1] || 'SP';

      // 8. Transmitir via ISefazGateway
      console.log(`🚀 [AuthorizeCteUseCase] Autorizando CTe #${input.cteId} na Sefaz ${uf}...`);
      const authResult = await this.sefazGateway.authorizeCte({
        cteXml: xmlAssinado,
        environment,
        uf,
      });

      if (Result.isFail(authResult)) {
        return Result.fail(`Erro SEFAZ: ${authResult.error}`);
      }

      const resultado = authResult.value;

      if (!resultado.success) {
        return Result.fail(
          `CTe rejeitado: ${resultado.rejectionCode} - ${resultado.rejectionMessage}`
        );
      }

      // 9. Atualizar CTe no banco
      await db
        .update(cteHeader)
        .set({
          status: 'AUTHORIZED',
          cteKey: resultado.cteKey,
          protocolNumber: resultado.protocolNumber,
          authorizationDate: resultado.authorizationDate,
          updatedAt: new Date(),
        })
        .where(eq(cteHeader.id, input.cteId));

      console.log(`✅ [AuthorizeCteUseCase] CTe #${input.cteId} autorizado com sucesso`);

      // 10. Retornar resultado
      return Result.ok({
        cteId: input.cteId,
        cteKey: resultado.cteKey || '',
        protocolNumber: resultado.protocolNumber || '',
        authorizationDate: resultado.authorizationDate || new Date(),
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ [AuthorizeCteUseCase] Erro: ${errorMessage}`);
      return Result.fail(`Erro ao autorizar CTe: ${errorMessage}`);
    }
  }

  private validateInput(input: AuthorizeCteInput): Result<void, string> {
    if (!input.cteId || input.cteId <= 0) {
      return Result.fail('cteId inválido');
    }
    if (!input.organizationId || input.organizationId <= 0) {
      return Result.fail('organizationId inválido');
    }
    if (!input.branchId || input.branchId <= 0) {
      return Result.fail('branchId inválido');
    }
    if (!input.userId?.trim()) {
      return Result.fail('userId obrigatório');
    }
    return Result.ok(undefined);
  }
}
