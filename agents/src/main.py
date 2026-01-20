"""
Entry point do servidor de agentes AuraCore.

Inicializa FastAPI com todas as rotas e middlewares.
"""

import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from src.config import get_settings
from src.api.routes import chat, agents, health
from src.api import voice as voice_api
from src.core.orchestrator import get_orchestrator


# Configurar logging estruturado
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia ciclo de vida da aplicação."""
    settings = get_settings()
    
    # Startup
    logger.info(
        "Starting AuraCore Agents",
        version="1.0.0",
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
    
    yield
    
    # Shutdown
    logger.info("Shutting down AuraCore Agents")


# Criar app FastAPI
app = FastAPI(
    title="AuraCore Agents API",
    description="""
    API de Agentes AI para o AuraCore ERP.
    
    ## Agentes Disponíveis
    
    - **Fiscal Agent**: Especialista em legislação fiscal brasileira
    - **Financial Agent**: Gestão financeira e fluxo de caixa
    - **TMS Agent**: Operações de transporte
    - **CRM Agent**: Vendas e relacionamento
    - **Fleet Agent**: Gestão de frota
    - **Accounting Agent**: Contabilidade
    - **Strategic Agent**: Gestão estratégica (BSC, PDCA)
    
    ## Autenticação
    
    Todas as requisições devem passar pelo Gateway do AuraCore,
    que adiciona o contexto de autenticação (org_id, user_id, role).
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

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


@app.get("/", include_in_schema=False)
async def root():
    """Redireciona para documentação."""
    return {
        "service": "AuraCore Agents",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }
