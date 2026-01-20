#!/usr/bin/env python
"""
Inicia scheduler de tasks periódicas.

Uso:
    python scripts/run_scheduler.py
"""

import asyncio
import signal
from datetime import time
import structlog

# Configurar logging
structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer()
    ]
)

logger = structlog.get_logger()


async def cleanup_expired_cache():
    """Limpa cache expirado."""
    from src.services.cache import get_cache
    
    cache = get_cache()
    # Implementar limpeza se necessário
    logger.info("cache_cleanup_executed")


async def generate_daily_reports():
    """Gera relatórios diários."""
    # Implementar geração de relatórios
    logger.info("daily_reports_generated")


async def sync_webhook_failures():
    """Sincroniza webhooks que falharam."""
    logger.info("webhook_sync_executed")


async def main():
    from src.services.tasks import TaskScheduler
    
    scheduler = TaskScheduler()
    
    # Cache cleanup a cada 1 hora
    scheduler.add_interval_task(
        "cleanup_cache",
        cleanup_expired_cache,
        interval_seconds=3600
    )
    
    # Sync webhooks a cada 5 minutos
    scheduler.add_interval_task(
        "sync_webhooks",
        sync_webhook_failures,
        interval_seconds=300
    )
    
    # Relatórios diários às 6h
    scheduler.add_daily_task(
        "daily_reports",
        generate_daily_reports,
        run_at=time(6, 0)
    )
    
    # Configurar handler para SIGTERM/SIGINT
    loop = asyncio.get_event_loop()
    
    async def shutdown():
        logger.info("shutdown_requested")
        await scheduler.stop()
    
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(
            sig, 
            lambda: asyncio.create_task(shutdown())
        )
    
    await scheduler.start()
    
    # Manter rodando
    logger.info("scheduler_running", status=scheduler.get_status())
    
    try:
        while True:
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        pass
    finally:
        await scheduler.stop()


if __name__ == "__main__":
    print("=" * 50)
    print("AuraCore Task Scheduler")
    print("=" * 50)
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Scheduler finalizado")
