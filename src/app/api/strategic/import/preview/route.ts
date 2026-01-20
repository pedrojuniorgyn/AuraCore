/**
 * API: POST /api/strategic/import/preview
 * Faz parse de arquivo e retorna preview para importação
 * 
 * @module app/api/strategic/import/preview
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

interface ParsedRow {
  [key: string]: string | number | null;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Verificar tamanho máximo (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 });
    }

    // Verificar tipo de arquivo
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'text/csv',
      'application/vnd.ms-excel', // xls
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Invalid file type. Use .xlsx or .csv' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    // FIX Bug 2: Verificar se há sheets no arquivo
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json({ 
        error: 'O arquivo não contém nenhuma planilha válida' 
      }, { status: 400 });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // FIX: Verificar se a sheet existe
    if (!sheet) {
      return NextResponse.json({ 
        error: 'A planilha está vazia ou corrompida' 
      }, { status: 400 });
    }

    const data = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: null });

    // FIX: Verificar se há dados na planilha
    if (!data || data.length === 0) {
      return NextResponse.json({
        headers: [],
        rows: [],
        totalRows: 0,
        errors: ['A planilha não contém dados'],
      });
    }

    const headers = Object.keys(data[0]);
    const errors: string[] = [];

    // Validação básica de cada linha
    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 porque linha 1 é header e índice começa em 0
      
      // Verificar se tem pelo menos uma coluna preenchida
      const hasData = headers.some(h => row[h] !== null && row[h] !== '');
      if (!hasData) {
        errors.push(`Linha ${rowNum}: Linha vazia`);
      }

      // Verificar campos comuns que podem ser obrigatórios
      const codeField = headers.find(h => 
        h.toLowerCase().includes('código') || 
        h.toLowerCase().includes('codigo') || 
        h.toLowerCase() === 'code'
      );
      
      if (codeField && !row[codeField]) {
        errors.push(`Linha ${rowNum}: ${codeField} não preenchido`);
      }
    });

    return NextResponse.json({
      headers,
      rows: data,
      totalRows: data.length,
      errors: errors.slice(0, 50), // Limitar a 50 erros para não sobrecarregar
    });
  } catch (error) {
    console.error('POST /api/strategic/import/preview error:', error);
    return NextResponse.json(
      { error: 'Failed to parse file' },
      { status: 500 }
    );
  }
}
