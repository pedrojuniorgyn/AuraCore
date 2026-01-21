/**
 * API: POST /api/strategic/export/pdf
 * Gera PDF de dados estratégicos
 *
 * @module app/api/strategic/export/pdf
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { ExportOptions } from '@/lib/export/export-types';

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const options: ExportOptions = await request.json();

    // Criar PDF
    const doc = new jsPDF({
      orientation: options.options?.orientation || 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Header
    doc.setFontSize(20);
    doc.setTextColor(88, 86, 214); // Purple
    doc.text('AuraCore - Relatório Estratégico', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    let yPosition = 40;

    // KPIs Section
    if (options.entities.includes('kpi')) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('KPIs', 14, yPosition);
      yPosition += 10;

      // Mock data - em produção, buscar do banco
      const kpiData = [
        ['KPI-001', 'Receita Bruta', '5.000.000', '4.200.000', 'Financeira', 'Em Dia'],
        ['KPI-002', 'NPS', '80', '72', 'Cliente', 'Atenção'],
        ['KPI-003', 'OTD', '95%', '67%', 'Processos', 'Crítico'],
        ['KPI-004', 'Horas de Treinamento', '40h', '48h', 'Aprendizado', 'Em Dia'],
      ];

      doc.autoTable({
        startY: yPosition,
        head: [['Código', 'Nome', 'Meta', 'Atual', 'Perspectiva', 'Status']],
        body: kpiData,
        theme: 'striped',
        headStyles: { fillColor: [88, 86, 214] },
        margin: { left: 14, right: 14 },
      });

      yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    }

    // Action Plans Section
    if (options.entities.includes('action_plan')) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Planos de Ação', 14, yPosition);
      yPosition += 10;

      const actionPlanData = [
        ['PDC-001', 'Melhorar processo de entrega', 'João Silva', '15/02/2026', 'Em Andamento'],
        ['PDC-002', 'Implementar NPS automatizado', 'Maria Santos', '01/03/2026', 'Pendente'],
        ['PDC-003', 'Treinamento equipe comercial', 'Pedro Lima', '28/02/2026', 'Concluído'],
      ];

      doc.autoTable({
        startY: yPosition,
        head: [['Código', 'Título', 'Responsável', 'Prazo', 'Status']],
        body: actionPlanData,
        theme: 'striped',
        headStyles: { fillColor: [88, 86, 214] },
        margin: { left: 14, right: 14 },
      });

      yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    }

    // PDCA Cycles Section
    if (options.entities.includes('pdca_cycle')) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Ciclos PDCA', 14, yPosition);
      yPosition += 10;

      const pdcaData = [
        ['PDCA-001', 'Ciclo OTD', 'DO', '01/01/2026', '45%'],
        ['PDCA-002', 'Ciclo NPS', 'PLAN', '10/01/2026', '20%'],
      ];

      doc.autoTable({
        startY: yPosition,
        head: [['Código', 'Título', 'Fase', 'Início', 'Progresso']],
        body: pdcaData,
        theme: 'striped',
        headStyles: { fillColor: [88, 86, 214] },
        margin: { left: 14, right: 14 },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Página ${i} de ${pageCount} - AuraCore ERP`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Gerar buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio_estrategico_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('POST /api/strategic/export/pdf error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
