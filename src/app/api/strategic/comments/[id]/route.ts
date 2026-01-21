/**
 * API: PATCH/DELETE /api/strategic/comments/[id]
 * Edita ou exclui um comentário
 * 
 * @module app/api/strategic/comments/[id]
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // TODO: Verificar se usuário é dono do comentário
    // TODO: Atualizar comentário no banco
    // const commentRepo = container.resolve<ICommentRepository>(STRATEGIC_TOKENS.CommentRepository);
    // await commentRepo.update(id, { content });

    console.log('Edit comment:', { id, content, userId: session.user?.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('PATCH /api/strategic/comments/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // TODO: Verificar se usuário é dono do comentário ou admin
    // TODO: Soft delete ou hard delete
    // const commentRepo = container.resolve<ICommentRepository>(STRATEGIC_TOKENS.CommentRepository);
    // await commentRepo.delete(id);

    console.log('Delete comment:', { id, userId: session.user?.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('DELETE /api/strategic/comments/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
