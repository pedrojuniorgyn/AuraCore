/**
 * API Route: /api/strategic/ideas/[id]/discussions
 * GET - Busca discussões (comentários, votos, anexos) de uma ideia
 * 
 * @module app/api/strategic/ideas
 */
import { NextRequest, NextResponse } from 'next/server';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
import { getTenantContext } from '@/lib/auth/context';
import { container } from '@/shared/infrastructure/di/container';
import { STRATEGIC_TOKENS } from '@/modules/strategic/infrastructure/di/tokens';
import type { IIdeaBoxRepository } from '@/modules/strategic/domain/ports/output/IIdeaBoxRepository';

import { logger } from '@/shared/infrastructure/logging';
// TODO: Substituir por dados reais quando implementar tabelas de comentários/votos/anexos
function generateMockDiscussions(ideaId: string, ideaTitle: string, status: string, createdAt: Date) {
  const seed = ideaId.charCodeAt(0) + ideaId.charCodeAt(1);
  
  // Gerar comentários mock
  const commentsCount = (seed % 5) + 1; // 1-5 comentários
  const comments = Array.from({ length: commentsCount }, (_, i) => {
    const commentSeed = seed + i;
    const hasReplies = commentSeed % 3 === 0; // 1/3 tem replies
    
    return {
      id: `comment-${ideaId}-${i}`,
      author: {
        name: ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa'][commentSeed % 4],
        avatar: `https://i.pravatar.cc/150?u=${commentSeed}`,
      },
      text: [
        'Excelente ideia! Isso pode realmente melhorar nossa eficiência.',
        'Concordo, mas precisamos avaliar o custo-benefício.',
        'Já vi algo similar funcionando bem em outra empresa.',
        'Sugiro adicionar métricas para avaliar o impacto.',
        'Podemos começar com um piloto antes de implementar em larga escala.',
      ][commentSeed % 5],
      createdAt: new Date(createdAt.getTime() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
      replies: hasReplies
        ? [
            {
              id: `reply-${ideaId}-${i}-0`,
              author: {
                name: ['Carlos Lima', 'Fernanda Alves'][commentSeed % 2],
                avatar: `https://i.pravatar.cc/150?u=reply-${commentSeed}`,
              },
              text: 'Concordo plenamente!',
              createdAt: new Date(
                createdAt.getTime() + (i + 1) * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000
              ).toISOString(),
            },
          ]
        : [],
    };
  });

  // Gerar votos mock
  const votersCount = (seed % 10) + 3; // 3-12 votantes
  const voters = Array.from({ length: votersCount }, (_, i) => ({
    userId: `user-${seed}-${i}`,
    userName: [
      'João Silva',
      'Maria Santos',
      'Pedro Oliveira',
      'Ana Costa',
      'Carlos Lima',
      'Fernanda Alves',
      'Ricardo Souza',
      'Juliana Pereira',
      'Marcos Ferreira',
      'Patricia Martins',
    ][(seed + i) % 10],
    votedAt: new Date(
      createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000
    ).toISOString(),
  }));

  // Gerar anexos mock (nem todas as ideias têm anexos)
  const hasAttachments = seed % 2 === 0;
  const attachments = hasAttachments
    ? [
        {
          fileName: 'proposta-detalhada.pdf',
          url: `/api/attachments/mock-${ideaId}-1.pdf`,
          type: 'application/pdf',
          size: 245000,
        },
        {
          fileName: 'diagrama-processo.png',
          url: `/api/attachments/mock-${ideaId}-2.png`,
          type: 'image/png',
          size: 156000,
        },
      ]
    : [];

  return { comments, voters, attachments };
}

// GET /api/strategic/ideas/[id]/discussions
export const GET = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const ideaId = params.id;

    const repository = container.resolve<IIdeaBoxRepository>(
      STRATEGIC_TOKENS.IdeaBoxRepository
    );

    // Buscar a ideia principal
    const idea = await repository.findById(
      ideaId,
      tenantContext.organizationId,
      tenantContext.branchId
    );

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Gerar discussões mock
    const { comments, voters, attachments } = generateMockDiscussions(
      idea.id,
      idea.title,
      idea.status.value,
      idea.createdAt
    );

    return NextResponse.json({
      comments,
      voters,
      attachments,
      ideaId: idea.id,
      ideaTitle: idea.title,
      ideaStatus: idea.status,
      total: comments.length + voters.length + attachments.length,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error('[Idea Discussions] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
