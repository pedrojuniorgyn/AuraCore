/**
 * API: POST /api/strategic/comments/[id]/reactions
 * Toggle reação em um comentário
 *
 * @module app/api/strategic/comments/[id]/reactions
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { REACTIONS, type Reaction } from '@/lib/comments/comment-types';

// In-memory store para desenvolvimento
// Em produção, usar banco de dados
const reactionsStore = new Map<string, Map<string, Set<string>>>();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: commentId } = await params;
    const body = await request.json();
    const { emoji } = body as { emoji: string };

    // Validar emoji
    const validEmoji = REACTIONS.find((r) => r.emoji === emoji);
    if (!validEmoji) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
    }

    const userId = session.user.id;

    // Obter ou criar store de reações para o comentário
    if (!reactionsStore.has(commentId)) {
      reactionsStore.set(commentId, new Map());
    }

    const commentReactions = reactionsStore.get(commentId)!;

    // Obter ou criar set de usuários para o emoji
    if (!commentReactions.has(emoji)) {
      commentReactions.set(emoji, new Set());
    }

    const emojiUsers = commentReactions.get(emoji)!;

    // Toggle reação
    if (emojiUsers.has(userId)) {
      emojiUsers.delete(userId);
      // Remover emoji se não houver mais usuários
      if (emojiUsers.size === 0) {
        commentReactions.delete(emoji);
      }
    } else {
      emojiUsers.add(userId);
    }

    // Construir array de reações para resposta
    const reactions: Reaction[] = [];
    for (const [e, users] of commentReactions.entries()) {
      if (users.size > 0) {
        reactions.push({
          emoji: e,
          count: users.size,
          users: Array.from(users),
          hasReacted: users.has(userId),
        });
      }
    }

    return NextResponse.json({ reactions });
  } catch (error) {
    console.error('POST /api/strategic/comments/[id]/reactions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const { id: commentId } = await params;

    const commentReactions = reactionsStore.get(commentId);
    if (!commentReactions) {
      return NextResponse.json({ reactions: [] });
    }

    const reactions: Reaction[] = [];
    for (const [emoji, users] of commentReactions.entries()) {
      if (users.size > 0) {
        reactions.push({
          emoji,
          count: users.size,
          users: Array.from(users),
          hasReacted: userId ? users.has(userId) : false,
        });
      }
    }

    return NextResponse.json({ reactions });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('GET /api/strategic/comments/[id]/reactions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
