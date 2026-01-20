"use client";

/**
 * CommentSection - Seção completa de comentários para entidades
 * 
 * @module components/strategic
 */
import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { CommentItem } from './CommentItem';
import { CommentInput } from './CommentInput';
import { useComments } from '@/hooks/useComments';

interface Props {
  entityType: 'action-plan' | 'kpi' | 'pdca' | 'goal';
  entityId: string;
}

export function CommentSection({ entityType, entityId }: Props) {
  const { 
    comments, 
    users,
    currentUserId,
    isLoading, 
    addComment, 
    editComment, 
    deleteComment,
    likeComment 
  } = useComments(entityType, entityId);

  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);

  const handleSubmit = async (content: string, attachments?: File[]) => {
    await addComment(content, replyingTo?.id, attachments);
    setReplyingTo(null);
  };

  const handleReply = (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      setReplyingTo({ id: commentId, name: comment.author.name });
    }
  };

  // Filter to show only root comments (no parentId)
  const rootComments = comments.filter(c => !c.parentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle className="text-purple-400" />
        <h3 className="text-lg font-bold text-white">Comentários</h3>
        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs">
          {comments.length}
        </span>
      </div>

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : rootComments.length > 0 ? (
        <div className="space-y-4">
          {rootComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onLike={likeComment}
              onReply={handleReply}
              onEdit={editComment}
              onDelete={deleteComment}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/50">Nenhum comentário ainda</p>
          <p className="text-white/30 text-sm">Seja o primeiro a comentar!</p>
        </div>
      )}

      {/* Input */}
      <CommentInput
        onSubmit={handleSubmit}
        users={users}
        replyingTo={replyingTo?.name}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
}
