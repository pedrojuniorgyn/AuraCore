"use client";

/**
 * ChangesDiff - Exibe diferenças entre valores antigos e novos
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';

export interface Change {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

interface Props {
  changes: Change[];
}

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

export function ChangesDiff({ changes }: Props) {
  return (
    <div className="space-y-3">
      {changes.map((change, i) => (
        <motion.div
          key={change.field}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-xl bg-white/5 border border-white/10 overflow-hidden"
        >
          {/* Field Name */}
          <div className="px-4 py-2 bg-white/5 border-b border-white/10">
            <span className="text-white/70 font-mono text-sm">{change.field}</span>
          </div>

          {/* Values */}
          <div className="p-4 space-y-2">
            {/* Old Value */}
            <div className="flex items-start gap-2">
              <div className="p-1 rounded bg-red-500/20">
                <Minus size={12} className="text-red-400" />
              </div>
              <pre className="text-red-400 text-sm font-mono flex-1 whitespace-pre-wrap break-all">
                {formatValue(change.oldValue)}
              </pre>
            </div>

            {/* New Value */}
            <div className="flex items-start gap-2">
              <div className="p-1 rounded bg-green-500/20">
                <Plus size={12} className="text-green-400" />
              </div>
              <pre className="text-green-400 text-sm font-mono flex-1 whitespace-pre-wrap break-all">
                {formatValue(change.newValue)}
              </pre>
            </div>
          </div>
        </motion.div>
      ))}

      {changes.length === 0 && (
        <div className="text-center py-8 text-white/40">
          Nenhuma alteração registrada
        </div>
      )}
    </div>
  );
}
