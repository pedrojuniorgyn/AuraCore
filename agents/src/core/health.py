"""
Health Check expandido para o Agno AuraCore.

Verifica:
- API básica (sempre OK se chegou aqui)
- ChromaDB (conexão com vector store)
- LLM Provider (conexão com Anthropic)
- AuraCore API (backend principal)
- Memory Store (SQLite)
"""

import os
import asyncio
import sqlite3
from datetime import datetime
from typing import Optional

import httpx
import structlog

logger = structlog.get_logger()

# Timeouts para health checks
HEALTH_CHECK_TIMEOUT = 5.0  # segundos


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
        return_exceptions=True
    )
    
    # Mapear resultados
    checks = {
        "api": {"status": "healthy"},  # Se chegou aqui, a API está OK
        "chromadb": results[0] if not isinstance(results[0], Exception) else {"status": "error", "error": str(results[0])[:100]},
        "llm": results[1] if not isinstance(results[1], Exception) else {"status": "error", "error": str(results[1])[:100]},
        "auracore": results[2] if not isinstance(results[2], Exception) else {"status": "error", "error": str(results[2])[:100]},
        "memory": results[3] if not isinstance(results[3], Exception) else {"status": "error", "error": str(results[3])[:100]},
    }
    
    # Determinar status geral
    critical_services = ["api", "auracore"]  # Serviços que devem estar healthy
    optional_services = ["chromadb", "llm", "memory"]  # Serviços que podem estar degradados
    
    critical_healthy = all(
        checks[svc].get("status") == "healthy" 
        for svc in critical_services
    )
    
    optional_issues = [
        svc for svc in optional_services 
        if checks[svc].get("status") not in ["healthy", "initializing", "unconfigured"]
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
