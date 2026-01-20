"use client";

/**
 * ExportButton - Dropdown para exportar/importar dados
 * 
 * @module components/strategic
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileSpreadsheet, FileText, FileDown, Upload, ChevronDown } from 'lucide-react';

interface Props {
  onExportExcel: () => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
  onImport: () => void;
}

export function ExportButton({ onExportExcel, onExportPdf, onExportCsv, onImport }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 
          text-white flex items-center gap-2 hover:bg-white/20 transition-all"
      >
        <Download size={16} />
        Exportar
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-2 w-48 rounded-xl 
                bg-gray-900/95 backdrop-blur-xl border border-white/10 
                shadow-2xl z-50 overflow-hidden"
            >
              <button
                onClick={() => { onExportExcel(); setIsOpen(false); }}
                className="w-full px-4 py-3 flex items-center gap-3 text-white 
                  hover:bg-white/10 transition-all text-left"
              >
                <FileSpreadsheet size={18} className="text-green-400" />
                <div>
                  <p className="font-medium">Excel</p>
                  <p className="text-xs text-white/50">.xlsx</p>
                </div>
              </button>

              <button
                onClick={() => { onExportPdf(); setIsOpen(false); }}
                className="w-full px-4 py-3 flex items-center gap-3 text-white 
                  hover:bg-white/10 transition-all text-left"
              >
                <FileText size={18} className="text-red-400" />
                <div>
                  <p className="font-medium">PDF</p>
                  <p className="text-xs text-white/50">.pdf</p>
                </div>
              </button>

              <button
                onClick={() => { onExportCsv(); setIsOpen(false); }}
                className="w-full px-4 py-3 flex items-center gap-3 text-white 
                  hover:bg-white/10 transition-all text-left"
              >
                <FileDown size={18} className="text-blue-400" />
                <div>
                  <p className="font-medium">CSV</p>
                  <p className="text-xs text-white/50">.csv</p>
                </div>
              </button>

              <div className="border-t border-white/10" />

              <button
                onClick={() => { onImport(); setIsOpen(false); }}
                className="w-full px-4 py-3 flex items-center gap-3 text-white 
                  hover:bg-white/10 transition-all text-left"
              >
                <Upload size={18} className="text-purple-400" />
                <div>
                  <p className="font-medium">Importar</p>
                  <p className="text-xs text-white/50">.xlsx, .csv</p>
                </div>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
