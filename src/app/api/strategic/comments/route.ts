/**
 * API: GET/POST /api/strategic/comments
 * Gerencia comentários de entidades estratégicas
 * 
 * @module app/api/strategic/comments
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    // TODO: Buscar comentários reais do banco de dados
    // const commentRepo = container.resolve<ICommentRepository>(STRATEGIC_TOKENS.CommentRepository);
    // const comments = await commentRepo.findByEntity(entityType, entityId);

    // Mock data para desenvolvimento
    const mockComments = [
      {
        id: 'c1',
        content: 'Excelente progresso! @Maria podemos agendar uma revisão amanhã para validar os números?',
        author: { id: 'user-2', name: 'Maria Santos' },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        likes: 3,
        likedByMe: true,
        replies: [
          {
            id: 'c1-r1',
            content: 'Claro! Pode ser às 14h? Vou preparar o dashboard com os dados atualizados.',
            author: { id: 'user-1', name: 'João Silva' },
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            likes: 1,
            likedByMe: false,
            parentId: 'c1',
          },
          {
            id: 'c1-r2',
            content: 'Perfeito! ✅',
            author: { id: 'user-2', name: 'Maria Santos' },
            createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            likes: 0,
            likedByMe: false,
            parentId: 'c1',
          },
        ],
      },
      {
        id: 'c2',
        content: 'Identifiquei um gargalo na última milha. Vou criar uma tarefa específica para endereçar isso.',
        author: { id: 'user-3', name: 'Pedro Lima' },
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        likes: 5,
        likedByMe: false,
        attachments: [
          { id: 'a1', name: 'analise_gargalo.pdf', url: '#', type: 'application/pdf' },
        ],
      },
    ];

    return NextResponse.json({
      currentUserId: 'user-1',
      users: [
        { id: 'user-1', name: 'João Silva' },
        { id: 'user-2', name: 'Maria Santos' },
        { id: 'user-3', name: 'Pedro Lima' },
        { id: 'user-4', name: 'Ana Costa' },
      ],
      comments: mockComments,
    });
  } catch (error) {
    console.error('GET /api/strategic/comments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const content = formData.get('content') as string;
    const entityType = formData.get('entityType') as string;
    const entityId = formData.get('entityId') as string;
    const parentId = formData.get('parentId') as string | null;
    const attachments = formData.getAll('attachments') as File[];

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    // TODO: Salvar comentário no banco de dados
    // const commentRepo = container.resolve<ICommentRepository>(STRATEGIC_TOKENS.CommentRepository);
    // const comment = await commentRepo.create({
    //   content,
    //   entityType,
    //   entityId,
    //   parentId,
    //   authorId: session.user.id,
    //   organizationId,
    //   branchId,
    // });

    // TODO: Processar mentions e enviar notificações
    // const mentions = extractMentions(content);
    // await notificationService.notifyMentions(mentions, entityType, entityId);

    // TODO: Upload attachments
    // const uploadedAttachments = await uploadService.uploadFiles(attachments);

    console.log('New comment:', { 
      content, 
      entityType, 
      entityId, 
      parentId,
      attachmentCount: attachments.length,
      userId: session.user?.id 
    });

    return NextResponse.json({ 
      success: true, 
      id: `comment-${Date.now()}` 
    });
  } catch (error) {
    console.error('POST /api/strategic/comments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
