/**
 * JobType - Value Object para tipo de job
 * 
 * Define os tipos de processamento disponíveis para documentos
 */
import { ValueObject, Result } from '@/shared/domain';

const VALID_JOB_TYPES = [
  'FISCAL_PDF_EXTRACT',      // Extração de dados de PDF fiscal
  'FINANCIAL_OFX_IMPORT',    // Importação de extrato OFX
  'OCR_PROCESS',             // Processamento OCR genérico
  'DOCUMENT_VALIDATION',     // Validação de documento
  'ARCHIVE_COMPRESS',        // Compressão para arquivo
] as const;

export type JobTypeValue = typeof VALID_JOB_TYPES[number];

interface JobTypeProps extends Record<string, unknown> {
  value: JobTypeValue;
  description: string;
}

const JOB_TYPE_DESCRIPTIONS: Record<JobTypeValue, string> = {
  'FISCAL_PDF_EXTRACT': 'Extração de dados de documento fiscal PDF',
  'FINANCIAL_OFX_IMPORT': 'Importação de extrato bancário OFX',
  'OCR_PROCESS': 'Processamento OCR de documento',
  'DOCUMENT_VALIDATION': 'Validação de documento',
  'ARCHIVE_COMPRESS': 'Compressão de documento para arquivo',
};

export class JobType extends ValueObject<JobTypeProps> {
  private constructor(props: JobTypeProps) {
    super(props);
  }

  get value(): JobTypeValue { return this.props.value; }
  get description(): string { return this.props.description; }

  static create(type: string): Result<JobType, string> {
    const trimmed = type.trim().toUpperCase() as JobTypeValue;
    
    if (!VALID_JOB_TYPES.includes(trimmed)) {
      return Result.fail(`JobType inválido: ${type}. Valores válidos: ${VALID_JOB_TYPES.join(', ')}`);
    }

    return Result.ok(new JobType({
      value: trimmed,
      description: JOB_TYPE_DESCRIPTIONS[trimmed],
    }));
  }

  // Factory methods para tipos comuns
  static fiscalPdfExtract(): JobType {
    return new JobType({
      value: 'FISCAL_PDF_EXTRACT',
      description: JOB_TYPE_DESCRIPTIONS['FISCAL_PDF_EXTRACT'],
    });
  }

  static financialOfxImport(): JobType {
    return new JobType({
      value: 'FINANCIAL_OFX_IMPORT',
      description: JOB_TYPE_DESCRIPTIONS['FINANCIAL_OFX_IMPORT'],
    });
  }

  static ocrProcess(): JobType {
    return new JobType({
      value: 'OCR_PROCESS',
      description: JOB_TYPE_DESCRIPTIONS['OCR_PROCESS'],
    });
  }

  static documentValidation(): JobType {
    return new JobType({
      value: 'DOCUMENT_VALIDATION',
      description: JOB_TYPE_DESCRIPTIONS['DOCUMENT_VALIDATION'],
    });
  }

  static archiveCompress(): JobType {
    return new JobType({
      value: 'ARCHIVE_COMPRESS',
      description: JOB_TYPE_DESCRIPTIONS['ARCHIVE_COMPRESS'],
    });
  }

  toString(): string {
    return this.props.value;
  }
}
