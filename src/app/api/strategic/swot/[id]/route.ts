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
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { ISwotAnalysisRepository } from '@/modules/strategic/domain/ports/output/ISwotAnalysisRepository';

const updateSwotItemSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  impactScore: z.number().min(1).max(5).optional(),
  probabilityScore: z.number().min(0).max(5).optional(),
  category: z.string().trim().max(50).optional(),
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
    const validated = updateSwotItemSchema.parse(body);

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

    // Atualizar propriedades (reconstitute mantém a entity válida)
    const updatedEntity = {
      ...existing,
      ...validated,
      updatedAt: new Date(),
    };

    // Salvar
    await repository.save(updatedEntity);

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
