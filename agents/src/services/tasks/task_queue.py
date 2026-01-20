"""
Task Queue usando ARQ (Async Redis Queue).

Features:
- Tarefas assíncronas com Redis
- Retry automático com backoff
- Prioridades de execução
- Monitoramento de status
"""

import asyncio
import uuid
from typing import Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import structlog

try:
    from arq import create_pool
    from arq.connections import RedisSettings, ArqRedis
    ARQ_AVAILABLE = True
except ImportError:
    ARQ_AVAILABLE = False
    RedisSettings = None
    ArqRedis = None

from src.services.cache import get_cache

logger = structlog.get_logger()


class TaskStatus(str, Enum):
    """Status de uma task."""
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"


class TaskPriority(int, Enum):
    """Prioridade de execução."""
    LOW = 0
    NORMAL = 5
    HIGH = 10
    CRITICAL = 20


@dataclass
class TaskResult:
    """Resultado de uma task."""
    task_id: str
    status: TaskStatus
    result: Optional[Any] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    attempts: int = 0
    
    @property
    def duration_ms(self) -> Optional[float]:
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds() * 1000
        return None


@dataclass
class TaskConfig:
    """Configuração de uma task."""
    max_retries: int = 3
    retry_delay: int = 60  # segundos
    timeout: int = 300  # 5 minutos
    priority: TaskPriority = TaskPriority.NORMAL
    queue: str = "default"


class TaskQueue:
    """
    Gerenciador de task queue.
    
    Uso:
        queue = get_task_queue()
        
        # Enfileirar task
        task_id = await queue.enqueue(
            "process_document",
            doc_id="123",
            doc_type="danfe",
            priority=TaskPriority.HIGH
        )
        
        # Verificar status
        result = await queue.get_status(task_id)
        
        # Aguardar conclusão
        result = await queue.wait_for(task_id, timeout=60)
    """
    
    def __init__(
        self,
        redis_host: str = "localhost",
        redis_port: int = 6379,
        redis_password: Optional[str] = None
    ):
        self._redis_settings = None
        if ARQ_AVAILABLE and RedisSettings:
            self._redis_settings = RedisSettings(
                host=redis_host,
                port=redis_port,
                password=redis_password
            )
        
        self._pool: Optional[Any] = None
        self._cache = get_cache()
        # Lazy initialization para evitar RuntimeError em Python 3.11+
        # asyncio.Queue() requer event loop ativo
        self._local_queue: Optional[asyncio.Queue] = None
        self._use_local = not ARQ_AVAILABLE
        
        logger.info(
            "task_queue_initialized",
            use_arq=ARQ_AVAILABLE,
            redis_host=redis_host
        )
    
    def _get_local_queue(self) -> asyncio.Queue:
        """Lazy initialization de asyncio.Queue (requer event loop ativo)."""
        if self._local_queue is None:
            self._local_queue = asyncio.Queue()
        return self._local_queue
    
    async def _get_pool(self) -> Any:
        """Obtém pool de conexão ARQ."""
        if self._use_local:
            return None
        
        if self._pool is None:
            try:
                self._pool = await create_pool(self._redis_settings)
                logger.info("arq_pool_created")
            except Exception as e:
                logger.warning("arq_pool_failed", error=str(e))
                self._use_local = True
                return None
        
        return self._pool
    
    # ===== ENFILEIRAMENTO =====
    
    async def enqueue(
        self,
        task_name: str,
        config: Optional[TaskConfig] = None,
        **kwargs
    ) -> str:
        """
        Enfileira uma task para execução.
        
        Args:
            task_name: Nome da task registrada
            config: Configuração opcional
            **kwargs: Argumentos da task
        
        Returns:
            task_id único
        """
        config = config or TaskConfig()
        task_id = str(uuid.uuid4())
        
        # Registrar task no cache
        task_data = {
            "id": task_id,
            "name": task_name,
            "status": TaskStatus.PENDING.value,
            "args": kwargs,
            "config": {
                "max_retries": config.max_retries,
                "retry_delay": config.retry_delay,
                "timeout": config.timeout,
                "priority": config.priority.value,
                "queue": config.queue
            },
            "created_at": datetime.utcnow().isoformat(),
            "attempts": 0
        }
        
        await self._cache.set_json(
            f"task:{task_id}",
            task_data,
            ttl=86400  # 24 horas
        )
        
        pool = await self._get_pool()
        
        if pool and not self._use_local:
            # Usar ARQ
            try:
                await pool.enqueue_job(
                    task_name,
                    _task_id=task_id,
                    _queue_name=config.queue,
                    _defer_by=timedelta(seconds=0),
                    **kwargs
                )
                
                # Atualizar status
                task_data["status"] = TaskStatus.QUEUED.value
                await self._cache.set_json(f"task:{task_id}", task_data, ttl=86400)
                
                logger.info(
                    "task_enqueued",
                    task_id=task_id,
                    task_name=task_name,
                    queue=config.queue,
                    priority=config.priority.name
                )
                
            except Exception as e:
                logger.error("task_enqueue_failed", error=str(e))
                task_data["status"] = TaskStatus.FAILED.value
                task_data["error"] = str(e)
                await self._cache.set_json(f"task:{task_id}", task_data, ttl=86400)
        else:
            # Fallback local (para desenvolvimento)
            await self._get_local_queue().put((task_id, task_name, kwargs, config))
            task_data["status"] = TaskStatus.QUEUED.value
            await self._cache.set_json(f"task:{task_id}", task_data, ttl=86400)
            logger.info("task_enqueued_local", task_id=task_id, task_name=task_name)
        
        return task_id
    
    async def enqueue_in(
        self,
        task_name: str,
        delay_seconds: int,
        config: Optional[TaskConfig] = None,
        **kwargs
    ) -> str:
        """Enfileira task para execução após delay."""
        config = config or TaskConfig()
        task_id = str(uuid.uuid4())
        
        pool = await self._get_pool()
        
        if pool and not self._use_local:
            await pool.enqueue_job(
                task_name,
                _task_id=task_id,
                _queue_name=config.queue,
                _defer_by=timedelta(seconds=delay_seconds),
                **kwargs
            )
            logger.info(
                "task_scheduled",
                task_id=task_id,
                delay_seconds=delay_seconds
            )
        else:
            # Local: agendar com asyncio
            asyncio.create_task(self._delayed_enqueue(
                task_id, task_name, delay_seconds, config, kwargs
            ))
        
        return task_id
    
    async def _delayed_enqueue(
        self,
        task_id: str,
        task_name: str,
        delay: int,
        config: TaskConfig,
        kwargs: dict
    ):
        """Helper para enfileiramento atrasado local."""
        await asyncio.sleep(delay)
        await self._get_local_queue().put((task_id, task_name, kwargs, config))
    
    # ===== STATUS =====
    
    async def get_status(self, task_id: str) -> Optional[TaskResult]:
        """Obtém status de uma task."""
        task_data = await self._cache.get_json(f"task:{task_id}")
        
        if not task_data:
            return None
        
        return TaskResult(
            task_id=task_data["id"],
            status=TaskStatus(task_data["status"]),
            result=task_data.get("result"),
            error=task_data.get("error"),
            started_at=datetime.fromisoformat(task_data["started_at"]) if task_data.get("started_at") else None,
            completed_at=datetime.fromisoformat(task_data["completed_at"]) if task_data.get("completed_at") else None,
            attempts=task_data.get("attempts", 0)
        )
    
    async def wait_for(
        self,
        task_id: str,
        timeout: int = 60,
        poll_interval: float = 0.5
    ) -> Optional[TaskResult]:
        """
        Aguarda conclusão de uma task.
        
        Returns:
            TaskResult se task existe (completa, falha ou timeout)
            None se task não existe
        """
        # Verificar se task existe antes de esperar
        initial_status = await self.get_status(task_id)
        if initial_status is None:
            return None  # Task não existe - API retornará 404
        
        start = datetime.utcnow()
        
        while (datetime.utcnow() - start).total_seconds() < timeout:
            result = await self.get_status(task_id)
            
            if result and result.status in [
                TaskStatus.COMPLETED,
                TaskStatus.FAILED,
                TaskStatus.CANCELLED
            ]:
                return result
            
            await asyncio.sleep(poll_interval)
        
        # Timeout - task existe mas não completou a tempo
        return TaskResult(
            task_id=task_id,
            status=TaskStatus.FAILED,
            error="Task execution timed out"
        )
    
    # ===== CANCELAMENTO =====
    
    async def cancel(self, task_id: str) -> bool:
        """Cancela uma task pendente."""
        task_data = await self._cache.get_json(f"task:{task_id}")
        
        if not task_data:
            return False
        
        if task_data["status"] in [TaskStatus.RUNNING.value, TaskStatus.COMPLETED.value]:
            return False
        
        task_data["status"] = TaskStatus.CANCELLED.value
        task_data["completed_at"] = datetime.utcnow().isoformat()
        await self._cache.set_json(f"task:{task_id}", task_data, ttl=86400)
        
        logger.info("task_cancelled", task_id=task_id)
        return True
    
    # ===== MÉTRICAS =====
    
    async def get_queue_stats(self) -> dict:
        """Retorna estatísticas das filas."""
        pool = await self._get_pool()
        
        if pool and not self._use_local:
            # ARQ stats
            try:
                info = await pool.info()
                return {
                    "backend": "arq",
                    "queues": info
                }
            except Exception:
                pass
        
        return {
            "backend": "local",
            "pending": self._get_local_queue().qsize() if self._local_queue else 0
        }
    
    async def health_check(self) -> dict:
        """Verifica saúde da task queue."""
        pool = await self._get_pool()
        
        if self._use_local:
            return {
                "status": "degraded",
                "backend": "local",
                "message": "Usando fila local (sem persistência)"
            }
        
        try:
            await pool.ping()
            return {
                "status": "healthy",
                "backend": "arq"
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "backend": "arq",
                "error": str(e)
            }


# Singleton
_task_queue: Optional[TaskQueue] = None


def get_task_queue() -> TaskQueue:
    """Retorna instância singleton da task queue."""
    global _task_queue
    if _task_queue is None:
        import os
        _task_queue = TaskQueue(
            redis_host=os.getenv("REDIS_HOST", "localhost"),
            redis_port=int(os.getenv("REDIS_PORT", "6379")),
            redis_password=os.getenv("REDIS_PASSWORD")
        )
    return _task_queue
