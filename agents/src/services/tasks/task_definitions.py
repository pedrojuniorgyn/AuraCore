"""
Definições de tasks do sistema.

Cada task é uma função async que será executada pelo worker.
"""

import asyncio
from typing import Any, Optional
import structlog

logger = structlog.get_logger()


# ===== DOCUMENT PROCESSING =====

async def process_document_task(
    ctx: dict,
    _task_id: str,
    doc_id: str,
    doc_type: str,
    file_path: str,
    org_id: int,
    branch_id: int
) -> dict:
    """
    Processa documento em background.
    
    Args:
        doc_id: ID do documento
        doc_type: Tipo (danfe, dacte, etc)
        file_path: Caminho do arquivo
        org_id: ID da organização
        branch_id: ID da filial
    
    Returns:
        Resultado do processamento
    """
    logger.info(
        "task_process_document_start",
        task_id=_task_id,
        doc_id=doc_id,
        doc_type=doc_type
    )
    
    try:
        # Importar serviço de documentos
        from src.services.document_processing import get_docling_processor
        
        processor = get_docling_processor()
        result = await processor.process_document(
            file_path=file_path,
            doc_type=doc_type
        )
        
        logger.info(
            "task_process_document_completed",
            task_id=_task_id,
            doc_id=doc_id,
            confidence=result.get("confidence") if result else None
        )
        
        return {
            "success": True,
            "doc_id": doc_id,
            "result": result
        }
        
    except Exception as e:
        logger.error(
            "task_process_document_failed",
            task_id=_task_id,
            doc_id=doc_id,
            error=str(e)
        )
        raise


# ===== RAG INDEXING =====

async def index_documents_task(
    ctx: dict,
    _task_id: str,
    documents: list[dict],
    collection: str = "default"
) -> dict:
    """
    Indexa documentos para RAG em background.
    
    Args:
        documents: Lista de docs [{id, content, metadata}]
        collection: Nome da coleção
    
    Returns:
        Resultado da indexação
    """
    logger.info(
        "task_index_documents_start",
        task_id=_task_id,
        count=len(documents),
        collection=collection
    )
    
    try:
        from src.services.knowledge import get_document_indexer
        
        indexer = get_document_indexer()
        indexed = 0
        errors = []
        
        for doc in documents:
            try:
                await indexer.index_document(
                    doc_id=doc["id"],
                    content=doc["content"],
                    metadata=doc.get("metadata", {}),
                    collection=collection
                )
                indexed += 1
            except Exception as e:
                errors.append({"doc_id": doc["id"], "error": str(e)})
        
        logger.info(
            "task_index_documents_completed",
            task_id=_task_id,
            indexed=indexed,
            errors=len(errors)
        )
        
        return {
            "success": len(errors) == 0,
            "indexed": indexed,
            "errors": errors
        }
        
    except Exception as e:
        logger.error(
            "task_index_documents_failed",
            task_id=_task_id,
            error=str(e)
        )
        raise


# ===== WEBHOOK DELIVERY =====

async def deliver_webhook_task(
    ctx: dict,
    _task_id: str,
    event_data: dict,
    endpoint_url: str,
    secret: Optional[str] = None,
    max_retries: int = 3
) -> dict:
    """
    Entrega webhook com retry persistente.
    
    Args:
        event_data: Dados do evento
        endpoint_url: URL do endpoint
        secret: Secret para assinatura
        max_retries: Máximo de tentativas
    
    Returns:
        Resultado da entrega
    """
    logger.info(
        "task_deliver_webhook_start",
        task_id=_task_id,
        event_type=event_data.get("type"),
        endpoint=endpoint_url
    )
    
    try:
        from src.services.webhooks import WebhookEvent, WebhookDelivery
        from src.services.webhooks.webhook_events import EventType
        
        # Reconstruir evento
        event = WebhookEvent(
            id=event_data.get("id"),
            type=EventType(event_data.get("type")),
            data=event_data.get("data", {}),
            metadata=event_data.get("metadata", {}),
            organization_id=event_data.get("organization_id"),
            branch_id=event_data.get("branch_id"),
            user_id=event_data.get("user_id"),
            session_id=event_data.get("session_id")
        )
        
        delivery = WebhookDelivery(
            event=event,
            endpoint_url=endpoint_url,
            secret=secret,
            max_retries=max_retries
        )
        
        success = await delivery.deliver()
        
        logger.info(
            "task_deliver_webhook_completed",
            task_id=_task_id,
            success=success,
            attempts=len(delivery.attempts)
        )
        
        return {
            "success": success,
            "attempts": len(delivery.attempts),
            "status": delivery.status.value
        }
        
    except Exception as e:
        logger.error(
            "task_deliver_webhook_failed",
            task_id=_task_id,
            error=str(e)
        )
        raise


# ===== REPORT GENERATION =====

async def generate_report_task(
    ctx: dict,
    _task_id: str,
    report_type: str,
    parameters: dict,
    org_id: int,
    branch_id: int,
    user_id: str
) -> dict:
    """
    Gera relatório em background.
    
    Args:
        report_type: Tipo do relatório
        parameters: Parâmetros do relatório
        org_id: ID da organização
        branch_id: ID da filial
        user_id: ID do usuário solicitante
    
    Returns:
        URL do relatório gerado
    """
    logger.info(
        "task_generate_report_start",
        task_id=_task_id,
        report_type=report_type,
        user_id=user_id
    )
    
    try:
        # Simular geração de relatório
        # Em produção, usar serviço de relatórios
        await asyncio.sleep(2)  # Simular processamento
        
        report_url = f"/reports/{_task_id}.pdf"
        
        logger.info(
            "task_generate_report_completed",
            task_id=_task_id,
            report_url=report_url
        )
        
        return {
            "success": True,
            "report_url": report_url,
            "report_type": report_type
        }
        
    except Exception as e:
        logger.error(
            "task_generate_report_failed",
            task_id=_task_id,
            error=str(e)
        )
        raise


# ===== NOTIFICATIONS =====

async def send_notification_task(
    ctx: dict,
    _task_id: str,
    notification_type: str,
    recipients: list[str],
    subject: str,
    content: str,
    metadata: Optional[dict] = None
) -> dict:
    """
    Envia notificação em background.
    
    Args:
        notification_type: email, sms, push
        recipients: Lista de destinatários
        subject: Assunto
        content: Conteúdo
        metadata: Dados adicionais
    
    Returns:
        Resultado do envio
    """
    logger.info(
        "task_send_notification_start",
        task_id=_task_id,
        type=notification_type,
        recipients_count=len(recipients)
    )
    
    try:
        sent = 0
        failed = []
        
        for recipient in recipients:
            try:
                # Em produção, usar serviço de notificação real
                # await email_service.send(recipient, subject, content)
                await asyncio.sleep(0.1)  # Simular envio
                sent += 1
            except Exception as e:
                failed.append({"recipient": recipient, "error": str(e)})
        
        logger.info(
            "task_send_notification_completed",
            task_id=_task_id,
            sent=sent,
            failed=len(failed)
        )
        
        return {
            "success": len(failed) == 0,
            "sent": sent,
            "failed": failed
        }
        
    except Exception as e:
        logger.error(
            "task_send_notification_failed",
            task_id=_task_id,
            error=str(e)
        )
        raise


# ===== REGISTRO DE TASKS =====

# Mapeamento de tasks para uso com ARQ
TASK_FUNCTIONS = [
    process_document_task,
    index_documents_task,
    deliver_webhook_task,
    generate_report_task,
    send_notification_task
]
