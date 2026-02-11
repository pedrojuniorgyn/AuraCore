/**
 * API: GET /api/strategic/export/template
 * Retorna template Excel para importação
 *
 * @module app/api/strategic/export/template
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as XLSX from 'xlsx';
import type { ExportEntity } from '@/lib/export/export-types';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
const KPI_TEMPLATE_DATA = [
  {
    Código: 'KPI-001',
    Nome: 'Exemplo KPI',
    Descrição: 'Descrição do KPI',
    Perspectiva: 'Financeira',
    Unidade: '%',
    'Valor Meta': 100,
    'Valor Atual': 80,
    Frequência: 'Mensal',
    Responsável: 'João Silva',
  },
];

const ACTION_PLAN_TEMPLATE_DATA = [
  {
    Nome: 'Exemplo Plano de Ação',
    Descrição: 'Descrição do plano',
    'O Quê': 'Objetivo do plano',
    'Por Quê': 'Justificativa',
    Onde: 'Local de execução',
    Quem: 'Responsável',
    Quando: '2026-02-15',
    Como: 'Metodologia',
    Quanto: 10000,
    Prioridade: 'Alta',
    Status: 'Não Iniciado',
  },
];

export const GET = withDI(async (request: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity') as ExportEntity;

    if (!entity) {
      return NextResponse.json({ error: 'Entity parameter required' }, { status: 400 });
    }

    let templateData: Record<string, unknown>[];
    let fileName: string;

    switch (entity) {
      case 'kpi':
        templateData = KPI_TEMPLATE_DATA;
        fileName = 'template_kpis.xlsx';
        break;
      case 'action_plan':
        templateData = ACTION_PLAN_TEMPLATE_DATA;
        fileName = 'template_planos_acao.xlsx';
        break;
      default:
        templateData = [{ Coluna1: 'Valor1', Coluna2: 'Valor2' }];
        fileName = `template_${entity}.xlsx`;
    }

    // Criar workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Adicionar estilos básicos (largura das colunas)
    const colWidths = Object.keys(templateData[0]).map((key) => ({
      wch: Math.max(key.length + 2, 15),
    }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    // Adicionar aba de instruções
    const instructions = [
      { Instrução: 'Preencha os dados seguindo o formato do exemplo acima' },
      { Instrução: 'Não altere os nomes das colunas' },
      { Instrução: 'Campos obrigatórios: Nome, Código (para KPIs)' },
      { Instrução: 'Datas no formato: YYYY-MM-DD' },
      { Instrução: 'Valores numéricos sem formatação' },
    ];
    const wsInstructions = XLSX.utils.json_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instruções');

    // Gerar buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('GET /api/strategic/export/template error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
