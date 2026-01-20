"""
Observabilidade: logging, métricas e tracing.

Fornece middleware para instrumentação de agentes.

Métricas disponíveis:
- auracore_agent_requests_total: Requests por agente
- auracore_agent_latency_seconds: Latência de agentes
- auracore_tool_calls_total: Chamadas de tools
- auracore_knowledge_queries_total: Consultas RAG
- auracore_voice_operations_total: Operações de voz
- auracore_voice_duration_seconds: Duração de voz
- auracore_document_imports_total: Imports de documentos
- auracore_rag_duration_seconds: Duração de consultas RAG
"""

import time
from typing import Any, Callable, Dict, Optional
from functools import wraps
from contextlib import contextmanager

import structlog
from prometheus_client import Counter, Histogram, Gauge, Info

from src.config import get_settings

logger = structlog.get_logger()


def get_logger(name: str = __name__) -> structlog.BoundLogger:
    """Retorna um logger estruturado para o módulo especificado."""
    return structlog.get_logger(name)


# =============================================================================
# MÉTRICAS PROMETHEUS
# =============================================================================

# ----- AGENT METRICS -----
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

# ----- TOOL METRICS -----
TOOL_CALLS = Counter(
    "auracore_tool_calls_total",
    "Total de chamadas de tools",
    ["tool_name", "agent_name", "status"],
)

TOOL_DURATION = Histogram(
    "auracore_tool_duration_seconds",
    "Duração de execução das tools",
    ["tool_name"],
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
)

# ----- KNOWLEDGE/RAG METRICS -----
KNOWLEDGE_QUERIES = Counter(
    "auracore_knowledge_queries_total",
    "Total de consultas ao Knowledge Module",
    ["status"],
)

RAG_QUERIES = Counter(
    "auracore_rag_queries_total",
    "Total de consultas RAG (local)",
    ["filter_type", "status"],
)

RAG_DURATION = Histogram(
    "auracore_rag_duration_seconds",
    "Duração de consultas RAG",
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
)

KNOWLEDGE_BASE_SIZE = Gauge(
    "auracore_knowledge_base_documents",
    "Número de documentos na knowledge base",
)

# ----- VOICE METRICS -----
VOICE_OPERATIONS = Counter(
    "auracore_voice_operations_total",
    "Total de operações de voz",
    ["operation", "status", "language"],
)

VOICE_DURATION = Histogram(
    "auracore_voice_duration_seconds",
    "Duração de operações de voz",
    ["operation"],
    buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
)

# ----- DOCUMENT METRICS -----
DOCUMENT_IMPORTS = Counter(
    "auracore_document_imports_total",
    "Total de documentos importados",
    ["doc_type", "status"],
)

DOCUMENT_CHUNKS = Counter(
    "auracore_document_chunks_total",
    "Total de chunks indexados",
    ["doc_type"],
)

# ----- SYSTEM METRICS -----
ACTIVE_SESSIONS = Gauge(
    "auracore_active_sessions",
    "Sessões ativas por agente",
    ["agent_type"],
)

APP_INFO = Info(
    "auracore_agents",
    "Informações do AuraCore Agents"
)

# Inicializar info
APP_INFO.info({
    "version": "1.0.0",
    "environment": "production"
})


class ObservabilityMiddleware:
    """
    Middleware para observabilidade de agentes.
    
    Fornece:
    - Logging estruturado de requisições
    - Métricas Prometheus
    - Tracing (futuro: OpenTelemetry)
    
    Uso:
        obs = ObservabilityMiddleware()
        
        # Wrap de chamada de agente
        result = await obs.wrap_agent_call(agent_name, input, context, fn)
        
        # Registrar operações
        obs.record_tool_call("calculate_icms", "fiscal", "success")
        obs.record_voice_operation("transcribe", "success")
        obs.record_rag_query("law", "success")
        obs.record_document_import("danfe", "success", chunks=5)
        
        # Context managers para medir duração
        with obs.measure_tool_duration("calculate_icms"):
            # ... execução
            pass
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.enabled = self.settings.enable_observability
    
    # ===== AGENT METHODS =====
    
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
        
        if not self.enabled:
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
    
    # ===== TOOL METHODS =====
    
    def record_tool_call(
        self,
        tool_name: str,
        agent_name: str,
        status: str,
    ) -> None:
        """Registra chamada de tool."""
        if self.enabled:
            TOOL_CALLS.labels(
                tool_name=tool_name,
                agent_name=agent_name,
                status=status,
            ).inc()
    
    @contextmanager
    def measure_tool_duration(self, tool_name: str):
        """Context manager para medir duração de tool."""
        start = time.perf_counter()
        try:
            yield
        finally:
            if self.enabled:
                duration = time.perf_counter() - start
                TOOL_DURATION.labels(tool_name=tool_name).observe(duration)
    
    # ===== KNOWLEDGE/RAG METHODS =====
    
    def record_knowledge_query(self, status: str) -> None:
        """Registra consulta ao Knowledge Module (API externa)."""
        if self.enabled:
            KNOWLEDGE_QUERIES.labels(status=status).inc()
    
    def record_rag_query(
        self,
        filter_type: str = "all",
        status: str = "success"
    ) -> None:
        """Registra consulta RAG local."""
        if self.enabled:
            RAG_QUERIES.labels(
                filter_type=filter_type,
                status=status
            ).inc()
    
    @contextmanager
    def measure_rag_duration(self):
        """Context manager para medir duração de consulta RAG."""
        start = time.perf_counter()
        try:
            yield
        finally:
            if self.enabled:
                duration = time.perf_counter() - start
                RAG_DURATION.observe(duration)
    
    def set_knowledge_base_size(self, count: int) -> None:
        """Define número de documentos na knowledge base."""
        if self.enabled:
            KNOWLEDGE_BASE_SIZE.set(count)
    
    # ===== VOICE METHODS =====
    
    def record_voice_operation(
        self,
        operation: str,
        status: str = "success",
        language: str = "pt-BR"
    ) -> None:
        """
        Registra operação de voz.
        
        Args:
            operation: "transcribe", "synthesize", "process"
            status: "success", "error", "empty"
            language: Código do idioma
        """
        if self.enabled:
            VOICE_OPERATIONS.labels(
                operation=operation,
                status=status,
                language=language
            ).inc()
    
    @contextmanager
    def measure_voice_duration(self, operation: str):
        """Context manager para medir duração de operação de voz."""
        start = time.perf_counter()
        try:
            yield
        finally:
            if self.enabled:
                duration = time.perf_counter() - start
                VOICE_DURATION.labels(operation=operation).observe(duration)
    
    # ===== DOCUMENT METHODS =====
    
    def record_document_import(
        self,
        doc_type: str,
        status: str = "success",
        chunks: int = 0
    ) -> None:
        """
        Registra importação de documento.
        
        Args:
            doc_type: "danfe", "dacte", "pdf", etc
            status: "success", "error"
            chunks: Número de chunks gerados (para RAG)
        """
        if self.enabled:
            DOCUMENT_IMPORTS.labels(
                doc_type=doc_type,
                status=status
            ).inc()
            
            if chunks > 0:
                DOCUMENT_CHUNKS.labels(doc_type=doc_type).inc(chunks)
    
    # ===== SESSION METHODS =====
    
    def set_active_sessions(self, agent_type: str, count: int) -> None:
        """Define número de sessões ativas para um tipo de agente."""
        if self.enabled:
            ACTIVE_SESSIONS.labels(agent_type=agent_type).set(count)


# Singleton
_observability: Optional[ObservabilityMiddleware] = None


def get_observability() -> ObservabilityMiddleware:
    """Retorna instância singleton do middleware de observabilidade."""
    global _observability
    if _observability is None:
        _observability = ObservabilityMiddleware()
    return _observability
