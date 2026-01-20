"use client";

/**
 * CommentItem - Exibe um comentário individual com ações
 * 
 * @module components/strategic
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ThumbsUp, MessageCircle, MoreHorizontal, Edit2, Trash2, 
  Paperclip, Reply 
} from 'lucide-react';

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date | string;
  updatedAt?: Date | string;
  likes: number;
  likedByMe: boolean;
  attachments?: Attachment[];
  replies?: Comment[];
  parentId?: string;
}

interface Props {
  comment: Comment;
  currentUserId: string;
  onLike: (id: string) => void;
  onReply: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  isReply?: boolean;
}

export function CommentItem({ 
  comment, 
  currentUserId, 
  onLike, 
  onReply, 
  onEdit, 
  onDelete,
  isReply = false 
}: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(true);

  const isOwner = comment.author.id === currentUserId;
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { 
    addSuffix: true, 
    locale: ptBR 
  });

  // Parse mentions in content
  const renderContent = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-purple-400 font-medium hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleSaveEdit = () => {
    onEdit(comment.id, editContent);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${isReply ? 'ml-12 mt-3' : ''}`}
    >
      <div className={`
        p-4 rounded-xl transition-all
        ${isReply ? 'bg-white/[0.03]' : 'bg-white/5'}
        hover:bg-white/[0.08]
      `}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
              flex items-center justify-center text-white text-sm font-bold">
              {comment.author.avatar || comment.author.name.charAt(0)}
            </div>
            <div>
              <p className="text-white font-medium text-sm">{comment.author.name}</p>
              <p className="text-white/40 text-xs">{timeAgo}</p>
            </div>
          </div>

          {/* Menu */}
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"
              >
                <MoreHorizontal size={16} />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 top-full mt-1 w-32 rounded-lg 
                        bg-gray-800 border border-white/10 shadow-xl z-50 overflow-hidden"
                    >
                      <button
                        onClick={() => { setIsEditing(true); setShowMenu(false); }}
                        className="w-full px-3 py-2 text-left text-sm text-white 
                          hover:bg-white/10 flex items-center gap-2"
                      >
                        <Edit2 size={14} /> Editar
                      </button>
                      <button
                        onClick={() => { onDelete(comment.id); setShowMenu(false); }}
                        className="w-full px-3 py-2 text-left text-sm text-red-400 
                          hover:bg-red-500/10 flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="mb-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 
                text-white text-sm resize-none focus:outline-none focus:border-purple-500/50"
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 rounded-lg bg-purple-500 text-white text-xs"
              >
                Salvar
              </button>
              <button
                onClick={() => { setIsEditing(false); setEditContent(comment.content); }}
                className="px-3 py-1 rounded-lg bg-white/10 text-white text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <p className="text-white/80 text-sm mb-3 whitespace-pre-wrap">
            {renderContent(comment.content)}
          </p>
        )}

        {/* Attachments */}
        {comment.attachments && comment.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {comment.attachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg 
                  bg-white/10 text-white/70 text-xs hover:bg-white/20"
              >
                <Paperclip size={12} />
                {att.name}
              </a>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onLike(comment.id)}
            className={`flex items-center gap-1.5 text-xs transition-all
              ${comment.likedByMe 
                ? 'text-purple-400' 
                : 'text-white/40 hover:text-white/70'
              }`}
          >
            <ThumbsUp size={14} className={comment.likedByMe ? 'fill-current' : ''} />
            {comment.likes > 0 && comment.likes}
          </button>

          {!isReply && (
            <button
              onClick={() => onReply(comment.id)}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70"
            >
              <MessageCircle size={14} /> Responder
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {!showReplies && (
            <button
              onClick={() => setShowReplies(true)}
              className="ml-12 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <Reply size={12} /> Ver {comment.replies.length} resposta(s)
            </button>
          )}

          <AnimatePresence>
            {showReplies && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    currentUserId={currentUserId}
                    onLike={onLike}
                    onReply={onReply}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isReply
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
