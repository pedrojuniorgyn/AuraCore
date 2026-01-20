"""
Chaves de mensagens para tradução.
"""

from enum import Enum


class MessageKey(str, Enum):
    """Chaves de mensagens traduzíveis."""
    
    # ===== GERAL =====
    WELCOME = "general.welcome"
    GOODBYE = "general.goodbye"
    ERROR_GENERIC = "general.error_generic"
    NOT_FOUND = "general.not_found"
    UNAUTHORIZED = "general.unauthorized"
    FORBIDDEN = "general.forbidden"
    VALIDATION_ERROR = "general.validation_error"
    
    # ===== AGENTES =====
    AGENT_THINKING = "agent.thinking"
    AGENT_PROCESSING = "agent.processing"
    AGENT_ERROR = "agent.error"
    AGENT_UNKNOWN_INTENT = "agent.unknown_intent"
    AGENT_CLARIFICATION_NEEDED = "agent.clarification_needed"
    AGENT_TASK_COMPLETED = "agent.task_completed"
    
    # ===== FISCAL =====
    FISCAL_NFE_VALIDATED = "fiscal.nfe_validated"
    FISCAL_NFE_INVALID = "fiscal.nfe_invalid"
    FISCAL_CTE_VALIDATED = "fiscal.cte_validated"
    FISCAL_CTE_INVALID = "fiscal.cte_invalid"
    FISCAL_TAX_CALCULATED = "fiscal.tax_calculated"
    FISCAL_ICMS_RATE = "fiscal.icms_rate"
    FISCAL_PIS_COFINS_RATE = "fiscal.pis_cofins_rate"
    FISCAL_SPED_GENERATED = "fiscal.sped_generated"
    FISCAL_SPED_ERROR = "fiscal.sped_error"
    
    # ===== FINANCIAL =====
    FINANCIAL_PAYMENT_DUE = "financial.payment_due"
    FINANCIAL_PAYMENT_RECEIVED = "financial.payment_received"
    FINANCIAL_INVOICE_CREATED = "financial.invoice_created"
    FINANCIAL_BALANCE_UPDATED = "financial.balance_updated"
    FINANCIAL_INSUFFICIENT_FUNDS = "financial.insufficient_funds"
    
    # ===== TMS =====
    TMS_SHIPMENT_CREATED = "tms.shipment_created"
    TMS_SHIPMENT_DISPATCHED = "tms.shipment_dispatched"
    TMS_SHIPMENT_DELIVERED = "tms.shipment_delivered"
    TMS_ROUTE_OPTIMIZED = "tms.route_optimized"
    TMS_DRIVER_ASSIGNED = "tms.driver_assigned"
    
    # ===== VOICE =====
    VOICE_TRANSCRIPTION_READY = "voice.transcription_ready"
    VOICE_SYNTHESIS_READY = "voice.synthesis_ready"
    VOICE_NO_SPEECH = "voice.no_speech"
    VOICE_AUDIO_TOO_SHORT = "voice.audio_too_short"
    VOICE_PROCESSING_ERROR = "voice.processing_error"
    
    # ===== RAG =====
    RAG_NO_RESULTS = "rag.no_results"
    RAG_SOURCES_FOUND = "rag.sources_found"
    RAG_LEGISLATION_CONTEXT = "rag.legislation_context"
    
    # ===== TASKS =====
    TASK_QUEUED = "task.queued"
    TASK_RUNNING = "task.running"
    TASK_COMPLETED = "task.completed"
    TASK_FAILED = "task.failed"
    TASK_CANCELLED = "task.cancelled"
    
    # ===== WEBHOOKS =====
    WEBHOOK_DELIVERED = "webhook.delivered"
    WEBHOOK_FAILED = "webhook.failed"
    WEBHOOK_RETRY = "webhook.retry"
    
    # ===== DOCUMENTS =====
    DOCUMENT_IMPORTED = "document.imported"
    DOCUMENT_PROCESSED = "document.processed"
    DOCUMENT_INVALID = "document.invalid"
    DOCUMENT_OCR_FAILED = "document.ocr_failed"
