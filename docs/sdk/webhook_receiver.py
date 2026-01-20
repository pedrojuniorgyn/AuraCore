#!/usr/bin/env python3
"""
Exemplo de receptor de webhooks AuraCore.

Demonstra como:
- Receber webhooks do AuraCore
- Verificar assinatura HMAC-SHA256
- Processar diferentes tipos de eventos
"""

import hmac
import hashlib
from flask import Flask, request, jsonify

app = Flask(__name__)

# Configurar secret (deve ser o mesmo configurado no AuraCore)
WEBHOOK_SECRET = "seu-secret-aqui"


def verify_signature(payload: bytes, signature: str) -> bool:
    """
    Verifica assinatura HMAC-SHA256 do webhook.
    
    Args:
        payload: Body da requisição (bytes)
        signature: Header X-Webhook-Signature
    
    Returns:
        True se assinatura válida
    """
    if not signature.startswith("sha256="):
        return False
    
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    # Comparação segura contra timing attacks
    return hmac.compare_digest(f"sha256={expected}", signature)


@app.route("/webhook", methods=["POST"])
def webhook_handler():
    """
    Endpoint que recebe webhooks do AuraCore.
    
    Headers esperados:
    - X-Webhook-Signature: Assinatura HMAC-SHA256
    - X-Webhook-Event: Tipo do evento
    - X-Webhook-ID: ID único do evento
    - X-Webhook-Timestamp: Timestamp do evento
    """
    
    # Verificar assinatura
    signature = request.headers.get("X-Webhook-Signature", "")
    if WEBHOOK_SECRET and not verify_signature(request.data, signature):
        return jsonify({"error": "Invalid signature"}), 401
    
    # Extrair metadados
    event_type = request.headers.get("X-Webhook-Event")
    event_id = request.headers.get("X-Webhook-ID")
    timestamp = request.headers.get("X-Webhook-Timestamp")
    
    print(f"\n{'='*50}")
    print(f"Webhook recebido!")
    print(f"  Evento: {event_type}")
    print(f"  ID: {event_id}")
    print(f"  Timestamp: {timestamp}")
    
    # Parsear body
    data = request.json
    print(f"  Dados: {data}")
    
    # Rotear para handler apropriado
    handlers = {
        "agent.message.processed": handle_agent_message,
        "agent.message.received": handle_agent_message,
        "document.imported": handle_document_imported,
        "document.processed": handle_document_processed,
        "fiscal.nfe.validated": handle_fiscal_validation,
        "fiscal.cte.validated": handle_fiscal_validation,
        "fiscal.tax.calculated": handle_tax_calculated,
        "voice.transcription.completed": handle_voice_event,
        "voice.synthesis.completed": handle_voice_event,
        "rag.query.completed": handle_rag_event,
        "system.health.changed": handle_system_event,
        "system.alert.triggered": handle_system_event,
    }
    
    handler = handlers.get(event_type, handle_unknown_event)
    
    try:
        handler(data)
        return jsonify({"status": "received"}), 200
    except Exception as e:
        print(f"  Erro ao processar: {e}")
        return jsonify({"error": str(e)}), 500


# ===== HANDLERS POR TIPO DE EVENTO =====

def handle_agent_message(data: dict):
    """Processa evento de mensagem de agente."""
    event_data = data.get("data", {})
    context = data.get("context", {})
    
    agent_type = event_data.get("agent_type", "unknown")
    message = event_data.get("message", "")
    response = event_data.get("response", "")
    latency = event_data.get("latency_ms", 0)
    
    print(f"\n  [AGENT] {agent_type}")
    print(f"  Pergunta: {message[:100]}...")
    print(f"  Resposta: {response[:100]}...")
    print(f"  Latência: {latency:.0f}ms")
    print(f"  Org/Branch: {context.get('organization_id')}/{context.get('branch_id')}")
    
    # Aqui você pode:
    # - Salvar em banco de dados para analytics
    # - Enviar para sistema de monitoramento
    # - Notificar via Slack/Teams
    # - Atualizar dashboard em tempo real


def handle_document_imported(data: dict):
    """Processa evento de documento importado."""
    event_data = data.get("data", {})
    
    doc_type = event_data.get("doc_type", "unknown")
    doc_id = event_data.get("doc_id", "")
    confidence = event_data.get("confidence", 0)
    
    print(f"\n  [DOCUMENTO] {doc_type} importado")
    print(f"  ID: {doc_id}")
    print(f"  Confiança: {confidence:.1%}")
    
    # Ações possíveis:
    # - Notificar usuário
    # - Iniciar workflow de aprovação
    # - Integrar com sistema externo


def handle_document_processed(data: dict):
    """Processa evento de documento processado."""
    event_data = data.get("data", {})
    
    print(f"\n  [DOCUMENTO] Processado")
    print(f"  Dados: {event_data}")


def handle_fiscal_validation(data: dict):
    """Processa evento de validação fiscal."""
    event_data = data.get("data", {})
    
    doc_type = data.get("type", "").split(".")[-2]  # nfe ou cte
    
    print(f"\n  [FISCAL] {doc_type.upper()} validado")
    print(f"  Dados: {event_data}")
    
    # Ações possíveis:
    # - Atualizar status no ERP
    # - Enviar para contabilidade
    # - Notificar cliente


def handle_tax_calculated(data: dict):
    """Processa evento de cálculo de imposto."""
    event_data = data.get("data", {})
    
    print(f"\n  [FISCAL] Imposto calculado")
    print(f"  Dados: {event_data}")


def handle_voice_event(data: dict):
    """Processa eventos de voz."""
    event_data = data.get("data", {})
    
    print(f"\n  [VOICE] Evento de voz")
    print(f"  Dados: {event_data}")


def handle_rag_event(data: dict):
    """Processa eventos de RAG."""
    event_data = data.get("data", {})
    
    print(f"\n  [RAG] Query completada")
    print(f"  Dados: {event_data}")


def handle_system_event(data: dict):
    """Processa eventos de sistema."""
    event_data = data.get("data", {})
    event_type = data.get("type", "")
    
    print(f"\n  [SYSTEM] {event_type}")
    print(f"  Dados: {event_data}")
    
    # Ações para alertas:
    # - Enviar notificação urgente
    # - Abrir ticket de suporte
    # - Acionar equipe de plantão


def handle_unknown_event(data: dict):
    """Handler para eventos desconhecidos."""
    print(f"\n  [UNKNOWN] Evento não mapeado")
    print(f"  Dados: {data}")


# ===== MAIN =====

if __name__ == "__main__":
    print("=" * 50)
    print("AuraCore Webhook Receiver")
    print("=" * 50)
    print(f"Secret configurado: {'Sim' if WEBHOOK_SECRET else 'Não'}")
    print("Iniciando servidor em http://localhost:5000/webhook")
    print("=" * 50)
    
    app.run(port=5000, debug=True)
