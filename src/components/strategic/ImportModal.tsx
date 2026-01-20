"use client";

/**
 * ImportModal - Modal para importar dados de arquivos
 * 
 * @module components/strategic
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, FileSpreadsheet, Trash2, AlertTriangle, 
  CheckCircle, Loader2 
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ImportPreview {
  headers: string[];
  rows: ParsedRow[];
  totalRows: number;
  errors: string[];
}

interface RequiredField {
  key: string;
  label: string;
}

export type ImportEntityType = 'kpi' | 'action-plan' | 'pdca' | 'goal' | 'swot';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entityType: ImportEntityType;
  onImport: (data: ParsedRow[], mapping: Record<string, string>, entityType: ImportEntityType) => Promise<void>;
  requiredFields: RequiredField[];
}

export function ImportModal({ isOpen, onClose, entityType, onImport, requiredFields }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);

    // Parse file preview
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/strategic/import/preview', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Erro ao processar arquivo');
      }
      
      const data = await response.json() as ImportPreview;
      setPreview(data);

      // Auto-map columns
      const autoMapping: Record<string, string> = {};
      requiredFields.forEach(({ key, label }) => {
        const match = data.headers.find(
          (h) => h.toLowerCase().includes(key.toLowerCase()) ||
                 h.toLowerCase().includes(label.toLowerCase())
        );
        if (match) autoMapping[key] = match;
      });
      setMapping(autoMapping);
    } catch (error) {
      console.error('Failed to parse file:', error);
      setParseError('Erro ao processar arquivo. Verifique o formato.');
    }
  }, [requiredFields]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  });

  const handleImport = async () => {
    if (!preview) return;

    setIsImporting(true);
    try {
      // FIX Bug 3: Passar entityType para o callback
      await onImport(preview.rows, mapping, entityType);
      setIsComplete(true);
      setTimeout(() => {
        setIsComplete(false);
        onClose();
        resetState();
      }, 1500);
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setPreview(null);
    setMapping({});
    setParseError(null);
  };

  const validRows = preview ? preview.totalRows - preview.errors.length : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
              w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50"
          >
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 
              shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <Upload className="text-purple-400" />
                  Importar Dados
                </h2>
                <button
                  onClick={() => { onClose(); resetState(); }}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/50 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Dropzone */}
                {!file && (
                  <div
                    {...getRootProps()}
                    className={`
                      p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer
                      transition-all
                      ${isDragActive 
                        ? 'border-purple-500 bg-purple-500/10' 
                        : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                      }
                    `}
                  >
                    <input {...getInputProps()} />
                    <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
                    <p className="text-white font-medium">
                      {isDragActive 
                        ? 'Solte o arquivo aqui...' 
                        : 'Arraste um arquivo ou clique para selecionar'
                      }
                    </p>
                    <p className="text-white/50 text-sm mt-2">
                      Formatos aceitos: .xlsx, .csv • Máximo: 10MB
                    </p>
                  </div>
                )}

                {/* Parse Error */}
                {parseError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 
                    flex items-center gap-3">
                    <AlertTriangle className="text-red-400" />
                    <span className="text-red-300">{parseError}</span>
                  </div>
                )}

                {/* Selected File */}
                {file && !parseError && (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/10 
                    border border-green-500/20">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="text-green-400" />
                      <div>
                        <p className="text-white font-medium">{file.name}</p>
                        <p className="text-white/50 text-sm">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={resetState}
                      className="p-2 rounded-lg hover:bg-white/10 text-white/50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}

                {/* Preview Table */}
                {preview && (
                  <>
                    <div>
                      <label className="text-white/60 text-sm mb-3 block">
                        Preview dos Dados (10 primeiras linhas)
                      </label>
                      <div className="overflow-x-auto rounded-xl border border-white/10">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-white/5">
                              {preview.headers.map((header) => (
                                <th key={header} className="px-4 py-2 text-left text-white/70 font-medium whitespace-nowrap">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {preview.rows.slice(0, 10).map((row, i) => (
                              <tr key={i} className="border-t border-white/10">
                                {preview.headers.map((header) => (
                                  <td key={header} className="px-4 py-2 text-white/80 whitespace-nowrap">
                                    {String(row[header] ?? '-')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Column Mapping */}
                    <div>
                      <label className="text-white/60 text-sm mb-3 block">
                        Mapeamento de Colunas
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {requiredFields.map(({ key, label }) => (
                          <div key={key} className="flex items-center gap-3">
                            <span className="text-white text-sm w-28 flex-shrink-0">{label}:</span>
                            <select
                              value={mapping[key] || ''}
                              onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                              className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/10 
                                text-white text-sm focus:outline-none focus:border-purple-500/50"
                            >
                              <option value="">Selecione...</option>
                              {preview.headers.map((header) => (
                                <option key={header} value={header}>{header}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Errors Warning */}
                    {preview.errors.length > 0 && (
                      <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 
                        flex items-start gap-3">
                        <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-yellow-300 font-medium">
                            {preview.errors.length} registro(s) com erros serão ignorados
                          </p>
                          <ul className="text-yellow-300/70 text-sm mt-1 list-disc list-inside">
                            {preview.errors.slice(0, 3).map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                            {preview.errors.length > 3 && (
                              <li>...e mais {preview.errors.length - 3} erros</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 flex justify-between items-center">
                <span className="text-white/50 text-sm">
                  {preview && `${validRows} registros válidos`}
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => { onClose(); resetState(); }}
                    className="px-6 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!preview || validRows === 0 || isImporting || isComplete}
                    className="px-6 py-2 rounded-xl bg-purple-500 text-white 
                      hover:bg-purple-600 transition-all flex items-center gap-2
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isComplete ? (
                      <>
                        <CheckCircle size={18} /> Importado!
                      </>
                    ) : isImporting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Importando...
                      </>
                    ) : (
                      <>
                        <Upload size={18} /> Importar {validRows} registros
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
