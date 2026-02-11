/**
 * API: POST /api/strategic/comments/[id]/like
 * Alterna like em um comentário
 * 
 * @module app/api/strategic/comments/[id]/like
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
import { logger } from '@/shared/infrastructure/logging';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const POST = withDI(async (request: Request, context: RouteContext) => {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // TODO: Toggle like no banco de dados
    // Verificar se já existe like do usuário
    // Se existir, remover (unlike)
    // Se não existir, adicionar (like)
    //
    // const likeRepo = container.resolve<ICommentLikeRepository>(STRATEGIC_TOKENS.CommentLikeRepository);
    // const existingLike = await likeRepo.findByCommentAndUser(id, session.user.id);
    // 
    // if (existingLike) {
    //   await likeRepo.delete(existingLike.id);
    //   liked = false;
    // } else {
    //   await likeRepo.create({ commentId: id, userId: session.user.id });
    //   liked = true;
    // }

    logger.info('Toggle like:', { commentId: id, userId: session.user?.id });

    return NextResponse.json({ 
      success: true,
      liked: true, // Would return actual state
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('POST /api/strategic/comments/[id]/like error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
