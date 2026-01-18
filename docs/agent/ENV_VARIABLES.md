# 🔧 Variáveis de Ambiente do Agente AuraCore

## Visão Geral

Este documento lista todas as variáveis de ambiente necessárias para o funcionamento do Agente AuraCore.

## Google Cloud

```env
# Projeto Google Cloud
GOOGLE_CLOUD_PROJECT=auracore-production

# Credenciais do Service Account (caminho para arquivo JSON)
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-cloud-sa.json

# Vertex AI / Gemini
VERTEX_AI_LOCATION=us-central1
GEMINI_MODEL=gemini-3-pro
GEMINI_FAST_MODEL=gemini-2.5-flash

# Document AI
DOCUMENT_AI_LOCATION=us
DOCUMENT_AI_PROCESSOR_ID=xxx  # ID do processador de faturas
DOCUMENT_AI_OCR_PROCESSOR_ID=xxx  # ID do processador OCR (opcional)
```

## Google Workspace (OAuth)

```env
# OAuth 2.0 Client Credentials
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
```

## Configuração

### 1. Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie ou selecione o projeto `auracore-production`
3. Ative as APIs:
   - Vertex AI API
   - Document AI API
   - Cloud Speech-to-Text API
   - Cloud Text-to-Speech API

### 2. Criar Service Account

```bash
# Criar service account
gcloud iam service-accounts create auracore-agent \
  --display-name="AuraCore Agent"

# Conceder permissões
gcloud projects add-iam-policy-binding auracore-production \
  --member="serviceAccount:auracore-agent@auracore-production.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding auracore-production \
  --member="serviceAccount:auracore-agent@auracore-production.iam.gserviceaccount.com" \
  --role="roles/documentai.viewer"

# Gerar chave JSON
gcloud iam service-accounts keys create credentials/google-cloud-sa.json \
  --iam-account=auracore-agent@auracore-production.iam.gserviceaccount.com
```

### 3. Configurar OAuth para Workspace

1. Acesse [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Clique em "Create Credentials" > "OAuth 2.0 Client ID"
3. Tipo: "Web application"
4. Configure Redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://seudominio.com/api/auth/callback/google`
5. Copie Client ID e Client Secret

### 4. Criar Document AI Processor

1. Acesse [Document AI Console](https://console.cloud.google.com/ai/document-ai)
2. Crie processor tipo "Invoice Parser"
3. Copie o Processor ID

## Variáveis em Produção

Para produção no Coolify, configure as variáveis de ambiente no painel:

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `GOOGLE_CLOUD_PROJECT` | ✅ | ID do projeto GCP |
| `VERTEX_AI_LOCATION` | ✅ | Região do Vertex AI |
| `GEMINI_MODEL` | ❌ | Modelo Gemini (default: gemini-3-pro) |
| `DOCUMENT_AI_PROCESSOR_ID` | ✅ | ID do processor de faturas |
| `GOOGLE_CLIENT_ID` | ✅ | Client ID OAuth |
| `GOOGLE_CLIENT_SECRET` | ✅ | Client Secret OAuth |

## Verificação

Para verificar se as credenciais estão funcionando:

```typescript
import { GoogleCloudClient } from '@/agent/integrations/google';
import { createDefaultConfig } from '@/agent/core/AgentConfig';

const config = createDefaultConfig();
const client = new GoogleCloudClient(
  config.gemini,
  config.documentAI,
  config.speech
);

// Testar Gemini
const response = await client.generateText('Olá! Você está funcionando?');
console.log(response);
```
