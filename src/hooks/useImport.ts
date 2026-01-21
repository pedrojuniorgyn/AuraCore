'use client';

import { useState, useCallback } from 'react';
import type {
  ImportMapping,
  ImportValidationResult,
  ImportResult,
  ExportEntity,
} from '@/lib/export/export-types';

type ImportStep = 'upload' | 'mapping' | 'validation' | 'importing' | 'complete';

interface UseImportReturn {
  step: ImportStep;
  file: File | null;
  columns: string[];
  mappings: ImportMapping[];
  validation: ImportValidationResult | null;
  result: ImportResult | null;
  isProcessing: boolean;
  error: Error | null;

  setFile: (file: File) => Promise<void>;
  setMappings: (mappings: ImportMapping[]) => void;
  validate: () => Promise<void>;
  importData: () => Promise<void>;
  goBack: () => void;
  reset: () => void;
}

export function useImport(entity: ExportEntity): UseImportReturn {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFileState] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [mappings, setMappingsState] = useState<ImportMapping[]>([]);
  const [validation, setValidation] = useState<ImportValidationResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const setFile = useCallback(
    async (newFile: File) => {
      setIsProcessing(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', newFile);
        formData.append('entity', entity);

        const response = await fetch('/api/strategic/import/parse', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Failed to parse file');

        const data = await response.json();

        setFileState(newFile);
        setColumns(data.columns);

        // Auto-map columns based on name similarity
        const autoMappings: ImportMapping[] = data.columns.map((col: string) => ({
          sourceColumn: col,
          targetField: data.suggestedMappings[col] || '',
          transform: 'none' as const,
        }));

        setMappingsState(autoMappings);
        setStep('mapping');
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to parse file'));
      } finally {
        setIsProcessing(false);
      }
    },
    [entity]
  );

  const setMappings = useCallback((newMappings: ImportMapping[]) => {
    setMappingsState(newMappings);
  }, []);

  const validate = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity', entity);
      formData.append('mappings', JSON.stringify(mappings));

      const response = await fetch('/api/strategic/import/validate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Validation failed');

      const data = await response.json();
      setValidation(data);
      setStep('validation');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Validation failed'));
    } finally {
      setIsProcessing(false);
    }
  }, [file, entity, mappings]);

  const importData = useCallback(async () => {
    if (!file || !validation) return;

    setIsProcessing(true);
    setStep('importing');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity', entity);
      formData.append('mappings', JSON.stringify(mappings));
      formData.append(
        'options',
        JSON.stringify({
          mode: 'create',
          skipErrors: true,
          dryRun: false,
        })
      );

      const response = await fetch('/api/strategic/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Import failed');

      const data = await response.json();
      setResult(data);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Import failed'));
      setStep('validation');
    } finally {
      setIsProcessing(false);
    }
  }, [file, entity, mappings, validation]);

  const goBack = useCallback(() => {
    switch (step) {
      case 'mapping':
        setStep('upload');
        setFileState(null);
        setColumns([]);
        break;
      case 'validation':
        setStep('mapping');
        setValidation(null);
        break;
    }
  }, [step]);

  const reset = useCallback(() => {
    setStep('upload');
    setFileState(null);
    setColumns([]);
    setMappingsState([]);
    setValidation(null);
    setResult(null);
    setError(null);
  }, []);

  return {
    step,
    file,
    columns,
    mappings,
    validation,
    result,
    isProcessing,
    error,
    setFile,
    setMappings,
    validate,
    importData,
    goBack,
    reset,
  };
}
