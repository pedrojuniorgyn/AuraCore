/**
 * API: POST /api/strategic/comments/[id]/like
 * Alterna like em um comentário
 * 
 * @module app/api/strategic/comments/[id]/like
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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

    console.log('Toggle like:', { commentId: id, userId: session.user?.id });

    return NextResponse.json({ 
      success: true,
      liked: true, // Would return actual state
    });
  } catch (error) {
    console.error('POST /api/strategic/comments/[id]/like error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
