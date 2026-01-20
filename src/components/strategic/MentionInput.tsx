"use client";

/**
 * MentionInput - Textarea com suporte a @mentions
 * 
 * @module components/strategic
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MentionUser {
  id: string;
  name: string;
  avatar?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  users: MentionUser[];
  placeholder?: string;
  className?: string;
  rows?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function MentionInput({ 
  value, 
  onChange, 
  users, 
  placeholder, 
  className,
  rows = 3,
  onKeyDown 
}: Props) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart || 0;
    onChange(newValue);
    setCursorPosition(cursor);

    // Check for @ mention
    const textBeforeCursor = newValue.slice(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const insertMention = (user: MentionUser) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    const mentionStart = textBeforeCursor.lastIndexOf('@');
    
    const newValue = 
      textBeforeCursor.slice(0, mentionStart) + 
      `@${user.name.replace(/\s/g, '')} ` + 
      textAfterCursor;

    onChange(newValue);
    setShowSuggestions(false);

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If suggestions are open, handle navigation
    if (showSuggestions && filteredUsers.length > 0) {
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }
    
    // Call parent handler
    onKeyDown?.(e);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDownInternal}
        placeholder={placeholder}
        className={className}
        rows={rows}
      />

      <AnimatePresence>
        {showSuggestions && filteredUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-full left-0 mb-2 w-64 max-h-48 overflow-y-auto
              rounded-xl bg-gray-800 border border-white/10 shadow-xl z-50"
          >
            {filteredUsers.slice(0, 5).map((user) => (
              <button
                key={user.id}
                onClick={() => insertMention(user)}
                className="w-full px-4 py-2 flex items-center gap-3 text-left
                  hover:bg-white/10 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                  flex items-center justify-center text-white text-sm font-bold">
                  {user.avatar || user.name.charAt(0)}
                </div>
                <span className="text-white">{user.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
