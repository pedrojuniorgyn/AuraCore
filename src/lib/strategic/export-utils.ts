/**
 * Utilitários para exportação de dados em diferentes formatos
 * 
 * @module lib/strategic/export-utils
 */
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/** Type extension for jspdf-autotable plugin property */
interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}

export interface KpiExportData {
  code: string;
  name: string;
  target: string | number;
  current: string | number;
  status: string;
  perspective?: string;
}

export interface ActionPlanExportData {
  code: string;
  title: string;
  responsible: string;
  deadline: string;
  status: string;
}

export interface ExportData {
  kpis?: KpiExportData[];
  actionPlans?: ActionPlanExportData[];
  pdcaCycles?: Record<string, unknown>[];
  swotItems?: Record<string, unknown>[];
  goals?: Record<string, unknown>[];
}

/**
 * Exporta dados para Excel (.xlsx)
 */
export async function exportToExcel(data: ExportData, filename: string): Promise<void> {
  const workbook = XLSX.utils.book_new();

  if (data.kpis?.length) {
    const ws = XLSX.utils.json_to_sheet(data.kpis);
    XLSX.utils.book_append_sheet(workbook, ws, 'KPIs');
  }

  if (data.actionPlans?.length) {
    const ws = XLSX.utils.json_to_sheet(data.actionPlans);
    XLSX.utils.book_append_sheet(workbook, ws, 'Planos de Ação');
  }

  if (data.pdcaCycles?.length) {
    const ws = XLSX.utils.json_to_sheet(data.pdcaCycles);
    XLSX.utils.book_append_sheet(workbook, ws, 'Ciclos PDCA');
  }

  if (data.swotItems?.length) {
    const ws = XLSX.utils.json_to_sheet(data.swotItems);
    XLSX.utils.book_append_sheet(workbook, ws, 'SWOT');
  }

  if (data.goals?.length) {
    const ws = XLSX.utils.json_to_sheet(data.goals);
    XLSX.utils.book_append_sheet(workbook, ws, 'Objetivos');
  }

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  saveAs(blob, `${filename}.xlsx`);
}

/**
 * Exporta dados para PDF
 */
export async function exportToPdf(
  data: ExportData, 
  filename: string, 
  options?: { includeCharts?: boolean }
): Promise<void> {
  const doc = new jsPDF();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.text('Relatório Estratégico', 14, yPos);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, yPos + 8);
  doc.setTextColor(0);
  yPos += 25;

  // KPIs Table
  if (data.kpis?.length) {
    doc.setFontSize(14);
    doc.text('KPIs', 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Código', 'Nome', 'Meta', 'Atual', 'Status']],
      body: data.kpis.map(k => [
        k.code, 
        k.name, 
        String(k.target), 
        String(k.current), 
        k.status
      ]),
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] }, // Purple
      styles: { fontSize: 9 },
    });

    yPos = (doc as unknown as JsPDFWithAutoTable).lastAutoTable.finalY + 15;
  }

  // Action Plans Table
  if (data.actionPlans?.length) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('Planos de Ação', 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Código', 'Título', 'Responsável', 'Prazo', 'Status']],
      body: data.actionPlans.map(p => [
        p.code, 
        p.title, 
        p.responsible, 
        p.deadline, 
        p.status
      ]),
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
      styles: { fontSize: 9 },
    });
  }

  // PDCA Cycles
  if (data.pdcaCycles?.length) {
    doc.addPage();
    yPos = 20;

    doc.setFontSize(14);
    doc.text('Ciclos PDCA', 14, yPos);
    yPos += 5;

    const headers = Object.keys(data.pdcaCycles[0]);
    autoTable(doc, {
      startY: yPos,
      head: [headers],
      body: data.pdcaCycles.map(c => headers.map(h => String(c[h] ?? ''))),
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
      styles: { fontSize: 9 },
    });
  }

  doc.save(`${filename}.pdf`);
}

/**
 * Exporta dados para CSV
 */
export async function exportToCsv(
  data: Record<string, unknown>[], 
  filename: string
): Promise<void> {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(h => {
        const value = row[h];
        const stringValue = value === null || value === undefined ? '' : String(value);
        // Escape quotes and wrap in quotes if contains comma or quote
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${filename}.csv`);
}

/**
 * Formata o nome do arquivo com timestamp
 */
export function generateExportFilename(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const time = new Date().toTimeString().slice(0, 5).replace(':', '');
  return `${prefix}_${date}_${time}`;
}
