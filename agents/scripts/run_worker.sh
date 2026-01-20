#!/bin/bash
# agents/scripts/run_worker.sh
# Inicia worker de tasks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "🔄 Iniciando worker de tasks..."

# Verificar se ARQ está instalado
if python -c "import arq" 2>/dev/null; then
    echo "✅ ARQ disponível, usando worker de produção"
    arq src.services.tasks.task_worker.WorkerSettings
else
    echo "⚠️ ARQ não disponível, usando worker local"
    python -c "
import asyncio
from src.services.tasks.task_worker import TaskWorker

async def main():
    worker = TaskWorker()
    try:
        await worker.run()
    except KeyboardInterrupt:
        worker.stop()

asyncio.run(main())
"
fi
