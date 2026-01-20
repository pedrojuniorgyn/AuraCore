"""
Worker para processar tasks da fila.
"""

import asyncio
import os
from typing import Optional, Any
from datetime import datetime
import structlog

try:
    from arq.connections import RedisSettings
    ARQ_AVAILABLE = True
except ImportError:
    ARQ_AVAILABLE = False
    RedisSettings = None

from .task_definitions import TASK_FUNCTIONS
from src.services.cache import get_cache

logger = structlog.get_logger()


class TaskWorker:
    """
    Worker que processa tasks.
    
    Uso:
        # Iniciar worker (produção)
        arq src.services.tasks.task_worker.WorkerSettings
        
        # Ou via código (desenvolvimento)
        worker = TaskWorker()
        await worker.run()
    """
    
    def __init__(self):
        self._running = False
        self._cache = get_cache()
    
    async def run(self):
        """Executa worker local (desenvolvimento)."""
        from .task_queue import get_task_queue
        
        queue = get_task_queue()
        self._running = True
        
        logger.info("task_worker_started")
        
        # Mapeamento de nomes para funções
        task_map = {func.__name__: func for func in TASK_FUNCTIONS}
        
        while self._running:
            try:
                # Pegar task da fila local (usa lazy init)
                task_id, task_name, kwargs, config = await asyncio.wait_for(
                    queue._get_local_queue().get(),
                    timeout=1.0
                )
                
                # Atualizar status
                task_data = await self._cache.get_json(f"task:{task_id}")
                if task_data:
                    task_data["status"] = "running"
                    task_data["started_at"] = datetime.utcnow().isoformat()
                    await self._cache.set_json(f"task:{task_id}", task_data, ttl=86400)
                
                # Executar task
                func = task_map.get(task_name)
                if func:
                    try:
                        result = await asyncio.wait_for(
                            func({}, _task_id=task_id, **kwargs),
                            timeout=config.timeout
                        )
                        
                        # Atualizar sucesso
                        if task_data:
                            task_data["status"] = "completed"
                            task_data["result"] = result
                            task_data["completed_at"] = datetime.utcnow().isoformat()
                            await self._cache.set_json(f"task:{task_id}", task_data, ttl=86400)
                        
                        logger.info("task_completed", task_id=task_id, task_name=task_name)
                        
                    except asyncio.TimeoutError:
                        if task_data:
                            task_data["status"] = "failed"
                            task_data["error"] = "Task timeout"
                            task_data["completed_at"] = datetime.utcnow().isoformat()
                            await self._cache.set_json(f"task:{task_id}", task_data, ttl=86400)
                        logger.error("task_timeout", task_id=task_id)
                        
                    except Exception as e:
                        if task_data:
                            task_data["status"] = "failed"
                            task_data["error"] = str(e)
                            task_data["completed_at"] = datetime.utcnow().isoformat()
                            await self._cache.set_json(f"task:{task_id}", task_data, ttl=86400)
                        logger.error("task_failed", task_id=task_id, error=str(e))
                else:
                    logger.error("task_not_found", task_name=task_name)
                
                queue._get_local_queue().task_done()
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error("task_worker_error", error=str(e))
    
    def stop(self):
        """Para o worker."""
        self._running = False
        logger.info("task_worker_stopped")


# ===== ARQ WORKER SETTINGS =====

if ARQ_AVAILABLE and RedisSettings:
    class WorkerSettings:
        """Configurações do worker ARQ."""
        
        redis_settings = RedisSettings(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", "6379")),
            password=os.getenv("REDIS_PASSWORD")
        )
        
        functions = TASK_FUNCTIONS
        
        max_jobs = 10
        job_timeout = 300  # 5 minutos
        
        @staticmethod
        async def on_startup(ctx: dict):
            logger.info("arq_worker_started")
        
        @staticmethod
        async def on_shutdown(ctx: dict):
            logger.info("arq_worker_stopped")
