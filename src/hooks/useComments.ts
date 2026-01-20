"use client";

/**
 * Hook para gerenciar comentários de entidades
 * 
 * @module hooks/useComments
 */
import { useState, useEffect, useCallback } from 'react';
import type { Comment } from '@/components/strategic/CommentItem';
import type { MentionUser } from '@/components/strategic/MentionInput';

interface UseCommentsReturn {
  comments: Comment[];
  users: MentionUser[];
  currentUserId: string;
  isLoading: boolean;
  error: string | null;
  addComment: (content: string, parentId?: string, attachments?: File[]) => Promise<void>;
  editComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  likeComment: (commentId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useComments(entityType: string, entityId: string): UseCommentsReturn {
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/strategic/comments?entityType=${entityType}&entityId=${entityId}`
      );
      
      if (!response.ok) {
        throw new Error('Erro ao carregar comentários');
      }
      
      const data = await response.json();
      setComments(data.comments || []);
      setUsers(data.users || []);
      setCurrentUserId(data.currentUserId || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = useCallback(async (
    content: string, 
    parentId?: string,
    attachments?: File[]
  ) => {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);
    if (parentId) formData.append('parentId', parentId);
    attachments?.forEach(file => formData.append('attachments', file));

    const response = await fetch('/api/strategic/comments', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Erro ao adicionar comentário');
    }

    await fetchComments();
  }, [entityType, entityId, fetchComments]);

  const editComment = useCallback(async (commentId: string, content: string) => {
    const response = await fetch(`/api/strategic/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error('Erro ao editar comentário');
    }

    await fetchComments();
  }, [fetchComments]);

  const deleteComment = useCallback(async (commentId: string) => {
    const response = await fetch(`/api/strategic/comments/${commentId}`, { 
      method: 'DELETE' 
    });

    if (!response.ok) {
      throw new Error('Erro ao excluir comentário');
    }

    await fetchComments();
  }, [fetchComments]);

  const likeComment = useCallback(async (commentId: string) => {
    // Optimistic update
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          likedByMe: !comment.likedByMe,
          likes: comment.likedByMe ? comment.likes - 1 : comment.likes + 1,
        };
      }
      // Check replies
      if (comment.replies) {
        return {
          ...comment,
          replies: comment.replies.map(reply => {
            if (reply.id === commentId) {
              return {
                ...reply,
                likedByMe: !reply.likedByMe,
                likes: reply.likedByMe ? reply.likes - 1 : reply.likes + 1,
              };
            }
            return reply;
          }),
        };
      }
      return comment;
    }));

    try {
      await fetch(`/api/strategic/comments/${commentId}/like`, { method: 'POST' });
    } catch {
      // Revert on error
      await fetchComments();
    }
  }, [fetchComments]);

  return {
    comments,
    users,
    currentUserId,
    isLoading,
    error,
    addComment,
    editComment,
    deleteComment,
    likeComment,
    refresh: fetchComments,
  };
}
