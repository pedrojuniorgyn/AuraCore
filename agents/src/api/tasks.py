"""
API endpoints para gerenciamento de tasks.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any

from src.services.tasks import (
    get_task_queue,
    TaskConfig,
    TaskPriority,
    TaskStatus
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])


# ===== SCHEMAS =====

class TaskEnqueueRequest(BaseModel):
    """Request para enfileirar task."""
    task_name: str
    args: dict[str, Any] = {}
    priority: str = "NORMAL"
    max_retries: int = 3
    timeout: int = 300
    
    class Config:
        json_schema_extra = {
            "example": {
                "task_name": "process_document_task",
                "args": {
                    "doc_id": "123",
                    "doc_type": "danfe",
                    "file_path": "/uploads/doc.pdf",
                    "org_id": 1,
                    "branch_id": 1
                },
                "priority": "HIGH",
                "max_retries": 3,
                "timeout": 300
            }
        }


class TaskEnqueueResponse(BaseModel):
    """Response de task enfileirada."""
    task_id: str
    status: str
    message: str


class TaskStatusResponse(BaseModel):
    """Response de status de task."""
    task_id: str
    status: str
    result: Optional[Any] = None
    error: Optional[str] = None
    attempts: int = 0
    duration_ms: Optional[float] = None


class QueueStatsResponse(BaseModel):
    """Response de estatísticas."""
    backend: str
    pending: Optional[int] = None
    queues: Optional[dict] = None


# ===== ENDPOINTS =====

@router.post("/enqueue", response_model=TaskEnqueueResponse, status_code=202)
async def enqueue_task(data: TaskEnqueueRequest):
    """
    Enfileira uma task para execução assíncrona.
    
    Tasks disponíveis:
    - `process_document_task`: Processa DANFe/DACTe
    - `index_documents_task`: Indexa documentos para RAG
    - `deliver_webhook_task`: Entrega webhook com retry
    - `generate_report_task`: Gera relatório
    - `send_notification_task`: Envia notificação
    """
    queue = get_task_queue()
    
    # Converter prioridade
    try:
        priority = TaskPriority[data.priority.upper()]
    except KeyError:
        raise HTTPException(400, f"Prioridade inválida: {data.priority}")
    
    config = TaskConfig(
        max_retries=data.max_retries,
        timeout=data.timeout,
        priority=priority
    )
    
    task_id = await queue.enqueue(
        data.task_name,
        config=config,
        **data.args
    )
    
    return TaskEnqueueResponse(
        task_id=task_id,
        status="queued",
        message=f"Task {data.task_name} enfileirada com sucesso"
    )


@router.get("/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    Obtém status de uma task.
    """
    queue = get_task_queue()
    result = await queue.get_status(task_id)
    
    if not result:
        raise HTTPException(404, "Task não encontrada")
    
    return TaskStatusResponse(
        task_id=result.task_id,
        status=result.status.value,
        result=result.result,
        error=result.error,
        attempts=result.attempts,
        duration_ms=result.duration_ms
    )


@router.post("/{task_id}/cancel", status_code=204)
async def cancel_task(task_id: str):
    """
    Cancela uma task pendente.
    """
    queue = get_task_queue()
    success = await queue.cancel(task_id)
    
    if not success:
        raise HTTPException(400, "Task não pode ser cancelada (já está executando ou concluída)")


@router.get("/{task_id}/wait", response_model=TaskStatusResponse)
async def wait_for_task(task_id: str, timeout: int = 60):
    """
    Aguarda conclusão de uma task.
    
    Args:
        task_id: ID da task
        timeout: Tempo máximo de espera em segundos
    """
    queue = get_task_queue()
    result = await queue.wait_for(task_id, timeout=timeout)
    
    return TaskStatusResponse(
        task_id=result.task_id,
        status=result.status.value,
        result=result.result,
        error=result.error,
        attempts=result.attempts,
        duration_ms=result.duration_ms
    )


@router.get("/", response_model=QueueStatsResponse)
async def get_queue_stats():
    """
    Retorna estatísticas das filas de tasks.
    """
    queue = get_task_queue()
    stats = await queue.get_queue_stats()
    return QueueStatsResponse(**stats)


@router.get("/health/check")
async def get_queue_health():
    """
    Verifica saúde da task queue.
    """
    queue = get_task_queue()
    return await queue.health_check()
