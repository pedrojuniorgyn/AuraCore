"use client";

/**
 * CommentInput - Input para criar comentários com mentions e anexos
 * 
 * @module components/strategic
 */
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, Loader2, X } from 'lucide-react';
import { MentionInput, type MentionUser } from './MentionInput';

interface Props {
  onSubmit: (content: string, attachments?: File[]) => Promise<void>;
  users: MentionUser[];
  placeholder?: string;
  replyingTo?: string;
  onCancelReply?: () => void;
}

export function CommentInput({ onSubmit, users, placeholder, replyingTo, onCancelReply }: Props) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!content.trim() && attachments.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content, attachments);
      setContent('');
      setAttachments([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      {/* Replying indicator */}
      {replyingTo && (
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
          <span className="text-white/50 text-sm">
            Respondendo a <span className="text-purple-400">{replyingTo}</span>
          </span>
          <button
            onClick={onCancelReply}
            className="text-white/40 hover:text-white text-sm"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Input */}
      <MentionInput
        value={content}
        onChange={setContent}
        users={users}
        placeholder={placeholder || "Digite @ para mencionar alguém..."}
        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
          text-white placeholder-white/30 resize-none
          focus:outline-none focus:border-purple-500/50"
        onKeyDown={handleKeyDown}
      />

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {attachments.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg 
                bg-white/10 text-white/70 text-xs"
            >
              <Paperclip size={12} />
              <span className="max-w-[150px] truncate">{file.name}</span>
              <button
                onClick={() => removeAttachment(i)}
                className="text-white/40 hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
            title="Anexar arquivo"
          >
            <Paperclip size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-white/30 text-xs hidden sm:block">⌘ + Enter para enviar</span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={isSubmitting || (!content.trim() && attachments.length === 0)}
            className="px-4 py-2 rounded-xl bg-purple-500 text-white 
              hover:bg-purple-600 transition-all flex items-center gap-2
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
