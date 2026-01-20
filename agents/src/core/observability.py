"""
Observabilidade: logging, métricas e tracing.

Fornece middleware para instrumentação de agentes.
"""

import time
from typing import Any, Callable, Dict

import structlog
from prometheus_client import Counter, Histogram

from src.config import get_settings

logger = structlog.get_logger()


def get_logger(name: str = __name__) -> structlog.BoundLogger:
    """Retorna um logger estruturado para o módulo especificado."""
    return structlog.get_logger(name)

# =============================================================================
# MÉTRICAS PROMETHEUS
# =============================================================================

AGENT_REQUESTS = Counter(
    "auracore_agent_requests_total",
    "Total de requisições por agente",
    ["agent_name", "status"],
)

AGENT_LATENCY = Histogram(
    "auracore_agent_latency_seconds",
    "Latência de resposta dos agentes",
    ["agent_name"],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0],
)

TOOL_CALLS = Counter(
    "auracore_tool_calls_total",
    "Total de chamadas de tools",
    ["tool_name", "agent_name", "status"],
)

KNOWLEDGE_QUERIES = Counter(
    "auracore_knowledge_queries_total",
    "Total de consultas ao Knowledge Module",
    ["status"],
)


class ObservabilityMiddleware:
    """
    Middleware para observabilidade de agentes.
    
    Fornece:
    - Logging estruturado de requisições
    - Métricas Prometheus
    - Tracing (futuro: OpenTelemetry)
    """
    
    def __init__(self):
        self.settings = get_settings()
    
    async def wrap_agent_call(
        self,
        agent_name: str,
        user_input: str,
        user_context: Dict[str, Any],
        agent_fn: Callable,
    ) -> Any:
        """
        Wraps chamada de agente com observabilidade.
        
        Args:
            agent_name: Nome do agente
            user_input: Input do usuário
            user_context: Contexto (org, user, etc)
            agent_fn: Função async do agente a executar
            
        Returns:
            Resultado da execução do agente
        """
        
        if not self.settings.enable_observability:
            return await agent_fn()
        
        start_time = time.time()
        
        # Log de entrada
        logger.info(
            "agent_request_started",
            agent=agent_name,
            user_id=user_context.get("user_id"),
            org_id=user_context.get("org_id"),
            input_length=len(user_input),
            input_preview=user_input[:100] + "..." if len(user_input) > 100 else user_input,
        )
        
        try:
            # Executar agente
            result = await agent_fn()
            
            # Métricas de sucesso
            duration = time.time() - start_time
            AGENT_LATENCY.labels(agent_name=agent_name).observe(duration)
            AGENT_REQUESTS.labels(agent_name=agent_name, status="success").inc()
            
            # Log de sucesso
            logger.info(
                "agent_request_completed",
                agent=agent_name,
                duration_ms=int(duration * 1000),
                status="success",
            )
            
            return result
            
        except Exception as e:
            # Métricas de erro
            duration = time.time() - start_time
            AGENT_REQUESTS.labels(agent_name=agent_name, status="error").inc()
            
            # Log de erro
            logger.error(
                "agent_request_failed",
                agent=agent_name,
                duration_ms=int(duration * 1000),
                error=str(e),
                error_type=type(e).__name__,
            )
            
            raise
    
    def record_tool_call(
        self,
        tool_name: str,
        agent_name: str,
        status: str,
    ) -> None:
        """Registra chamada de tool."""
        if self.settings.enable_observability:
            TOOL_CALLS.labels(
                tool_name=tool_name,
                agent_name=agent_name,
                status=status,
            ).inc()
    
    def record_knowledge_query(self, status: str) -> None:
        """Registra consulta ao Knowledge Module."""
        if self.settings.enable_observability:
            KNOWLEDGE_QUERIES.labels(status=status).inc()
