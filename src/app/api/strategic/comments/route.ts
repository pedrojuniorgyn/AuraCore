/**
 * API: GET/POST /api/strategic/comments
 * Gerencia comentários de entidades estratégicas
 * 
 * @module app/api/strategic/comments
 */
import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    // Buscar usuários da organização para o autocomplete de mentions
    const orgUsers = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.organizationId, ctx.organizationId));

    // Retornar lista vazia de comentários - será implementado quando houver tabela de comments
    // A UI deve exibir empty state "Nenhum comentário ainda. Seja o primeiro a comentar!"
    return NextResponse.json({
      currentUserId: ctx.userId,
      users: orgUsers.map(u => ({ id: u.id, name: u.name || 'Sem nome' })),
      comments: [],
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('GET /api/strategic/comments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext();

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

    // TODO: Salvar comentário no banco de dados quando tabela for criada
    // A tabela de comments ainda não existe no schema

    console.log('New comment (in-memory, tabela não implementada):', { 
      content, 
      entityType, 
      entityId, 
      parentId,
      attachmentCount: attachments.length,
      userId: ctx.userId 
    });

    return NextResponse.json({ 
      success: true, 
      id: `comment-${Date.now()}`,
      message: 'Comentário registrado (funcionalidade em desenvolvimento)'
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('POST /api/strategic/comments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
