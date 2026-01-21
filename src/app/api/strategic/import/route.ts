/**
 * API: POST /api/strategic/import
 * Importa dados de arquivo Excel/CSV
 *
 * @module app/api/strategic/import
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as XLSX from 'xlsx';
import type { ImportMapping, ImportResult, ExportEntity } from '@/lib/export/export-types';

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
    const optionsJson = formData.get('options') as string;

    if (!file || !entity || !mappingsJson) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const mappings: ImportMapping[] = JSON.parse(mappingsJson);
    const options = optionsJson ? JSON.parse(optionsJson) : {};

    // Ler arquivo
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: ImportResult['errors'] = [];

    // Processar cada linha
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 porque linha 1 é header

      try {
        // Mapear colunas
        const mappedData: Record<string, unknown> = {};
        for (const mapping of mappings) {
          if (mapping.targetField && mapping.sourceColumn) {
            let value = row[mapping.sourceColumn];

            // Aplicar transformação
            if (value !== undefined && value !== null) {
              switch (mapping.transform) {
                case 'uppercase':
                  value = String(value).toUpperCase();
                  break;
                case 'lowercase':
                  value = String(value).toLowerCase();
                  break;
                case 'trim':
                  value = String(value).trim();
                  break;
                case 'number':
                  value = parseFloat(String(value)) || 0;
                  break;
                case 'date':
                  value = new Date(String(value)).toISOString();
                  break;
              }
            }

            mappedData[mapping.targetField] = value ?? mapping.defaultValue;
          }
        }

        // Validar campos obrigatórios
        if (!mappedData.name) {
          if (options.skipErrors) {
            skipped++;
            errors.push({
              row: rowNumber,
              type: 'error',
              message: 'Campo "Nome" é obrigatório',
            });
            continue;
          } else {
            throw new Error('Campo "Nome" é obrigatório');
          }
        }

        // TODO: Em produção, salvar no banco de dados
        // switch (entity) {
        //   case 'kpi':
        //     await kpiRepository.create(mappedData);
        //     break;
        //   case 'action_plan':
        //     await actionPlanRepository.create(mappedData);
        //     break;
        // }

        console.log('Importing row:', { entity, rowNumber, mappedData });

        if (options.mode === 'update') {
          updated++;
        } else {
          created++;
        }
      } catch (err) {
        if (options.skipErrors) {
          skipped++;
          errors.push({
            row: rowNumber,
            type: 'error',
            message: err instanceof Error ? err.message : 'Erro desconhecido',
          });
        } else {
          throw err;
        }
      }
    }

    const result: ImportResult = {
      success: true,
      totalProcessed: data.length,
      created,
      updated,
      skipped,
      errors,
    };

    return NextResponse.json(result);
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error('POST /api/strategic/import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
