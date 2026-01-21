/**
 * API: POST /api/strategic/import/validate
 * Valida dados antes de importar
 *
 * @module app/api/strategic/import/validate
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as XLSX from 'xlsx';
import type {
  ImportMapping,
  ImportValidationResult,
  ImportIssue,
  ImportPreviewRow,
  ExportEntity,
} from '@/lib/export/export-types';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const entity = formData.get('entity') as ExportEntity;
    const mappingsJson = formData.get('mappings') as string;

    if (!file || !entity || !mappingsJson) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const mappings: ImportMapping[] = JSON.parse(mappingsJson);

    // Ler arquivo
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);

    const issues: ImportIssue[] = [];
    const preview: ImportPreviewRow[] = [];

    let validRows = 0;
    let warningRows = 0;
    let errorRows = 0;

    // Verificar se campos obrigatórios estão mapeados
    const mappedFields = mappings.filter((m) => m.targetField).map((m) => m.targetField);
    if (!mappedFields.includes('name')) {
      issues.push({
        row: 0,
        type: 'error',
        message: 'Campo "Nome" não está mapeado e é obrigatório',
      });
    }
    if (entity === 'kpi' && !mappedFields.includes('code')) {
      issues.push({
        row: 0,
        type: 'warning',
        message: 'Campo "Código" não está mapeado. Códigos serão gerados automaticamente.',
      });
    }

    // Validar cada linha
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 porque linha 1 é header
      const rowIssues: ImportIssue[] = [];

      // Mapear e validar dados
      const mappedData: Record<string, unknown> = {};
      for (const mapping of mappings) {
        if (mapping.targetField && mapping.sourceColumn) {
          const value = row[mapping.sourceColumn];
          mappedData[mapping.targetField] = value;

          // Validar campo obrigatório
          if (mapping.targetField === 'name' && !value) {
            rowIssues.push({
              row: rowNumber,
              column: mapping.sourceColumn,
              type: 'error',
              message: 'Campo "Nome" está vazio (obrigatório)',
            });
          }

          // Validar tipos
          if (mapping.targetField === 'targetValue' && value) {
            const numValue = parseFloat(String(value));
            if (isNaN(numValue)) {
              rowIssues.push({
                row: rowNumber,
                column: mapping.sourceColumn,
                type: 'warning',
                message: `Valor "${value}" não é um número válido`,
                suggestion: 'O valor será ignorado',
              });
            }
          }
        }
      }

      // Classificar linha
      const hasErrors = rowIssues.some((i) => i.type === 'error');
      const hasWarnings = rowIssues.some((i) => i.type === 'warning');

      if (hasErrors) {
        errorRows++;
      } else if (hasWarnings) {
        warningRows++;
      } else {
        validRows++;
      }

      // Adicionar issues
      issues.push(...rowIssues);

      // Adicionar preview (primeiras 10 linhas)
      if (i < 10) {
        preview.push({
          rowNumber,
          status: hasErrors ? 'error' : hasWarnings ? 'warning' : 'valid',
          data: mappedData,
          issues: rowIssues,
        });
      }
    }

    const result: ImportValidationResult = {
      isValid: errorRows === 0,
      totalRows: data.length,
      validRows,
      warningRows,
      errorRows,
      issues: issues.slice(0, 50), // Limitar issues retornados
      preview,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/strategic/import/validate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
