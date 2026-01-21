/**
 * API Route para importação de documentos fiscais via Agno.
 * 
 * POST /api/agents/documents/import
 * 
 * Suporta upload de PDFs (DANFe, DACTe) para extração de dados
 * usando Docling (IBM) com alta precisão em tabelas.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const AGENTS_API_URL = process.env.AGENTS_API_URL || 'http://localhost:8080';

interface ImportResponse {
  success: boolean;
  extracted_data?: {
    document_type: string;
    access_key: string | null;
    number: string | null;
    series: string | null;
    issue_date: string | null;
    issuer_document: string | null;
    issuer_name: string | null;
    recipient_document: string | null;
    recipient_name: string | null;
    total_products: number | null;
    total_value: number | null;
    icms_value: number | null;
    items_count: number;
    items: Array<{
      codigo: string;
      descricao: string;
      quantidade: number;
      valor_total: number;
    }>;
    confidence_score: number;
    warnings: string[];
  };
  created_record_id?: string | null;
  sefaz_valid?: boolean | null;
  sefaz_status?: string | null;
  warnings?: string[];
  errors?: string[];
  message: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ImportResponse | { error: string }>> {
  try {
    // 1. Autenticação
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // 2. Parse do FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = (formData.get('documentType') as string) || 'auto';
    // validateSefaz: default true (consistente com backend Python)
    const validateSefazParam = formData.get('validateSefaz');
    const validateSefaz = validateSefazParam === null 
      ? true  // Default true (igual ao backend)
      : validateSefazParam === 'true';
    const createRecord = formData.get('createRecord') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo é obrigatório' },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Apenas arquivos PDF são suportados' },
        { status: 400 }
      );
    }

    // Validar tamanho (máximo 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo: 10MB' },
        { status: 400 }
      );
    }

    // 3. Converter para base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // 4. Validar branch_id (NUNCA usar organizationId como fallback - tipos diferentes!)
    if (!session.user.defaultBranchId) {
      return NextResponse.json(
        { error: 'Branch não configurado para o usuário. Configure um branch padrão nas configurações.' },
        { status: 400 }
      );
    }

    // 5. Chamar Fiscal Agent via tool endpoint
    const response = await fetch(`${AGENTS_API_URL}/api/v1/tools/fiscal/document_importer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_id: session.user.organizationId,
        branch_id: session.user.defaultBranchId,
        document_type: documentType,
        file_base64: base64,
        validate_sefaz: validateSefaz,
        create_record: createRecord,
        dry_run: !createRecord,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Agents API error:', errorText);
      return NextResponse.json(
        { error: 'Erro ao processar documento no serviço de agentes' },
        { status: 502 }
      );
    }

    const result: ImportResponse = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return error as any as NextResponse<ImportResponse | { error: string }>;
    }
    console.error('Erro na importação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/documents/import
 * 
 * Retorna informações sobre os tipos de documentos suportados.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    supported_types: [
      {
        type: 'danfe',
        name: 'DANFe - Documento Auxiliar da Nota Fiscal Eletrônica',
        description: 'PDF da nota fiscal eletrônica',
        status: 'available',
      },
      {
        type: 'dacte',
        name: 'DACTe - Documento Auxiliar do Conhecimento de Transporte',
        description: 'PDF do conhecimento de transporte eletrônico',
        status: 'coming_soon',
      },
    ],
    max_file_size: '10MB',
    accepted_formats: ['application/pdf'],
    extraction_engine: 'Docling (IBM)',
    accuracy: {
      tables: '97.9%',
      text: '95%+',
    },
  });
}
