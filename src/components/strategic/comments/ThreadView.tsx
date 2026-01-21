'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReactionPicker } from './ReactionPicker';
import type { Comment, User } from '@/lib/comments/comment-types';

interface ThreadViewProps {
  parentComment: Comment;
  replies: Comment[];
  currentUser?: User;
  isOpen: boolean;
  onClose: () => void;
  onReaction: (commentId: string, emoji: string) => void;
  onReply: (content: string) => Promise<void>;
  isLoading?: boolean;
}

function ThreadViewInner({
  parentComment,
  replies,
  isOpen,
  onClose,
  onReaction,
}: ThreadViewProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex justify-end"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-gray-900 border-l border-white/10 
            shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 
                  hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h3 className="text-white font-semibold">Thread</h3>
                <p className="text-white/40 text-sm">
                  {replies.length} resposta{replies.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 
                hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Parent comment */}
          <div className="p-4 border-b border-white/10 bg-white/5">
            <ThreadComment
              comment={parentComment}
              onReaction={onReaction}
              isParent
            />
          </div>

          {/* Replies */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {replies.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">Nenhuma resposta ainda</p>
                <p className="text-white/30 text-sm">Seja o primeiro a responder!</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {replies.map((reply, index) => (
                  <motion.div
                    key={reply.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ThreadComment
                      comment={reply}
                      onReaction={onReaction}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Reply input */}
          <div className="p-4 border-t border-white/10 bg-gray-900/50">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-purple-500/30 
                  flex items-center justify-center text-purple-300 text-sm">
                  U
                </div>
              </div>
              <div className="flex-1">
                <textarea
                  placeholder="Escreva uma resposta..."
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 
                    rounded-xl text-white text-sm resize-none placeholder-white/30
                    focus:outline-none focus:border-purple-500/50"
                  rows={2}
                />
                <div className="flex justify-end mt-2">
                  <button className="px-4 py-2 bg-purple-500 text-white text-sm 
                    rounded-lg hover:bg-purple-600 transition-colors">
                    Responder
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Comment dentro da thread
interface ThreadCommentProps {
  comment: Comment;
  onReaction: (commentId: string, emoji: string) => void;
  isParent?: boolean;
}

function ThreadComment({ comment, onReaction, isParent = false }: ThreadCommentProps) {
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });

  const initials = comment.author.initials ||
    comment.author.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className={`flex gap-3 ${isParent ? '' : 'pl-0'}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {comment.author.avatar ? (
          <img
            src={comment.author.avatar}
            alt={comment.author.name}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-purple-500/30 
            flex items-center justify-center text-purple-300 text-sm font-medium">
            {initials}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white font-medium text-sm">
            {comment.author.name}
          </span>
          <span className="text-white/40 text-xs">{timeAgo}</span>
        </div>

        <p className="text-white/80 text-sm mb-2 whitespace-pre-wrap">
          {comment.content}
        </p>

        <ReactionPicker
          reactions={comment.reactions}
          onToggle={(emoji) => onReaction(comment.id, emoji)}
          compact
        />
      </div>
    </div>
  );
}

export const ThreadView = memo(ThreadViewInner);
