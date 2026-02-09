/**
 * API Route: /api/strategic/ideas/grid
 * GET - Lista Ideas para Grid com contadores de votos/comentários
 * 
 * @module app/api/strategic/ideas
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/shared/infrastructure/di/container';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { getTenantContext } from '@/lib/auth/context';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IIdeaBoxRepository } from '@/modules/strategic/domain/ports/output/IIdeaBoxRepository';

// Função para gerar votos/comentários mock (TODO: Substituir por dados reais quando implementar tabelas)
function generateMockEngagement(ideaId: string, status: string, createdAt: Date): {
  votesCount: number;
  commentsCount: number;
} {
  // Seed baseado no ID para consistência
  const seed = ideaId.charCodeAt(0) + ideaId.charCodeAt(1);
  
  // Ideias aprovadas tendem a ter mais votos
  const statusMultiplier = status === 'APPROVED' ? 2 : status === 'UNDER_REVIEW' ? 1.5 : 1;
  
  // Ideias mais antigas tendem a ter mais engajamento
  const ageInDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const ageMultiplier = Math.min(1 + (ageInDays / 30), 3); // Max 3x
  
  const baseVotes = (seed % 15) + 1;
  const baseComments = (seed % 8) + 1;
  
  return {
    votesCount: Math.floor(baseVotes * statusMultiplier * ageMultiplier),
    commentsCount: Math.floor(baseComments * statusMultiplier * ageMultiplier * 0.6),
  };
}

// Mapeamento de status para labels pt-BR
const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submetida',
  UNDER_REVIEW: 'Em Análise',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  CONVERTED: 'Convertida',
  ARCHIVED: 'Arquivada',
};

// Mapeamento de category/sourceType para labels pt-BR
const CATEGORY_LABELS: Record<string, string> = {
  SUGGESTION: 'Sugestão',
  COMPLAINT: 'Reclamação',
  OBSERVATION: 'Observação',
  BENCHMARK: 'Benchmark',
  AUDIT: 'Auditoria',
  CLIENT_FEEDBACK: 'Feedback Cliente',
};

// GET /api/strategic/ideas/grid
export const GET = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;

    const repository = container.resolve<IIdeaBoxRepository>(
      STRATEGIC_TOKENS.IdeaBoxRepository
    );

    const result = await repository.findMany({
      organizationId: context.organizationId,
      branchId: context.branchId,
      page,
      pageSize,
      status: status as 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'ARCHIVED' | undefined,
      sourceType: category,
    });

    // Filtrar por search (título, descrição)
    let filteredItems = result.items;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = result.items.filter(
        (item) =>
          item.title.toLowerCase().includes(searchLower) ||
          (item.description && item.description.toLowerCase().includes(searchLower))
      );
    }

    return NextResponse.json({
      data: filteredItems.map((idea) => {
        // Gerar engajamento mock
        const { votesCount, commentsCount } = generateMockEngagement(
          idea.id,
          idea.status.value,
          idea.createdAt
        );
        
        // Calcular score: votos * 2 + comentários
        const score = votesCount * 2 + commentsCount;

        return {
          id: idea.id,
          code: idea.code,
          title: idea.title,
          description: idea.description || '',
          category: CATEGORY_LABELS[idea.sourceType] || idea.sourceType,
          status: idea.status.value,
          statusLabel: STATUS_LABELS[idea.status.value] || idea.status.label,
          author: {
            id: idea.submittedBy,
            name: idea.submittedByName || 'Anônimo',
          },
          votesCount,
          commentsCount,
          score,
          createdAt: idea.createdAt.toISOString(),
          updatedAt: idea.updatedAt.toISOString(),
        };
      }),
      pagination: {
        page,
        pageSize,
        total: filteredItems.length,
        totalPages: Math.ceil(filteredItems.length / pageSize),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error('[Ideas Grid] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
