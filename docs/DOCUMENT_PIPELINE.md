# Document Pipeline - Configuração

## Visão Geral

O Document Pipeline é o sistema de gerenciamento de documentos do AuraCore, responsável por:

- **Upload** de documentos para storage externo (S3/MinIO)
- **Processamento assíncrono** via fila persistente
- **Rastreamento** de status e logs
- **Reprocessamento** em caso de falha

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOCUMENT PIPELINE - DDD                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   API       │ ──► │  Use Case   │ ──► │  Storage    │       │
│  │   Route     │     │  (Command)  │     │  Provider   │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│        │                   │                    │               │
│        ▼                   ▼                    ▼               │
│  ┌──────────────────────────────────────────────────┐          │
│  │           SQL Server (Metadados + Jobs)          │          │
│  │  ┌─────────────────┐  ┌─────────────────────┐   │          │
│  │  │ document_store  │  │   document_jobs     │   │          │
│  │  └─────────────────┘  └─────────────────────┘   │          │
│  └──────────────────────────────────────────────────┘          │
│                              ▲                                  │
│                              │                                  │
│  ┌─────────────┐     ┌──────┴──────┐                           │
│  │   CRON      │ ──► │   Worker    │                           │
│  │  (Trigger)  │     │ (Processor) │                           │
│  └─────────────┘     └─────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

## Variáveis de Ambiente

### Storage (S3/MinIO) - OBRIGATÓRIAS

| Variável | Descrição | Exemplo | Obrigatória |
|----------|-----------|---------|-------------|
| `S3_BUCKET` | Nome do bucket | `auracore-documents` | ✅ Sim |
| `S3_ACCESS_KEY_ID` | Access key | `minioadmin` | ✅ Sim |
| `S3_SECRET_ACCESS_KEY` | Secret key | `minioadmin123` | ✅ Sim |
| `S3_ENDPOINT` | Endpoint (MinIO) | `http://minio:9000` | ⚠️ MinIO |
| `S3_REGION` | Região AWS | `us-east-1` | Default: us-east-1 |
| `S3_FORCE_PATH_STYLE` | Path style (MinIO) | `true` | ⚠️ MinIO: true |
| `S3_PUBLIC_BASE_URL` | URL pública | `https://minio.domain.com` | Opcional |

### Worker - OPCIONAIS

| Variável | Descrição | Default |
|----------|-----------|---------|
| `ENABLE_DOCUMENT_WORKER` | Habilitar worker | `false` |
| `DOCUMENT_WORKER_INTERVAL_MS` | Intervalo em ms | `30000` |
| `DOCUMENT_WORKER_LOCK_TIMEOUT_MS` | Timeout de lock | `300000` (5 min) |

## Configuração Coolify

### 1. Adicionar MinIO ao Stack

```yaml
# docker-compose.yml (Coolify)
services:
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

volumes:
  minio_data:
```

### 2. Configurar Variáveis na Aplicação

```env
# Storage
S3_BUCKET=auracore-documents
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin123
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_BASE_URL=https://minio.seudominio.com

# Worker (apenas 1 réplica!)
ENABLE_DOCUMENT_WORKER=true
DOCUMENT_WORKER_INTERVAL_MS=30000
```

### 3. ⚠️ IMPORTANTE: Worker em Apenas 1 Réplica

O worker de processamento deve rodar em **apenas 1 réplica** para evitar processamento duplicado. Configure no Coolify:

- Réplica 1: `ENABLE_DOCUMENT_WORKER=true`
- Réplicas 2+: `ENABLE_DOCUMENT_WORKER=false`

## Tipos de Jobs

| Tipo | Descrição | Uso |
|------|-----------|-----|
| `FISCAL_PDF_EXTRACT` | Extração de dados de PDF fiscal | Upload de notas/CTe |
| `FINANCIAL_OFX_IMPORT` | Importação de extrato OFX | Conciliação bancária |
| `OCR_PROCESS` | Processamento OCR | Documentos digitalizados |
| `DOCUMENT_VALIDATION` | Validação de documento | Verificação de integridade |
| `ARCHIVE_COMPRESS` | Compressão para arquivo | Arquivamento |

## Status do Documento

```
UPLOADED → QUEUED → PROCESSING → SUCCEEDED
                          ↓
                       FAILED → (reprocess) → QUEUED
```

| Status | Descrição |
|--------|-----------|
| `UPLOADED` | Arquivo enviado para S3 |
| `QUEUED` | Na fila de processamento |
| `PROCESSING` | Sendo processado |
| `SUCCEEDED` | Processado com sucesso |
| `FAILED` | Falha no processamento |

## Status do Job

```
QUEUED → RUNNING → SUCCEEDED
              ↓
           FAILED → (retry automático se attempts < maxAttempts)
```

## API Endpoints

### Upload de Documento

```typescript
POST /api/documents/upload
Content-Type: multipart/form-data

{
  file: File,
  docType: string,
  entityTable?: string,
  entityId?: number,
  createProcessingJob?: boolean,
  jobType?: string,
  jobPayload?: object
}

Response: {
  documentId: string,
  storageUrl: string,
  jobId?: string
}
```

### Buscar Documento

```typescript
GET /api/documents/:id

Response: {
  id: string,
  docType: string,
  fileName: string,
  mimeType: string,
  fileSize: number,
  status: string,
  ...
}
```

### Download de Documento

```typescript
GET /api/documents/:id/download

Response: File (binary)
```

### Listar Jobs

```typescript
GET /api/admin/document-jobs?status=QUEUED&limit=50

Response: {
  items: DocumentJob[],
  total: number
}
```

### Trigger Manual de Processamento

```typescript
POST /api/admin/document-jobs/process

Response: {
  processed: number,
  succeeded: number,
  failed: number
}
```

## Estrutura de Pastas (DDD)

```
src/modules/documents/
├── domain/
│   ├── entities/
│   │   ├── Document.ts
│   │   └── DocumentJob.ts
│   ├── value-objects/
│   │   ├── StoragePath.ts
│   │   ├── JobStatus.ts
│   │   ├── JobType.ts
│   │   └── DocumentStatus.ts
│   ├── events/
│   │   ├── DocumentUploadedEvent.ts
│   │   ├── DocumentStatusChangedEvent.ts
│   │   ├── JobCreatedEvent.ts
│   │   └── JobCompletedEvent.ts
│   ├── errors/
│   │   └── DocumentErrors.ts
│   └── ports/
│       ├── input/
│       │   ├── IUploadDocumentUseCase.ts
│       │   ├── IGetDocumentByIdUseCase.ts
│       │   └── IProcessJobUseCase.ts
│       └── output/
│           ├── IStorageProvider.ts
│           ├── IDocumentRepository.ts
│           └── IDocumentJobRepository.ts
├── application/
│   ├── commands/
│   │   ├── UploadDocumentCommand.ts
│   │   └── ProcessJobsCommand.ts
│   └── queries/
│       └── GetDocumentByIdQuery.ts
└── infrastructure/
    ├── persistence/
    │   ├── repositories/
    │   │   ├── DrizzleDocumentRepository.ts
    │   │   └── DrizzleDocumentJobRepository.ts
    │   ├── mappers/
    │   │   ├── DocumentMapper.ts
    │   │   └── DocumentJobMapper.ts
    │   └── schemas/
    │       ├── document-store.schema.ts
    │       └── document-jobs.schema.ts
    ├── storage/
    │   └── S3StorageProvider.ts
    └── di/
        └── DocumentsModule.ts
```

## Registrando Processadores de Job

```typescript
import { ProcessJobsCommand, type JobProcessor } from '@/modules/documents';

const fiscalPdfProcessor: JobProcessor = {
  jobType: 'FISCAL_PDF_EXTRACT',
  async process(job, context) {
    // 1. Buscar documento
    const docResult = await context.documentRepository.findById(
      job.documentId,
      job.organizationId,
      job.branchId
    );
    
    // 2. Baixar arquivo do S3
    const bufferResult = await context.storageProvider.downloadAsBuffer(
      docResult.value.storagePath.key
    );
    
    // 3. Processar...
    
    return Result.ok({ extracted: data });
  }
};

ProcessJobsCommand.registerProcessor(fiscalPdfProcessor);
```

## Inicialização do Módulo

```typescript
// src/lib/bootstrap.ts ou similar
import { registerDocumentsModule } from '@/modules/documents';

export function bootstrap() {
  // Registrar módulo de documentos no container DI
  registerDocumentsModule();
  
  // Registrar processadores de jobs
  // ...
}
```

## Troubleshooting

### Erro: "Storage S3 não está configurado"

Verifique se as variáveis `S3_BUCKET`, `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY` estão definidas.

### Jobs não estão sendo processados

1. Verifique se `ENABLE_DOCUMENT_WORKER=true`
2. Verifique logs do worker
3. Verifique se há jobs com status `QUEUED`

### Lock timeout (jobs travados)

Se um job ficar travado em `RUNNING` por mais de 5 minutos, o worker irá reclamar automaticamente. Para forçar:

```sql
UPDATE document_jobs 
SET status = 'QUEUED', locked_at = NULL 
WHERE status = 'RUNNING' 
  AND locked_at < DATEADD(MINUTE, -5, GETUTCDATE());
```

## Monitoramento

### Dashboard
Acesse `/configuracoes/documentos` para visualizar:
- Documentos recentes
- Jobs na fila
- Status de processamento

### Métricas
O worker emite logs estruturados:
- `documents.job.claimed` - Job iniciado
- `documents.job.succeeded` - Job concluído
- `documents.job.failed` - Job falhou

## Multi-tenancy

Todas as operações filtram por `organizationId` + `branchId`:

- Documentos são isolados por tenant
- Jobs são isolados por tenant
- Índices compostos garantem performance

## Segurança

- Arquivos armazenados no S3 não são públicos
- Download requer autenticação
- URLs assinadas expiram em 1 hora (configurável)
- Soft delete mantém histórico
