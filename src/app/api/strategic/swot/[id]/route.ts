/**
 * API Routes: /api/strategic/swot/[id]
 * Get, Update, Delete SWOT item
 *
 * 🔐 ABAC: Operações de escrita validam branchId
 *
 * @module app/api/strategic/swot/[id]
 */
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
import { 
  getTenantContext,
  validateABACResourceAccess,
  abacDeniedResponse 
} from '@/lib/auth/context';
import { Result } from '@/shared/domain';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { ISwotAnalysisRepository } from '@/modules/strategic/domain/ports/output/ISwotAnalysisRepository';
import type { IStrategyRepository } from '@/modules/strategic/domain/ports/output/IStrategyRepository';
import { SwotItem, type SwotCategory } from '@/modules/strategic/domain/entities/SwotItem';
import { logger } from '@/shared/infrastructure/logging';

const updateSwotItemSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  impactScore: z.number().min(1).max(5).optional(),
  // ✅ BUG-FIX: probabilityScore deve ser min(1) para alinhar com domain entity
  // Domain SwotItem valida: probabilityScore entre 1 e 5 (inclusive)
  // Permitir min(0) causaria bypass de domain validation, salvando dados inválidos
  probabilityScore: z.number().min(1, 'probabilityScore must be between 1 and 5').max(5).optional(),
  category: z.string().trim().max(50).optional(),
  // ✅ BUG-FIX: strategyId é .optional() no schema (permite omitir em updates parciais)
  // Validação manual rejeita null/empty se fornecido explicitamente
  strategyId: z.string().uuid('Invalid strategy ID').optional(),
});

// GET /api/strategic/swot/[id]
export const GET = withDI(async (_request: NextRequest, context: RouteContext) => {
  try {
    let tenantCtx;
    try {
      tenantCtx = await getTenantContext();
    } catch (error: unknown) {
      if (error instanceof Response) return error;
      throw error;
    }

    const { id } = await context.params;

    const repository = container.resolve<ISwotAnalysisRepository>(STRATEGIC_TOKENS.SwotAnalysisRepository);
    const item = await repository.findById(
      id, 
      tenantCtx.organizationId, 
      tenantCtx.branchId
    );

    if (!item) {
      return Response.json(
        { success: false, error: 'SWOT item not found' },
        { status: 404 }
      );
    }

    return Response.json(item, { status: 200 });
  } catch (error) {
    logger.error('[GET /api/strategic/swot/[id]] Error', error);
    return Response.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});

// PUT /api/strategic/swot/[id]
export const PUT = withDI(async (request: NextRequest, context: RouteContext) => {
  try {
    let tenantCtx;
    try {
      tenantCtx = await getTenantContext();
    } catch (error: unknown) {
      if (error instanceof Response) return error;
      throw error;
    }

    const { id } = await context.params;
    const body = await request.json();
    
    // ✅ HOTFIX: Extrair props se vier como Domain Entity
    const payload = body.props ? body.props : body;
    
    // ✅ BUG-FIX: Defense-in-depth - Validar null/empty SE fornecido explicitamente
    // (undefined = campo omitido = OK, null/'' = campo fornecido inválido = ERRO)
    if (payload.strategyId !== undefined && (payload.strategyId === null || payload.strategyId === '')) {
      logger.error('[PUT /api/strategic/swot/[id]] strategyId null/empty', { payload: JSON.stringify(payload, null, 2), strategyId: payload.strategyId });
      
      return Response.json(
        { 
          success: false, 
          error: 'Estratégia inválida',
          details: { 
            strategyId: [
              'O campo "estratégia" não pode ser vazio ou nulo.',
              'Omita o campo para manter o valor existente ou forneça um UUID válido.'
            ] 
          }
        },
        { status: 400 }
      );
    }
    
    // ✅ Zod validation: Valida formato UUID e tipos (strategyId é opcional)
    const validated = updateSwotItemSchema.parse(payload);

    const repository = container.resolve<ISwotAnalysisRepository>(STRATEGIC_TOKENS.SwotAnalysisRepository);
    
    // Buscar item existente
    const existing = await repository.findById(
      id, 
      tenantCtx.organizationId, 
      tenantCtx.branchId
    );

    if (!existing) {
      return Response.json(
        { success: false, error: 'SWOT item not found' },
        { status: 404 }
      );
    }

    // ============================
    // 🔐 ABAC VALIDATION (E9.4)
    // ============================
    // Validar se usuário tem acesso à filial do SWOT item antes de editar
    const abacResult = validateABACResourceAccess(tenantCtx, existing.branchId);
    if (!abacResult.allowed) {
      return abacDeniedResponse(abacResult, tenantCtx);
    }

    // ✅ VALIDAÇÃO: Se strategyId foi fornecido E mudou, verificar se a nova strategy existe
    if (validated.strategyId !== undefined && validated.strategyId !== existing.strategyId) {
      try {
        const strategyRepository = container.resolve<IStrategyRepository>(STRATEGIC_TOKENS.StrategyRepository);
        const strategyExists = await strategyRepository.findById(
          validated.strategyId,
          tenantCtx.organizationId,
          tenantCtx.branchId
        );
        
        if (!strategyExists) {
          return Response.json(
            { 
              success: false, 
              error: 'Strategy not found',
              details: { strategyId: ['Estratégia inválida ou não encontrada'] }
            },
            { status: 400 }
          );
        }
      } catch (error) {
        logger.error('[PUT /api/strategic/swot/[id]] Error validating strategy', error);
        return Response.json(
          { 
            success: false, 
            error: 'Failed to validate strategy',
            details: { strategyId: ['Erro ao validar estratégia'] }
          },
          { status: 500 }
        );
      }
    }

    // ✅ BUG-FIX: Atualizar usando reconstitute para manter domain entity válida
    // (Mapper.toPersistence espera entity completa, não plain object)
    
    // ⚠️ IMPORTANTE: Usar !== undefined para aceitar 0 como valor válido
    // (0 ?? fallback retorna 0, mas !== undefined é mais explícito)
    const finalImpactScore = validated.impactScore !== undefined ? validated.impactScore : existing.impactScore;
    const finalProbabilityScore = validated.probabilityScore !== undefined ? validated.probabilityScore : existing.probabilityScore;
    const recalculatedPriorityScore = finalImpactScore * finalProbabilityScore;
    
    const updatedEntityResult = SwotItem.reconstitute({
      id: existing.id,
      organizationId: existing.organizationId,
      branchId: existing.branchId,
      strategyId: validated.strategyId ?? existing.strategyId,
      quadrant: existing.quadrant, // Quadrant não é editável via PUT
      title: validated.title ?? existing.title,
      description: validated.description ?? existing.description,
      impactScore: finalImpactScore,
      probabilityScore: finalProbabilityScore,
      priorityScore: recalculatedPriorityScore, // ✅ Recalculado (não usar existing)
      category: (validated.category ?? existing.category) as SwotCategory | null,
      convertedToActionPlanId: existing.convertedToActionPlanId,
      convertedToGoalId: existing.convertedToGoalId,
      status: existing.status,
      createdBy: existing.createdBy,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });

    if (Result.isFail(updatedEntityResult)) {
      return Response.json(
        { success: false, error: 'Failed to reconstitute SWOT item', details: updatedEntityResult.error },
        { status: 500 }
      );
    }

    // Salvar
    await repository.save(updatedEntityResult.value);

    // Buscar item atualizado
    const updated = await repository.findById(
      id,
      tenantCtx.organizationId,
      tenantCtx.branchId
    );

    return Response.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: 'Validation error',
          details: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    logger.error('[PUT /api/strategic/swot/[id]] Error', error);
    return Response.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});

// DELETE /api/strategic/swot/[id]
export const DELETE = withDI(async (_request: NextRequest, context: RouteContext) => {
  try {
    let tenantCtx;
    try {
      tenantCtx = await getTenantContext();
    } catch (error: unknown) {
      if (error instanceof Response) return error;
      throw error;
    }

    const { id } = await context.params;

    const repository = container.resolve<ISwotAnalysisRepository>(STRATEGIC_TOKENS.SwotAnalysisRepository);
    
    // Verificar se item existe
    const existing = await repository.findById(
      id, 
      tenantCtx.organizationId, 
      tenantCtx.branchId
    );

    if (!existing) {
      return Response.json(
        { success: false, error: 'SWOT item not found' },
        { status: 404 }
      );
    }

    // ============================
    // 🔐 ABAC VALIDATION (E9.4)
    // ============================
    // Validar se usuário tem acesso à filial do SWOT item antes de deletar
    const abacResult = validateABACResourceAccess(tenantCtx, existing.branchId);
    if (!abacResult.allowed) {
      return abacDeniedResponse(abacResult, tenantCtx);
    }

    // Deletar (soft delete)
    await repository.delete(
      id, 
      tenantCtx.organizationId, 
      tenantCtx.branchId
    );

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('[DELETE /api/strategic/swot/[id]] Error', error);
    return Response.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});
