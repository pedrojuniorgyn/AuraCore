'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Mostrar prompt após 30 segundos ou após 3 visitas
      const visits = parseInt(localStorage.getItem('pwa-visits') || '0') + 1;
      localStorage.setItem('pwa-visits', String(visits));
      
      if (visits >= 3 || !localStorage.getItem('pwa-dismissed')) {
        setTimeout(() => setShowPrompt(true), 30000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showPrompt && deferredPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80"
        >
          <div className="bg-gray-800 rounded-2xl border border-white/10 p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20">
                <Download className="text-purple-400" size={24} />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold">Instalar AuraCore</h4>
                <p className="text-white/50 text-sm mt-1">
                  Acesse mais rápido direto da sua tela inicial!
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:bg-white/10 text-white/40"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2 rounded-xl bg-white/10 text-white/70 
                  hover:bg-white/20 text-sm"
              >
                Agora não
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 py-2 rounded-xl bg-purple-500 text-white 
                  hover:bg-purple-600 text-sm flex items-center justify-center gap-2"
              >
                <Download size={16} /> Instalar
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
