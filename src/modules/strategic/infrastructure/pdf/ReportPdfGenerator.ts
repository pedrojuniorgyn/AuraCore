/**
 * Infrastructure: ReportPdfGenerator
 * Gerador de PDFs de relatórios estratégicos usando jsPDF
 * 
 * @module strategic/infrastructure/pdf
 */
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

import { logger } from '@/shared/infrastructure/logging';
// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
    lastAutoTable?: { finalY: number };
  }
}

export interface ReportHeader {
  title: string;
  subtitle?: string;
  organization: string;
  branch: string;
  period: string;
  logo?: string; // Base64 image
}

export interface ReportSection {
  title: string;
  content: ReportTable | ReportText | ReportChart;
}

export interface ReportTable {
  type: 'table';
  headers: string[];
  rows: Array<Array<string | number>>;
  theme?: 'striped' | 'grid' | 'plain';
}

export interface ReportText {
  type: 'text';
  text: string;
  fontSize?: number;
  bold?: boolean;
}

export interface ReportChart {
  type: 'chart';
  imageBase64: string; // Chart rendered as base64 image
  width?: number;
  height?: number;
}

export type ReportContent = ReportTable | ReportText | ReportChart;

export class ReportPdfGenerator {
  private doc: jsPDF;
  private currentY: number;
  private readonly pageHeight: number;
  private readonly marginTop = 20;
  private readonly marginBottom = 20;
  private readonly marginLeft = 14;
  private readonly marginRight = 14;
  private readonly primaryColor: [number, number, number] = [88, 86, 214]; // Purple
  private readonly textColor: [number, number, number] = [0, 0, 0];
  private readonly grayColor: [number, number, number] = [128, 128, 128];

  constructor(orientation: 'portrait' | 'landscape' = 'portrait') {
    this.doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.currentY = this.marginTop;
  }

  /**
   * Adiciona header do relatório
   */
  addHeader(header: ReportHeader): void {
    // Logo (se fornecido)
    if (header.logo) {
      try {
        this.doc.addImage(header.logo, 'PNG', this.marginLeft, this.currentY, 30, 12);
        this.currentY += 15;
      } catch (error) {
        logger.warn('Failed to add logo:', error);
      }
    }

    // Title
    this.doc.setFontSize(20);
    this.doc.setTextColor(...this.primaryColor);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(header.title, this.marginLeft, this.currentY);
    this.currentY += 8;

    // Subtitle
    if (header.subtitle) {
      this.doc.setFontSize(12);
      this.doc.setTextColor(...this.grayColor);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(header.subtitle, this.marginLeft, this.currentY);
      this.currentY += 6;
    }

    // Metadata
    this.doc.setFontSize(10);
    this.doc.setTextColor(...this.grayColor);
    this.doc.text(`Organização: ${header.organization}`, this.marginLeft, this.currentY);
    this.currentY += 5;
    this.doc.text(`Filial: ${header.branch}`, this.marginLeft, this.currentY);
    this.currentY += 5;
    this.doc.text(`Período: ${header.period}`, this.marginLeft, this.currentY);
    this.currentY += 5;
    this.doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, this.marginLeft, this.currentY);
    this.currentY += 10;

    // Separator line
    this.doc.setDrawColor(...this.grayColor);
    this.doc.line(this.marginLeft, this.currentY, this.doc.internal.pageSize.getWidth() - this.marginRight, this.currentY);
    this.currentY += 10;
  }

  /**
   * Adiciona seção ao relatório
   */
  addSection(section: ReportSection): void {
    // Check if new page is needed
    if (this.currentY > this.pageHeight - this.marginBottom - 30) {
      this.addPage();
    }

    // Section title
    this.doc.setFontSize(14);
    this.doc.setTextColor(...this.textColor);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(section.title, this.marginLeft, this.currentY);
    this.currentY += 8;

    // Section content
    this.addContent(section.content);
    this.currentY += 10;
  }

  /**
   * Adiciona conteúdo baseado no tipo
   */
  private addContent(content: ReportContent): void {
    if (content.type === 'table') {
      this.addTable(content);
    } else if (content.type === 'text') {
      this.addText(content);
    } else if (content.type === 'chart') {
      this.addChart(content);
    }
  }

  /**
   * Adiciona tabela
   */
  private addTable(table: ReportTable): void {
    this.doc.autoTable({
      startY: this.currentY,
      head: [table.headers],
      body: table.rows,
      theme: table.theme || 'striped',
      headStyles: { 
        fillColor: this.primaryColor,
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 9,
      },
      margin: { left: this.marginLeft, right: this.marginRight },
      didDrawPage: (data: Record<string, unknown>) => {
        // Footer em todas as páginas
        this.addFooter();
      },
    });

    this.currentY = this.doc.lastAutoTable?.finalY || this.currentY + 10;
  }

  /**
   * Adiciona texto
   */
  private addText(text: ReportText): void {
    this.doc.setFontSize(text.fontSize || 11);
    this.doc.setTextColor(...this.textColor);
    this.doc.setFont('helvetica', text.bold ? 'bold' : 'normal');
    
    const splitText = this.doc.splitTextToSize(
      text.text,
      this.doc.internal.pageSize.getWidth() - this.marginLeft - this.marginRight
    );
    
    this.doc.text(splitText, this.marginLeft, this.currentY);
    this.currentY += (splitText.length * (text.fontSize || 11) * 0.35) + 5;
  }

  /**
   * Adiciona gráfico (imagem)
   */
  private addChart(chart: ReportChart): void {
    try {
      const width = chart.width || 180;
      const height = chart.height || 100;

      // Check if new page is needed
      if (this.currentY + height > this.pageHeight - this.marginBottom) {
        this.addPage();
      }

      this.doc.addImage(
        chart.imageBase64,
        'PNG',
        this.marginLeft,
        this.currentY,
        width,
        height
      );
      this.currentY += height + 5;
    } catch (error) {
      logger.warn('Failed to add chart:', error);
      this.addText({
        type: 'text',
        text: '[Gráfico não disponível]',
        fontSize: 10,
      });
    }
  }

  /**
   * Adiciona nova página
   */
  private addPage(): void {
    this.doc.addPage();
    this.currentY = this.marginTop;
  }

  /**
   * Adiciona footer em todas as páginas
   */
  private addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setTextColor(...this.grayColor);
      this.doc.text(
        `Página ${i} de ${pageCount} - AuraCore ERP Logístico`,
        this.doc.internal.pageSize.getWidth() / 2,
        this.doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
  }

  /**
   * Gera buffer do PDF
   */
  generate(): Buffer {
    this.addFooter();
    return Buffer.from(this.doc.output('arraybuffer'));
  }

  /**
   * Gera base64 do PDF
   */
  generateBase64(): string {
    this.addFooter();
    return this.doc.output('datauristring');
  }
}
