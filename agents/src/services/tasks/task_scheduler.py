"""
Agendador de tasks periódicas.
"""

import asyncio
from typing import Callable, Awaitable, Optional
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from enum import Enum
import structlog

logger = structlog.get_logger()


class ScheduleType(str, Enum):
    """Tipo de agendamento."""
    INTERVAL = "interval"
    CRON = "cron"
    DAILY = "daily"


@dataclass
class ScheduledTask:
    """Task agendada."""
    name: str
    func: Callable[[], Awaitable]
    schedule_type: ScheduleType
    interval_seconds: Optional[int] = None
    daily_time: Optional[time] = None
    cron_expression: Optional[str] = None
    is_active: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None


class TaskScheduler:
    """
    Agendador de tasks periódicas.
    
    Uso:
        scheduler = TaskScheduler()
        
        # Task a cada 5 minutos
        scheduler.add_interval_task(
            "cleanup_cache",
            cleanup_func,
            interval_seconds=300
        )
        
        # Task diária às 3h
        scheduler.add_daily_task(
            "generate_reports",
            report_func,
            run_at=time(3, 0)
        )
        
        await scheduler.start()
    """
    
    def __init__(self):
        self._tasks: dict[str, ScheduledTask] = {}
        self._running = False
        self._task_handles: dict[str, asyncio.Task] = {}
    
    def add_interval_task(
        self,
        name: str,
        func: Callable[[], Awaitable],
        interval_seconds: int
    ):
        """Adiciona task executada em intervalo fixo."""
        self._tasks[name] = ScheduledTask(
            name=name,
            func=func,
            schedule_type=ScheduleType.INTERVAL,
            interval_seconds=interval_seconds
        )
        logger.info(
            "scheduled_task_added",
            name=name,
            type="interval",
            interval=interval_seconds
        )
    
    def add_daily_task(
        self,
        name: str,
        func: Callable[[], Awaitable],
        run_at: time
    ):
        """Adiciona task executada diariamente."""
        self._tasks[name] = ScheduledTask(
            name=name,
            func=func,
            schedule_type=ScheduleType.DAILY,
            daily_time=run_at
        )
        logger.info(
            "scheduled_task_added",
            name=name,
            type="daily",
            time=run_at.isoformat()
        )
    
    async def start(self):
        """Inicia o scheduler."""
        self._running = True
        logger.info("task_scheduler_started", tasks=list(self._tasks.keys()))
        
        for name, task in self._tasks.items():
            if task.is_active:
                self._task_handles[name] = asyncio.create_task(
                    self._run_task(task)
                )
    
    async def stop(self):
        """Para o scheduler."""
        self._running = False
        
        for handle in self._task_handles.values():
            handle.cancel()
        
        await asyncio.gather(*self._task_handles.values(), return_exceptions=True)
        self._task_handles.clear()
        
        logger.info("task_scheduler_stopped")
    
    async def _run_task(self, task: ScheduledTask):
        """Executa task conforme agendamento."""
        while self._running:
            try:
                if task.schedule_type == ScheduleType.INTERVAL:
                    await asyncio.sleep(task.interval_seconds or 60)
                
                elif task.schedule_type == ScheduleType.DAILY:
                    await self._wait_for_daily_time(task.daily_time)
                
                # Executar task
                task.last_run = datetime.utcnow()
                logger.info("scheduled_task_running", name=task.name)
                
                try:
                    await task.func()
                    logger.info("scheduled_task_completed", name=task.name)
                except Exception as e:
                    logger.error(
                        "scheduled_task_failed",
                        name=task.name,
                        error=str(e)
                    )
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("scheduler_error", task=task.name, error=str(e))
                await asyncio.sleep(60)  # Esperar antes de tentar novamente
    
    async def _wait_for_daily_time(self, run_at: Optional[time]):
        """Aguarda até o horário diário especificado."""
        if not run_at:
            await asyncio.sleep(86400)  # 24h
            return
        
        now = datetime.utcnow()
        target = datetime.combine(now.date(), run_at)
        
        if target <= now:
            # Já passou, agendar para amanhã
            target = target + timedelta(days=1)
        
        wait_seconds = (target - now).total_seconds()
        await asyncio.sleep(wait_seconds)
    
    def get_status(self) -> dict:
        """Retorna status de todas as tasks agendadas."""
        return {
            "running": self._running,
            "tasks": {
                name: {
                    "type": task.schedule_type.value,
                    "is_active": task.is_active,
                    "last_run": task.last_run.isoformat() if task.last_run else None,
                    "interval_seconds": task.interval_seconds,
                    "daily_time": task.daily_time.isoformat() if task.daily_time else None
                }
                for name, task in self._tasks.items()
            }
        }
