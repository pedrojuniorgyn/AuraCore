"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { AuraChatButton } from './AuraChatButton';

interface ChatAction {
  label: string;
  href: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: ChatAction[];
  isError?: boolean;
}

const SUGGESTIONS = [
  'Qual o status geral da estratégia?',
  'Quais KPIs estão críticos?',
  'Mostre planos de ação atrasados',
  'Resumo do BSC',
];

export function AuraChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Olá! Sou a Aurora AI, sua assistente estratégica. Como posso ajudar você hoje?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = useCallback(async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/strategic/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      });

      if (!response.ok) {
        throw new Error('Falha na comunicação');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        actions: data.actions,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date(),
        isError: true,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <AuraChatButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-40 w-[380px] max-w-[calc(100vw-3rem)] h-[500px] 
              rounded-2xl overflow-hidden bg-gray-900/95 backdrop-blur-xl 
              border border-white/10 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-purple-500/20 via-pink-500/10 to-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <Bot className="text-white" size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold flex items-center gap-1">
                    Aurora AI 
                    <Sparkles className="text-pink-400" size={14} />
                  </h3>
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Assistente Estratégica
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : msg.isError
                        ? 'bg-red-500/20 border border-red-500/30 text-red-200'
                        : 'bg-white/10 text-white/90'
                  }`}>
                    {msg.isError && (
                      <AlertCircle className="w-4 h-4 text-red-400 mb-1" />
                    )}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    
                    {/* Action buttons */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-white/10">
                        {msg.actions.map((action, i) => (
                          <a
                            key={i}
                            href={action.href}
                            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 
                              bg-white/10 border border-white/20 rounded-full 
                              hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                          >
                            {action.label} 
                            <ExternalLink size={10} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/10 p-3 rounded-2xl flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                    <span className="text-xs text-white/60">Pensando...</span>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions (only if few messages) */}
            {messages.length <= 2 && !isLoading && (
              <div className="px-4 pb-2">
                <p className="text-xs text-gray-500 mb-2">Sugestões:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSend(suggestion)}
                      className="text-xs px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 
                        rounded-full text-purple-300 hover:bg-purple-500/20 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-gray-900/50">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua pergunta..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                    text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50
                    disabled:opacity-50 transition-colors text-sm"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all hover:shadow-lg hover:shadow-purple-500/25
                    active:scale-95"
                  aria-label="Enviar mensagem"
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
