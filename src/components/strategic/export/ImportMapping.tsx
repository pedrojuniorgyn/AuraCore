'use client';

import { memo } from 'react';
import { ArrowRight } from 'lucide-react';
import type { ImportMapping as ImportMappingType, FieldDefinition } from '@/lib/export/export-types';

interface ImportMappingProps {
  columns: string[];
  mappings: ImportMappingType[];
  fields: FieldDefinition[];
  onChange: (mappings: ImportMappingType[]) => void;
}

function ImportMappingInner({ columns, mappings, fields, onChange }: ImportMappingProps) {
  const handleFieldChange = (sourceColumn: string, targetField: string) => {
    const newMappings = mappings.map((m) =>
      m.sourceColumn === sourceColumn ? { ...m, targetField } : m
    );
    onChange(newMappings);
  };

  const handleTransformChange = (
    sourceColumn: string,
    transform: ImportMappingType['transform']
  ) => {
    const newMappings = mappings.map((m) =>
      m.sourceColumn === sourceColumn ? { ...m, transform } : m
    );
    onChange(newMappings);
  };

  return (
    <div className="space-y-4">
      <p className="text-white/60 text-sm">
        Mapeie as colunas do arquivo para os campos do sistema:
      </p>

      <div className="border border-white/10 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-3 gap-4 px-4 py-3 bg-white/5 border-b border-white/10">
          <div className="text-white/60 text-sm font-medium">Coluna do Arquivo</div>
          <div className="text-white/60 text-sm font-medium">Campo do Sistema</div>
          <div className="text-white/60 text-sm font-medium">Exemplo</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/10 max-h-[300px] overflow-y-auto">
          {columns.map((column, index) => {
            const mapping = mappings.find((m) => m.sourceColumn === column);
            const selectedField = fields.find((f) => f.name === mapping?.targetField);

            return (
              <div
                key={column}
                className="grid grid-cols-3 gap-4 px-4 py-3 items-center 
                  hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm">{column}</span>
                  <ArrowRight size={14} className="text-white/40" />
                </div>

                <select
                  value={mapping?.targetField || ''}
                  onChange={(e) => handleFieldChange(column, e.target.value)}
                  className="w-full px-3 py-1.5 bg-white/5 border border-white/10 
                    rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="" className="bg-gray-900">
                    -- Ignorar --
                  </option>
                  {fields.map((field) => (
                    <option key={field.name} value={field.name} className="bg-gray-900">
                      {field.label}
                      {field.required ? ' *' : ''}
                    </option>
                  ))}
                </select>

                <div className="text-white/40 text-sm truncate">
                  {/* Placeholder for example data */}
                  Linha {index + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-white/40 text-xs">* Campos obrigatórios</p>
    </div>
  );
}

export const ImportMapping = memo(ImportMappingInner);
