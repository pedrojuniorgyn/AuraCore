/**
 * Serviço de exportação de dados
 * @module lib/export/export-service
 */

import type {
  ExportOptions,
  ExportResult,
  ExportEntity,
  ExportFormat,
} from './export-types';

class ExportService {
  async export(options: ExportOptions): Promise<ExportResult> {
    const response = await fetch('/api/strategic/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.json();
  }

  async exportPdf(options: ExportOptions): Promise<Blob> {
    const response = await fetch('/api/strategic/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error('PDF export failed');
    }

    return response.blob();
  }

  async downloadTemplate(entity: ExportEntity): Promise<Blob> {
    const response = await fetch(`/api/strategic/export/template?entity=${entity}`);

    if (!response.ok) {
      throw new Error('Template download failed');
    }

    return response.blob();
  }

  downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  getFileName(entity: ExportEntity, format: ExportFormat): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const entityNames: Record<ExportEntity, string> = {
      kpi: 'kpis',
      action_plan: 'planos-acao',
      pdca_cycle: 'ciclos-pdca',
      goal: 'metas',
      dashboard_config: 'config-dashboard',
    };

    return `${entityNames[entity]}_${timestamp}.${format === 'excel' ? 'xlsx' : format}`;
  }
}

export const exportService = new ExportService();
