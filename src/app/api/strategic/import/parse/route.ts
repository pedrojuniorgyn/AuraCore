/**
 * API: POST /api/strategic/import/parse
 * Faz parse de arquivo e retorna colunas
 *
 * @module app/api/strategic/import/parse
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as XLSX from 'xlsx';
import type { ExportEntity } from '@/lib/export/export-types';
import { KPI_FIELDS, ACTION_PLAN_FIELDS } from '@/lib/export/export-types';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
// Mapeamento de nomes de coluna para campos
const COLUMN_MAPPINGS: Record<string, Record<string, string>> = {
  kpi: {
    nome: 'name',
    name: 'name',
    código: 'code',
    codigo: 'code',
    code: 'code',
    descrição: 'description',
    descricao: 'description',
    description: 'description',
    perspectiva: 'perspective',
    perspective: 'perspective',
    unidade: 'unit',
    unit: 'unit',
    meta: 'targetValue',
    'valor meta': 'targetValue',
    target: 'targetValue',
    atual: 'currentValue',
    'valor atual': 'currentValue',
    current: 'currentValue',
    frequência: 'frequency',
    frequencia: 'frequency',
    frequency: 'frequency',
    responsável: 'responsible',
    responsavel: 'responsible',
    responsible: 'responsible',
  },
  action_plan: {
    nome: 'name',
    name: 'name',
    descrição: 'description',
    descricao: 'description',
    description: 'description',
    'o quê': 'what',
    'o que': 'what',
    what: 'what',
    'por quê': 'why',
    'por que': 'why',
    why: 'why',
    onde: 'where',
    where: 'where',
    quem: 'who',
    who: 'who',
    quando: 'when',
    when: 'when',
    como: 'how',
    how: 'how',
    quanto: 'howMuch',
    'how much': 'howMuch',
    prioridade: 'priority',
    priority: 'priority',
    status: 'status',
  },
};

export const POST = withDI(async (request: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const entity = formData.get('entity') as ExportEntity;

    if (!file || !entity) {
      return NextResponse.json({ error: 'Missing file or entity' }, { status: 400 });
    }

    // Ler arquivo
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Obter colunas (primeira linha)
    const data: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);
    if (data.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    const columns = Object.keys(data[0]);

    // Sugerir mapeamentos
    const mappingDict = COLUMN_MAPPINGS[entity] || {};
    const suggestedMappings: Record<string, string> = {};

    for (const column of columns) {
      const normalizedColumn = column.toLowerCase().trim();
      const mappedField = mappingDict[normalizedColumn];
      if (mappedField) {
        suggestedMappings[column] = mappedField;
      }
    }

    // Obter preview dos dados
    const preview = data.slice(0, 5).map((row, index) => ({
      rowNumber: index + 2,
      data: row,
    }));

    return NextResponse.json({
      columns,
      suggestedMappings,
      preview,
      totalRows: data.length,
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('POST /api/strategic/import/parse error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
