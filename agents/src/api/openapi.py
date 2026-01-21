# agents/src/api/openapi.py
"""
Customização do OpenAPI spec para documentação da API.
"""

from typing import Any
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi


def custom_openapi(app: FastAPI) -> dict[str, Any]:
    """Gera OpenAPI spec customizada."""
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="AuraCore Agents API",
        version="2.0.0",
        description="""
# AuraCore Agents API

Sistema de Agentes IA para ERP Logístico Brasileiro.

## Funcionalidades

- **8 Agentes Especializados**: Fiscal, Financial, Accounting, TMS, WMS, CRM, Fleet, Strategic
- **Voice**: Speech-to-Text e Text-to-Speech
- **RAG**: Busca em legislação brasileira
- **Documents**: Upload e processamento de documentos

## Autenticação

Todas as requisições requerem autenticação via:

- **API Key**: Header `X-API-Key`
- **JWT**: Header `Authorization: Bearer <token>`

## Rate Limiting

| Plano | Requests/min |
|-------|--------------|
| Free | 10 |
| Pro | 100 |
| Enterprise | 1000 |

## Suporte

- 📧 support@auracore.com.br
- 📖 https://docs.auracore.com.br
        """,
        routes=app.routes,
    )
    
    # Adicionar servers
    openapi_schema["servers"] = [
        {"url": "https://api.auracore.com.br", "description": "Production"},
        {"url": "https://staging-api.auracore.com.br", "description": "Staging"},
        {"url": "http://localhost:8000", "description": "Local Development"},
    ]
    
    # Adicionar security schemes
    if "components" not in openapi_schema:
        openapi_schema["components"] = {}
    
    openapi_schema["components"]["securitySchemes"] = {
        "ApiKeyAuth": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
            "description": "API Key de autenticação. Formato: `ac_live_xxxx` ou `ac_test_xxxx`"
        },
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT Token obtido via autenticação"
        }
    }
    
    # Aplicar security globalmente
    openapi_schema["security"] = [
        {"ApiKeyAuth": []},
        {"BearerAuth": []}
    ]
    
    # Tags com descrições detalhadas
    openapi_schema["tags"] = [
        {
            "name": "Agents",
            "description": "Operações com agentes IA especializados. "
                          "Cada agente tem conhecimento específico de um domínio do ERP."
        },
        {
            "name": "Voice",
            "description": "Transcrição de áudio para texto (STT) e "
                          "síntese de texto para áudio (TTS) usando Google Cloud."
        },
        {
            "name": "RAG",
            "description": "Retrieval-Augmented Generation para busca semântica "
                          "em legislação brasileira e documentos indexados."
        },
        {
            "name": "Documents",
            "description": "Upload, processamento e gerenciamento de documentos. "
                          "Suporta PDF, DOCX, imagens e mais."
        },
        {
            "name": "Analytics",
            "description": "Métricas e estatísticas de uso da API. "
                          "Inclui tokens consumidos, custos e top agentes."
        },
        {
            "name": "Audit",
            "description": "Logs de auditoria para compliance (LGPD). "
                          "Todas as ações são registradas e verificáveis."
        },
        {
            "name": "Feature Flags",
            "description": "Configuração de features experimentais e rollout gradual."
        },
        {
            "name": "Health",
            "description": "Health checks para monitoramento e probes do Kubernetes."
        },
    ]
    
    # Adicionar informações de contato
    openapi_schema["info"]["contact"] = {
        "name": "AuraCore Support",
        "email": "support@auracore.com.br",
        "url": "https://docs.auracore.com.br"
    }
    
    # Adicionar licença
    openapi_schema["info"]["license"] = {
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT"
    }
    
    # Adicionar external docs
    openapi_schema["externalDocs"] = {
        "description": "Documentação completa",
        "url": "https://docs.auracore.com.br"
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


def setup_openapi(app: FastAPI) -> None:
    """
    Configura OpenAPI customizado na aplicação.
    
    Args:
        app: Instância do FastAPI
    
    Example:
        ```python
        from fastapi import FastAPI
        from src.api.openapi import setup_openapi
        
        app = FastAPI()
        setup_openapi(app)
        ```
    """
    app.openapi = lambda: custom_openapi(app)
