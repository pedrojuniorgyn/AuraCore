'use client';

import { useState, useCallback } from 'react';
import { exportService } from '@/lib/export/export-service';
import type {
  ExportOptions,
  ExportResult,
  ExportEntity,
} from '@/lib/export/export-types';

interface UseExportReturn {
  isExporting: boolean;
  progress: number;
  error: Error | null;
  lastResult: ExportResult | null;

  exportData: (options: ExportOptions) => Promise<void>;
  exportPdf: (options: ExportOptions) => Promise<void>;
  downloadTemplate: (entity: ExportEntity) => Promise<void>;
  reset: () => void;
}

export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [lastResult, setLastResult] = useState<ExportResult | null>(null);

  const exportData = useCallback(async (options: ExportOptions) => {
    setIsExporting(true);
    setProgress(0);
    setError(null);

    try {
      setProgress(20);
      const result = await exportService.export(options);
      setProgress(80);

      // Download the file
      const response = await fetch(result.downloadUrl);
      const blob = await response.blob();

      const fileName = exportService.getFileName(options.entities[0], options.format);

      exportService.downloadBlob(blob, fileName);
      setProgress(100);
      setLastResult(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Export failed'));
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportPdf = useCallback(async (options: ExportOptions) => {
    setIsExporting(true);
    setProgress(0);
    setError(null);

    try {
      setProgress(30);
      const blob = await exportService.exportPdf(options);
      setProgress(90);

      const fileName = exportService.getFileName(options.entities[0], 'pdf');
      exportService.downloadBlob(blob, fileName);

      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('PDF export failed'));
    } finally {
      setIsExporting(false);
    }
  }, []);

  const downloadTemplate = useCallback(async (entity: ExportEntity) => {
    setIsExporting(true);
    setError(null);

    try {
      const blob = await exportService.downloadTemplate(entity);
      const fileName = `template_${entity}.xlsx`;
      exportService.downloadBlob(blob, fileName);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Template download failed'));
    } finally {
      setIsExporting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsExporting(false);
    setProgress(0);
    setError(null);
    setLastResult(null);
  }, []);

  return {
    isExporting,
    progress,
    error,
    lastResult,
    exportData,
    exportPdf,
    downloadTemplate,
    reset,
  };
}
