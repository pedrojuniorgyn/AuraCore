# Document Pipeline (Onda 6)

## Objetivo
Padronizar o ciclo de vida de documentos (fiscais e não fiscais) para que **upload e processamento sobrevivam a restart** do container no Coolify.

Este pipeline usa:
- **Storage externo (S3/MinIO)** para o arquivo
- **SQL Server** para metadados (`dbo.document_store`) e fila de jobs (`dbo.document_jobs`)
- **Worker** rodando via CRON (ou acionamento manual pela UI)

## Variáveis de ambiente (Coolify)

### Storage (S3/MinIO)
- **S3_BUCKET**: nome do bucket
- **S3_ACCESS_KEY_ID**: access key
- **S3_SECRET_ACCESS_KEY**: secret key
- **S3_ENDPOINT** *(opcional, MinIO)*: ex. `http://minio:9000`
- **S3_REGION** *(opcional)*: ex. `us-east-1`
- **S3_FORCE_PATH_STYLE** *(opcional)*: `true` (recomendado para MinIO)
- **S3_PUBLIC_BASE_URL** *(opcional)*: base pública para downloads diretos, ex. `https://minio.seudominio.com`

### Worker (Jobs)
- **ENABLE_CRON**: `true` em **apenas 1 réplica** (recomendado) para evitar concorrência desnecessária

## Tabelas (criação automática)
As tabelas abaixo são criadas de forma **idempotente** no primeiro uso:
- `dbo.document_store`
- `dbo.document_jobs`

## Pilotos incluídos

### 1) Fiscal: Upload de PDF
Endpoint:
- `POST /api/fiscal/documents/:id/upload-pdf`

Com S3/MinIO configurado:
- Armazena o PDF no bucket
- Atualiza `fiscal_documents.pdf_path` com a URL armazenada
- Registra metadados em `dbo.document_store`

### 2) Não fiscal: Importação OFX (jobs)
Endpoint:
- `POST /api/financial/bank-transactions/import-ofx`

Com S3/MinIO configurado:
- Upload do OFX para o bucket
- Cria `dbo.document_store` + `dbo.document_jobs` (tipo `FINANCIAL_OFX_IMPORT`)
- Retorna **202** com `jobId` e o frontend faz poll best-effort

## UI de Monitor
Tela:
- `Configurações → Document Pipeline` (`/configuracoes/documentos`)

O que validar:
- Listagem de jobs (QUEUED/RUNNING/SUCCEEDED/FAILED)
- Botão **Rodar jobs agora** processa a fila (útil quando `ENABLE_CRON=false`)

