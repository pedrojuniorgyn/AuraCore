'use client';

import { motion } from 'framer-motion';
import { ShieldX, ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  showContactAdmin?: boolean;
}

export function AccessDenied({
  title = 'Acesso Negado',
  message = 'Você não tem permissão para acessar esta página ou recurso.',
  showBackButton = true,
  showContactAdmin = true,
}: AccessDeniedProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/10 
            flex items-center justify-center"
        >
          <ShieldX size={48} className="text-red-400" />
        </motion.div>

        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        <p className="text-white/60 mb-8">{message}</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {showBackButton && (
            <Link
              href="/strategic"
              className="flex items-center gap-2 px-6 py-3 rounded-xl 
                bg-white/5 text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={18} />
              Voltar ao Dashboard
            </Link>
          )}

          {showContactAdmin && (
            <a
              href="mailto:admin@empresa.com?subject=Solicitar Acesso - Strategic"
              className="flex items-center gap-2 px-6 py-3 rounded-xl 
                bg-purple-500 text-white hover:bg-purple-600 transition-colors"
            >
              <Mail size={18} />
              Solicitar Acesso
            </a>
          )}
        </div>
      </motion.div>
    </div>
  );
}
