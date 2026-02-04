/**
 * API Routes: /api/strategic/swot/[id]
 * Get, Update, Delete SWOT item
 *
 * @module app/api/strategic/swot/[id]
 */
import { z } from 'zod';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { getTenantContext } from '@/lib/auth/context';
import { Result } from '@/shared/domain';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { ISwotAnalysisRepository } from '@/modules/strategic/domain/ports/output/ISwotAnalysisRepository';
import { SwotItem, type SwotCategory } from '@/modules/strategic/domain/entities/SwotItem';

const updateSwotItemSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  impactScore: z.number().min(1).max(5).optional(),
  probabilityScore: z.number().min(0).max(5).optional(),
  category: z.string().trim().max(50).optional(),
  // ✅ BUG-FIX: strategyId é obrigatório (não .optional())
  strategyId: z.string().uuid('Invalid strategy ID'),
});

// GET /api/strategic/swot/[id]
export const GET = withDI(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
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
    console.error('[GET /api/strategic/swot/[id]] Error:', error);
    return Response.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});

// PUT /api/strategic/swot/[id]
export const PUT = withDI(async (request: Request, context: { params: Promise<{ id: string }> }) => {
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
    
    // ✅ BUG-FIX: Defense-in-depth - Validar null/empty antes de Zod parse
    // (Zod agora exige strategyId obrigatório, mas validação extra previne null/empty)
    if (payload.strategyId === null || payload.strategyId === '') {
      console.error('[PUT /api/strategic/swot/[id]] strategyId null/empty:', {
        payload: JSON.stringify(payload, null, 2),
        strategyId: payload.strategyId
      });
      
      return Response.json(
        { 
          success: false, 
          error: 'Estratégia é obrigatória',
          details: { 
            strategyId: [
              'O campo "estratégia" é obrigatório para salvar um item SWOT.',
              'Por favor, selecione uma estratégia antes de continuar.'
            ] 
          }
        },
        { status: 400 }
      );
    }
    
    // ✅ Zod validation: Valida formato UUID, tipo, e obrigatoriedade
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

    // ✅ VALIDAÇÃO: Se strategyId mudou, verificar se a nova strategy existe
    // (strategyId é sempre obrigatório via schema Zod)
    if (validated.strategyId !== existing.strategyId) {
      try {
        const strategyRepository = container.resolve(STRATEGIC_TOKENS.StrategyRepository);
        const strategyExists = await strategyRepository.findById(
          validated.strategyId,
          tenantCtx.organizationId
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
        console.error('[PUT /api/strategic/swot/[id]] Error validating strategy:', error);
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
    
    // ⚠️ IMPORTANTE: Recalcular priorityScore quando impact/probability mudam
    const finalImpactScore = validated.impactScore ?? existing.impactScore;
    const finalProbabilityScore = validated.probabilityScore ?? existing.probabilityScore;
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

    console.error('[PUT /api/strategic/swot/[id]] Error:', error);
    return Response.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});

// DELETE /api/strategic/swot/[id]
export const DELETE = withDI(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
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

    // Deletar (soft delete)
    await repository.delete(
      id, 
      tenantCtx.organizationId, 
      tenantCtx.branchId
    );

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[DELETE /api/strategic/swot/[id]] Error:', error);
    return Response.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});
