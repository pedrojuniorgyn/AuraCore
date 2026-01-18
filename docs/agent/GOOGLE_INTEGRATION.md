# 🔗 Integração Google Cloud + Workspace

## Visão Geral

O AuraCore Agent utiliza os seguintes serviços Google:

| Serviço | Função | Status |
|---------|--------|--------|
| Gemini 3 Pro | LLM principal | ✅ Incluso (Enterprise) |
| Document AI | OCR de documentos | ✅ Já pago |
| Speech-to-Text (Chirp 3) | Transcrição | ✅ Já pago |
| Text-to-Speech (Chirp 3 HD) | Síntese de voz | ✅ Já pago |
| Gmail API | Leitura/envio de emails | ✅ Workspace |
| Drive API | Gestão de arquivos | ✅ Workspace |
| Calendar API | Agendamentos | ✅ Workspace |
| Sheets API | Planilhas | ✅ Workspace |

## Configuração do Google Cloud

### 1. Criar Projeto no Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie ou selecione o projeto `auracore-production`
3. Ative as APIs necessárias:
   - Vertex AI API
   - Document AI API
   - Cloud Speech-to-Text API
   - Cloud Text-to-Speech API

### 2. Service Account

```bash
# Criar service account
gcloud iam service-accounts create auracore-agent \
  --display-name="AuraCore Agent"

# Conceder permissões
gcloud projects add-iam-policy-binding auracore-production \
  --member="serviceAccount:auracore-agent@auracore-production.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Gerar chave JSON
gcloud iam service-accounts keys create credentials.json \
  --iam-account=auracore-agent@auracore-production.iam.gserviceaccount.com
```

### 3. Document AI Processor

1. Acesse [Document AI Console](https://console.cloud.google.com/ai/document-ai)
2. Crie um processor tipo "Invoice Parser"
3. Anote o `PROCESSOR_ID`

## Configuração do Google Workspace

### 1. OAuth 2.0 Credentials

1. Acesse [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Crie "OAuth 2.0 Client ID" tipo "Web application"
3. Configure Redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://auracore.com/api/auth/callback/google`

### 2. Scopes Necessários

```typescript
const SCOPES = [
  // Gmail
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  
  // Drive
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  
  // Calendar
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  
  // Sheets
  'https://www.googleapis.com/auth/spreadsheets',
];
```

### 3. Domain-Wide Delegation (Opcional)

Para acessar dados de todos os usuários da organização:

1. Acesse Google Admin Console
2. Security > API Controls > Domain-wide Delegation
3. Adicione o Client ID do Service Account
4. Conceda os scopes necessários

## Exemplos de Código

### Gemini Client

```typescript
import { VertexAI } from '@google-cloud/vertexai';

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: process.env.VERTEX_AI_LOCATION!,
});

const model = vertexAI.getGenerativeModel({
  model: 'gemini-3-pro',
  generationConfig: {
    maxOutputTokens: 8192,
    temperature: 0.7,
  },
});

export async function chat(prompt: string): Promise<string> {
  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

### Document AI Client

```typescript
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

const client = new DocumentProcessorServiceClient();

export async function processInvoice(document: Buffer): Promise<InvoiceData> {
  const [result] = await client.processDocument({
    name: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/${process.env.DOCUMENT_AI_LOCATION}/processors/${process.env.DOCUMENT_AI_PROCESSOR_ID}`,
    rawDocument: {
      content: document.toString('base64'),
      mimeType: 'application/pdf',
    },
  });
  
  // Extrair entidades
  const entities = result.document?.entities || [];
  
  return {
    invoiceNumber: findEntity(entities, 'invoice_id'),
    vendorName: findEntity(entities, 'supplier_name'),
    totalAmount: parseFloat(findEntity(entities, 'total_amount') || '0'),
    // ...
  };
}
```

### Gmail Client

```typescript
import { google } from 'googleapis';

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

export async function searchEmails(query: string): Promise<Email[]> {
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 10,
  });
  
  const messages = response.data.messages || [];
  
  return Promise.all(
    messages.map(async (msg) => {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
      });
      return parseEmail(full.data);
    })
  );
}
```

## Troubleshooting

### Erro: "Permission denied"
- Verifique se o Service Account tem as roles necessárias
- Verifique se as APIs estão habilitadas

### Erro: "Quota exceeded"
- Document AI: 120 páginas/minuto (batch), 15 páginas/minuto (online)
- Gemini: Verificar quotas no Console

### Erro: "Invalid credentials"
- Regenere o arquivo credentials.json
- Verifique GOOGLE_APPLICATION_CREDENTIALS
