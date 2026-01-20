"""
AuraCore Agents API - FastAPI Application

Entry point do servidor de agentes AuraCore.
Inicializa FastAPI com todas as rotas, middlewares e documentação OpenAPI.
"""

import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
from prometheus_client import make_asgi_app

from src.config import get_settings
from src.api.routes import chat, agents, health
from src.api import voice as voice_api
from src.api import knowledge as knowledge_api
from src.api import observability as observability_api
from src.api import webhooks as webhooks_api
from src.api import tasks as tasks_api
from src.api import locales as locales_api
from src.core.orchestrator import get_orchestrator
from src.services.webhooks import get_webhook_service
from src.services.tasks import get_task_queue, TaskWorker
from src.middleware.locale import LocaleMiddleware


# ===== METADATA OPENAPI =====

API_TITLE = "AuraCore Agents API"
API_VERSION = "1.0.0"
API_DESCRIPTION = """
## 🚀 AuraCore Agents API

API de agentes de IA especializados para ERP logístico brasileiro.

### 🤖 Agentes Disponíveis

| Agente | Descrição |
|--------|-----------|
| **Fiscal** | ICMS, PIS/COFINS, NFe, CTe, SPED |
| **Financial** | Contas a pagar/receber, fluxo de caixa |
| **TMS** | Gestão de transporte, rotas, entregas |
| **CRM** | Clientes, leads, oportunidades |
| **Accounting** | Lançamentos contábeis, balancetes |
| **Fleet** | Veículos, manutenção, combustível |
| **Strategic** | BSC, PDCA, 5W2H, War Room |
| **QA** | Qualidade de código, testes |

### 🔧 Features

- **Voice Interface**: STT + TTS com Google Cloud
- **RAG**: Consulta de legislação fiscal
- **Document Processing**: DANFe e DACTe via Docling
- **Webhooks**: Notificações em tempo real

### 🔐 Autenticação

Todas as rotas requerem header `X-API-Key`.

```bash
curl -H "X-API-Key: sua-api-key" https://api.auracore.com.br/v1/agents/chat
```
"""

TAGS_METADATA = [
    {
        "name": "Health",
        "description": "Health checks e status do serviço",
    },
    {
        "name": "Agents",
        "description": "Listagem e informações dos agentes",
    },
    {
        "name": "Chat",
        "description": "Interação com agentes de IA",
    },
    {
        "name": "Voice",
        "description": "Interface de voz (STT/TTS)",
    },
    {
        "name": "Knowledge",
        "description": "RAG e knowledge base",
    },
    {
        "name": "Webhooks",
        "description": "Configuração de webhooks",
    },
    {
        "name": "Tasks",
        "description": "Task queue e jobs assíncronos",
    },
    {
        "name": "Observability",
        "description": "Métricas e monitoramento",
    },
    {
        "name": "Locales",
        "description": "Internacionalização (i18n)",
    },
]


# ===== LOGGING =====

def configure_logging() -> None:
    """Configura logging estruturado."""
    settings = get_settings()
    
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
    ]
    
    if settings.log_format == "json":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())
    
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(structlog, settings.log_level)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


configure_logging()
logger = structlog.get_logger()


# ===== LIFESPAN =====

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia ciclo de vida da aplicação."""
    settings = get_settings()
    
    # Startup
    logger.info(
        "Starting AuraCore Agents",
        version=API_VERSION,
        auracore_url=settings.auracore_api_url,
        chroma_url=settings.chroma_url,
        guardrails_enabled=settings.enable_guardrails,
    )
    
    # Inicializar orquestrador (carrega agentes)
    orchestrator = get_orchestrator()
    logger.info(
        "Agents initialized",
        agent_count=len(orchestrator.agents),
        agents=list(orchestrator.agents.keys()),
    )
    
    # Iniciar webhook delivery worker
    webhook_service = get_webhook_service()
    await webhook_service.start()
    logger.info("Webhook service started")
    
    yield
    
    # Shutdown
    await webhook_service.stop()
    logger.info("Shutting down AuraCore Agents")


# ===== FASTAPI APP =====

app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description=API_DESCRIPTION,
    openapi_tags=TAGS_METADATA,
    docs_url=None,  # Customizado abaixo
    redoc_url=None,  # Customizado abaixo
    openapi_url="/openapi.json",
    servers=[
        {"url": "https://api.auracore.com.br", "description": "Production"},
        {"url": "https://staging-api.auracore.com.br", "description": "Staging"},
        {"url": "http://localhost:8000", "description": "Development"},
    ],
    contact={
        "name": "AuraCore Support",
        "email": "suporte@auracore.com.br",
        "url": "https://auracore.com.br",
    },
    license_info={
        "name": "Proprietary",
        "url": "https://auracore.com.br/license",
    },
    lifespan=lifespan,
)

# Locale Detection (ANTES do CORS para processar primeiro)
app.add_middleware(LocaleMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://auracore.cloud",
        "https://*.auracore.cloud",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Métricas Prometheus
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Registrar rotas
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(agents.router, prefix="/agents", tags=["Agents"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(voice_api.router, prefix="/api/voice", tags=["Voice"])
app.include_router(knowledge_api.router, prefix="/api/knowledge", tags=["Knowledge"])
app.include_router(webhooks_api.router, prefix="/api/webhooks", tags=["Webhooks"])
app.include_router(tasks_api.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(observability_api.router, tags=["Observability"])
app.include_router(locales_api.router, prefix="/api/locales", tags=["Locales"])


# ===== CUSTOM DOCS =====

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """Swagger UI customizado."""
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title=f"{API_TITLE} - Swagger UI",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
        swagger_favicon_url="https://auracore.com.br/favicon.ico",
    )


@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    """ReDoc customizado."""
    return get_redoc_html(
        openapi_url="/openapi.json",
        title=f"{API_TITLE} - ReDoc",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js",
    )


# ===== CUSTOM OPENAPI SCHEMA =====

def custom_openapi():
    """Gera schema OpenAPI customizado com security."""
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=API_TITLE,
        version=API_VERSION,
        description=API_DESCRIPTION,
        routes=app.routes,
        tags=TAGS_METADATA,
    )
    
    # Adicionar security scheme
    openapi_schema["components"]["securitySchemes"] = {
        "ApiKeyAuth": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
            "description": "API Key para autenticação"
        }
    }
    
    # Aplicar security globalmente
    openapi_schema["security"] = [{"ApiKeyAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.get("/", include_in_schema=False)
async def root():
    """Redireciona para documentação."""
    return {
        "service": "AuraCore Agents",
        "version": API_VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json",
        "health": "/health",
    }
