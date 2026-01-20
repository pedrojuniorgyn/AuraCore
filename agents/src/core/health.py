"""
Health Check expandido para o Agno AuraCore.

Verifica:
- API básica (sempre OK se chegou aqui)
- ChromaDB (conexão com vector store)
- LLM Provider (conexão com Anthropic)
- AuraCore API (backend principal)
- Memory Store (SQLite)
- Google Cloud Speech (STT)
- Google Cloud TTS
- OpenAI Embeddings
"""

import os
import asyncio
import sqlite3
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
from dataclasses import dataclass, field

import httpx
import structlog

logger = structlog.get_logger()

# Timeouts para health checks
HEALTH_CHECK_TIMEOUT = 5.0  # segundos


class HealthStatus(Enum):
    """Status de saúde do serviço."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNCONFIGURED = "unconfigured"
    INITIALIZING = "initializing"
    TIMEOUT = "timeout"
    ERROR = "error"


@dataclass
class ServiceCheck:
    """Resultado de check de um serviço."""
    name: str
    status: str
    latency_ms: Optional[float] = None
    message: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        result = {
            "status": self.status,
        }
        if self.latency_ms is not None:
            result["latency_ms"] = self.latency_ms
        if self.message:
            result["message"] = self.message
        if self.details:
            result.update(self.details)
        return result


async def check_chromadb() -> dict:
    """Verifica conexão com ChromaDB."""
    try:
        from src.config import get_settings
        settings = get_settings()
        
        async with httpx.AsyncClient(timeout=HEALTH_CHECK_TIMEOUT) as client:
            response = await client.get(f"{settings.chroma_url}/api/v1/heartbeat")
            
            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "latency_ms": round(response.elapsed.total_seconds() * 1000, 2)
                }
            else:
                return {"status": "unhealthy", "error": f"HTTP {response.status_code}"}
    except httpx.TimeoutException:
        logger.warning("chromadb_health_timeout")
        return {"status": "timeout", "error": "Connection timeout"}
    except Exception as e:
        logger.error("chromadb_health_error", error=str(e))
        return {"status": "error", "error": str(e)[:100]}


async def check_llm_connection() -> dict:
    """Verifica conexão com LLM Provider (Anthropic)."""
    try:
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        if not anthropic_key:
            return {"status": "unconfigured", "error": "ANTHROPIC_API_KEY not set"}
        
        # Verificar se a chave tem formato válido (sk-ant-...)
        if not anthropic_key.startswith("sk-ant-"):
            return {"status": "invalid_key", "error": "API key format invalid"}
        
        # Faz uma chamada mínima para verificar conexão
        async with httpx.AsyncClient(timeout=HEALTH_CHECK_TIMEOUT) as client:
            response = await client.get(
                "https://api.anthropic.com/v1/models",
                headers={
                    "x-api-key": anthropic_key,
                    "anthropic-version": "2023-06-01"
                }
            )
            
            if response.status_code == 200:
                return {"status": "healthy", "provider": "anthropic"}
            elif response.status_code == 401:
                return {"status": "auth_error", "error": "Invalid API key"}
            else:
                return {"status": "unhealthy", "error": f"HTTP {response.status_code}"}
    except httpx.TimeoutException:
        return {"status": "timeout", "error": "Connection timeout"}
    except Exception as e:
        logger.error("llm_health_error", error=str(e))
        return {"status": "error", "error": str(e)[:100]}


async def check_auracore_api() -> dict:
    """Verifica conexão com AuraCore API (Next.js backend)."""
    try:
        from src.config import get_settings
        settings = get_settings()
        
        async with httpx.AsyncClient(timeout=HEALTH_CHECK_TIMEOUT) as client:
            response = await client.get(f"{settings.auracore_api_url}/api/health")
            
            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "url": settings.auracore_api_url,
                    "latency_ms": round(response.elapsed.total_seconds() * 1000, 2)
                }
            else:
                return {"status": "unhealthy", "error": f"HTTP {response.status_code}"}
    except httpx.TimeoutException:
        logger.warning("auracore_health_timeout")
        return {"status": "timeout", "error": "Connection timeout"}
    except Exception as e:
        logger.error("auracore_health_error", error=str(e))
        return {"status": "error", "error": str(e)[:100]}


async def check_memory_store() -> dict:
    """Verifica SQLite para memória de longo prazo."""
    try:
        memory_db_path = os.getenv("MEMORY_DB_PATH", "/data/memory.db")
        
        # Verifica se o diretório existe
        db_dir = os.path.dirname(memory_db_path)
        if db_dir and not os.path.exists(db_dir):
            return {"status": "initializing", "message": "Data directory will be created on first use"}
        
        # Tenta conectar e executar query simples
        conn = sqlite3.connect(memory_db_path, timeout=HEALTH_CHECK_TIMEOUT)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        conn.close()
        
        if result and result[0] == 1:
            return {"status": "healthy", "path": memory_db_path}
        else:
            return {"status": "unhealthy", "error": "Query failed"}
    except sqlite3.OperationalError as e:
        error_str = str(e)
        # Banco pode não existir ainda - isso é OK no primeiro boot
        if "no such table" in error_str or "unable to open" in error_str:
            return {"status": "initializing", "message": "Database will be created on first use"}
        return {"status": "error", "error": error_str[:100]}
    except Exception as e:
        logger.error("memory_store_health_error", error=str(e))
        return {"status": "error", "error": str(e)[:100]}


async def check_google_speech() -> dict:
    """Verifica Google Cloud Speech-to-Text."""
    try:
        # Verificar se credenciais estão configuradas
        google_creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        google_project = os.getenv("GOOGLE_CLOUD_PROJECT")
        
        if not google_creds and not google_project:
            return {"status": "unconfigured", "message": "Google Cloud credentials not set"}
        
        # Verificar se a biblioteca está disponível
        try:
            from google.cloud import speech  # noqa: F401
            
            return {
                "status": "healthy",
                "provider": "google_cloud_speech",
                "message": "Biblioteca disponível"
            }
        except ImportError:
            return {
                "status": "degraded",
                "message": "google-cloud-speech não instalado"
            }
    except Exception as e:
        logger.error("google_speech_health_error", error=str(e))
        return {"status": "error", "error": str(e)[:100]}


async def check_google_tts() -> dict:
    """Verifica Google Cloud Text-to-Speech."""
    try:
        # Verificar se credenciais estão configuradas
        google_creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        google_project = os.getenv("GOOGLE_CLOUD_PROJECT")
        
        if not google_creds and not google_project:
            return {"status": "unconfigured", "message": "Google Cloud credentials not set"}
        
        # Verificar se a biblioteca está disponível
        try:
            from google.cloud import texttospeech  # noqa: F401
            
            return {
                "status": "healthy",
                "provider": "google_cloud_tts",
                "message": "Biblioteca disponível"
            }
        except ImportError:
            return {
                "status": "degraded",
                "message": "google-cloud-texttospeech não instalado"
            }
    except Exception as e:
        logger.error("google_tts_health_error", error=str(e))
        return {"status": "error", "error": str(e)[:100]}


async def check_openai_embeddings() -> dict:
    """Verifica OpenAI para embeddings."""
    try:
        openai_key = os.getenv("OPENAI_API_KEY")
        
        if not openai_key:
            return {"status": "unconfigured", "message": "OPENAI_API_KEY not set"}
        
        # Verificar formato básico
        if not openai_key.startswith("sk-"):
            return {"status": "invalid_key", "error": "API key format invalid"}
        
        # Verificar se a biblioteca está disponível
        try:
            from openai import OpenAI  # noqa: F401
            
            return {
                "status": "healthy",
                "provider": "openai",
                "model": "text-embedding-3-small",
                "message": "Biblioteca disponível"
            }
        except ImportError:
            return {
                "status": "degraded",
                "message": "openai não instalado"
            }
    except Exception as e:
        logger.error("openai_health_error", error=str(e))
        return {"status": "error", "error": str(e)[:100]}


async def get_full_health_status() -> dict:
    """
    Executa todos os health checks em paralelo.
    
    Returns:
        dict com status geral e detalhes de cada componente
    """
    start_time = datetime.utcnow()
    
    # Executar checks em paralelo
    results = await asyncio.gather(
        check_chromadb(),
        check_llm_connection(),
        check_auracore_api(),
        check_memory_store(),
        check_google_speech(),
        check_google_tts(),
        check_openai_embeddings(),
        return_exceptions=True
    )
    
    # Helper para processar resultado
    def process_result(result: Any, default_error: str = "Unknown error") -> dict:
        if isinstance(result, Exception):
            return {"status": "error", "error": str(result)[:100]}
        return result
    
    # Mapear resultados
    checks = {
        "api": {"status": "healthy"},  # Se chegou aqui, a API está OK
        "chromadb": process_result(results[0]),
        "llm": process_result(results[1]),
        "auracore": process_result(results[2]),
        "memory": process_result(results[3]),
        "google_speech": process_result(results[4]),
        "google_tts": process_result(results[5]),
        "openai_embeddings": process_result(results[6]),
    }
    
    # Determinar status geral
    critical_services = ["api", "auracore"]  # Serviços que devem estar healthy
    optional_services = ["chromadb", "llm", "memory", "google_speech", "google_tts", "openai_embeddings"]
    
    critical_healthy = all(
        checks[svc].get("status") == "healthy" 
        for svc in critical_services
    )
    
    optional_issues = [
        svc for svc in optional_services 
        if checks[svc].get("status") not in ["healthy", "initializing", "unconfigured", "degraded"]
    ]
    
    if critical_healthy and not optional_issues:
        overall_status = "healthy"
    elif critical_healthy:
        overall_status = "degraded"
    else:
        overall_status = "unhealthy"
    
    elapsed_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
    
    logger.info(
        "health_check_complete",
        status=overall_status,
        elapsed_ms=round(elapsed_ms, 2),
        checks={k: v.get("status") for k, v in checks.items()}
    )
    
    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "elapsed_ms": round(elapsed_ms, 2),
        "checks": checks,
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "environment": os.getenv("ENVIRONMENT", "development")
    }


class HealthChecker:
    """
    Classe wrapper para health checks com cache.
    
    Uso:
        checker = get_health_checker()
        health = await checker.check_all()
    """
    
    def __init__(self):
        self._start_time = datetime.utcnow()
        self._cache: Optional[dict] = None
        self._cache_time: Optional[datetime] = None
        self._cache_ttl_seconds = 5  # Cache por 5 segundos
    
    async def check_all(self, use_cache: bool = True) -> dict:
        """
        Executa todos os health checks.
        
        Args:
            use_cache: Se True, usa cache de 5 segundos
            
        Returns:
            Dict com status de todos os serviços
        """
        now = datetime.utcnow()
        
        # Verificar cache
        if use_cache and self._cache and self._cache_time:
            elapsed = (now - self._cache_time).total_seconds()
            if elapsed < self._cache_ttl_seconds:
                return self._cache
        
        # Executar checks
        result = await get_full_health_status()
        
        # Adicionar uptime
        uptime = (now - self._start_time).total_seconds()
        result["uptime_seconds"] = round(uptime, 2)
        
        # Atualizar cache
        self._cache = result
        self._cache_time = now
        
        return result
    
    async def is_healthy(self) -> bool:
        """Retorna True se o sistema está saudável."""
        health = await self.check_all()
        return health["status"] == "healthy"
    
    async def is_ready(self) -> bool:
        """Retorna True se o sistema está pronto para receber tráfego."""
        health = await self.check_all()
        return health["status"] in ["healthy", "degraded"]


# Singleton
_health_checker: Optional[HealthChecker] = None


def get_health_checker() -> HealthChecker:
    """Retorna instância singleton do health checker."""
    global _health_checker
    if _health_checker is None:
        _health_checker = HealthChecker()
    return _health_checker
