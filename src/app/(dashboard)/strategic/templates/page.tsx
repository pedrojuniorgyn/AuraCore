'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { TemplateGallery } from '@/components/strategic/templates/TemplateGallery';

function TemplatesPageInner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-4">
          <Link
            href="/strategic"
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 
              hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <FileText className="text-purple-400" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Templates</h1>
            <p className="text-white/60 mt-1">
              Modelos prontos para KPIs, Planos de Ação e Ciclos PDCA
            </p>
          </div>
        </div>
      </motion.div>

      {/* Gallery */}
      <TemplateGallery
        onCreateNew={() => {
          // TODO: Navigate to create page
          console.log('Create new template');
        }}
        onEdit={(template) => {
          // TODO: Navigate to edit page
          console.log('Edit template:', template.id);
        }}
      />
    </div>
  );
}

export default memo(TemplatesPageInner);
