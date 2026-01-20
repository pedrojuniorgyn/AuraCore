"""
Serviço de tradução.
"""

import json
from typing import Any, Optional, Union
from pathlib import Path
import structlog

from .locales import Locale, DEFAULT_LOCALE, SUPPORTED_LOCALES
from .messages import MessageKey

logger = structlog.get_logger()


class Translator:
    """
    Serviço de tradução com fallback.
    
    Uso:
        translator = get_translator()
        
        # Tradução simples
        msg = translator.t(MessageKey.WELCOME, locale=Locale.PT_BR)
        
        # Com interpolação
        msg = translator.t(
            MessageKey.FISCAL_ICMS_RATE,
            locale=Locale.PT_BR,
            rate="12%",
            uf_origem="SP",
            uf_destino="RJ"
        )
        
        # Tradução com fallback
        msg = translator.t("custom.key", locale=Locale.ES)  # Fallback para EN se não existir em ES
    """
    
    def __init__(self, translations_dir: Optional[str] = None):
        self._translations: dict[Locale, dict[str, Any]] = {}
        self._translations_dir = translations_dir or self._default_translations_dir()
        
        self._load_translations()
        
        logger.info(
            "translator_initialized",
            locales=len(self._translations),
            dir=self._translations_dir
        )
    
    def _default_translations_dir(self) -> str:
        """Diretório padrão de traduções."""
        current_dir = Path(__file__).parent
        return str(current_dir / "translations")
    
    def _load_translations(self) -> None:
        """Carrega arquivos de tradução."""
        translations_path = Path(self._translations_dir)
        
        if not translations_path.exists():
            logger.warning("translations_dir_not_found", dir=self._translations_dir)
            self._create_default_translations()
            return
        
        for locale in SUPPORTED_LOCALES:
            file_path = translations_path / f"{locale.value}.json"
            
            if file_path.exists():
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        self._translations[locale] = json.load(f)
                    logger.debug("translations_loaded", locale=locale.value)
                except Exception as e:
                    logger.error(
                        "translations_load_error",
                        locale=locale.value,
                        error=str(e)
                    )
                    # Usar default em memória como fallback
                    self._load_default_for_locale(locale)
            else:
                logger.warning("translations_file_not_found", locale=locale.value)
                self._load_default_for_locale(locale)
    
    def _load_default_for_locale(self, locale: Locale) -> None:
        """Carrega tradução padrão para um locale."""
        if locale == Locale.PT_BR:
            self._translations[locale] = self._get_pt_br_translations()
        elif locale == Locale.EN:
            self._translations[locale] = self._get_en_translations()
        elif locale == Locale.ES:
            self._translations[locale] = self._get_es_translations()
    
    def _create_default_translations(self) -> None:
        """Cria traduções padrão em memória."""
        self._translations[Locale.PT_BR] = self._get_pt_br_translations()
        self._translations[Locale.EN] = self._get_en_translations()
        self._translations[Locale.ES] = self._get_es_translations()
    
    def t(
        self,
        key: Union[str, MessageKey],
        locale: Optional[Locale] = None,
        **kwargs: Any
    ) -> str:
        """
        Traduz uma chave para o locale especificado.
        
        Args:
            key: Chave de tradução ou MessageKey
            locale: Locale alvo (default: DEFAULT_LOCALE)
            **kwargs: Variáveis para interpolação
        
        Returns:
            String traduzida
        """
        locale = locale or DEFAULT_LOCALE
        key_str = key.value if isinstance(key, MessageKey) else key
        
        # Tentar locale especificado
        translation = self._get_translation(key_str, locale)
        
        # Fallback para inglês
        if translation is None and locale != Locale.EN:
            translation = self._get_translation(key_str, Locale.EN)
        
        # Fallback para português
        if translation is None and locale != Locale.PT_BR:
            translation = self._get_translation(key_str, Locale.PT_BR)
        
        # Último fallback: retornar a chave
        if translation is None:
            logger.warning("translation_not_found", key=key_str, locale=locale.value)
            return key_str
        
        # Interpolação
        if kwargs:
            try:
                translation = translation.format(**kwargs)
            except KeyError as e:
                logger.error(
                    "translation_interpolation_error",
                    key=key_str,
                    error=str(e)
                )
        
        return translation
    
    def _get_translation(self, key: str, locale: Locale) -> Optional[str]:
        """Obtém tradução do cache."""
        translations = self._translations.get(locale, {})
        
        # Suporta chaves aninhadas: "fiscal.icms_rate"
        keys = key.split(".")
        value: Any = translations
        
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
            else:
                return None
        
        return value if isinstance(value, str) else None
    
    def get_available_locales(self) -> list[Locale]:
        """Retorna locales disponíveis."""
        return list(self._translations.keys())
    
    def add_translations(self, locale: Locale, translations: dict[str, Any]) -> None:
        """Adiciona traduções programaticamente."""
        if locale not in self._translations:
            self._translations[locale] = {}
        
        self._deep_merge(self._translations[locale], translations)
        logger.info("translations_added", locale=locale.value, count=len(translations))
    
    def _deep_merge(self, base: dict[str, Any], updates: dict[str, Any]) -> None:
        """Merge profundo de dicionários."""
        for key, value in updates.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._deep_merge(base[key], value)
            else:
                base[key] = value
    
    # ===== TRADUÇÕES PADRÃO =====
    
    @staticmethod
    def _get_pt_br_translations() -> dict[str, Any]:
        """Traduções em português brasileiro."""
        return {
            "general": {
                "welcome": "Bem-vindo ao AuraCore! Como posso ajudar?",
                "goodbye": "Até logo! Tenha um ótimo dia.",
                "error_generic": "Ocorreu um erro inesperado. Tente novamente.",
                "not_found": "Recurso não encontrado.",
                "unauthorized": "Acesso não autorizado.",
                "forbidden": "Acesso negado.",
                "validation_error": "Erro de validação: {details}"
            },
            "agent": {
                "thinking": "Analisando sua solicitação...",
                "processing": "Processando...",
                "error": "Não foi possível processar sua solicitação.",
                "unknown_intent": "Não entendi sua solicitação. Pode reformular?",
                "clarification_needed": "Preciso de mais informações: {question}",
                "task_completed": "Tarefa concluída com sucesso!"
            },
            "fiscal": {
                "nfe_validated": "NFe validada com sucesso. Chave: {chave}",
                "nfe_invalid": "NFe inválida: {motivo}",
                "cte_validated": "CTe validado com sucesso. Chave: {chave}",
                "cte_invalid": "CTe inválido: {motivo}",
                "tax_calculated": "Impostos calculados: {total}",
                "icms_rate": "Alíquota ICMS de {uf_origem} para {uf_destino}: {rate}",
                "pis_cofins_rate": "PIS: {pis} | COFINS: {cofins}",
                "sped_generated": "SPED {tipo} gerado com sucesso.",
                "sped_error": "Erro na geração do SPED: {erro}"
            },
            "financial": {
                "payment_due": "Pagamento de {valor} vence em {data}",
                "payment_received": "Pagamento de {valor} recebido.",
                "invoice_created": "Fatura {numero} criada.",
                "balance_updated": "Saldo atualizado: {saldo}",
                "insufficient_funds": "Saldo insuficiente."
            },
            "tms": {
                "shipment_created": "Embarque {codigo} criado.",
                "shipment_dispatched": "Embarque {codigo} despachado.",
                "shipment_delivered": "Embarque {codigo} entregue.",
                "route_optimized": "Rota otimizada: {economia} de economia.",
                "driver_assigned": "Motorista {nome} atribuído ao embarque."
            },
            "voice": {
                "transcription_ready": "Transcrição pronta.",
                "synthesis_ready": "Áudio gerado.",
                "no_speech": "Nenhuma fala detectada no áudio.",
                "audio_too_short": "Áudio muito curto para processamento.",
                "processing_error": "Erro no processamento de voz."
            },
            "rag": {
                "no_results": "Não encontrei informações sobre isso na legislação.",
                "sources_found": "Encontrei {count} fontes relevantes.",
                "legislation_context": "Baseado na legislação vigente:"
            },
            "task": {
                "queued": "Tarefa enfileirada. ID: {task_id}",
                "running": "Tarefa em execução...",
                "completed": "Tarefa concluída.",
                "failed": "Tarefa falhou: {error}",
                "cancelled": "Tarefa cancelada."
            },
            "webhook": {
                "delivered": "Webhook entregue com sucesso.",
                "failed": "Falha na entrega do webhook.",
                "retry": "Tentando novamente... ({attempt}/{max})"
            },
            "document": {
                "imported": "Documento {tipo} importado com sucesso.",
                "processed": "Documento processado. Confiança: {confidence}%",
                "invalid": "Documento inválido: {motivo}",
                "ocr_failed": "Falha no reconhecimento do documento."
            }
        }
    
    @staticmethod
    def _get_en_translations() -> dict[str, Any]:
        """Traduções em inglês."""
        return {
            "general": {
                "welcome": "Welcome to AuraCore! How can I help?",
                "goodbye": "Goodbye! Have a great day.",
                "error_generic": "An unexpected error occurred. Please try again.",
                "not_found": "Resource not found.",
                "unauthorized": "Unauthorized access.",
                "forbidden": "Access denied.",
                "validation_error": "Validation error: {details}"
            },
            "agent": {
                "thinking": "Analyzing your request...",
                "processing": "Processing...",
                "error": "Could not process your request.",
                "unknown_intent": "I didn't understand your request. Can you rephrase?",
                "clarification_needed": "I need more information: {question}",
                "task_completed": "Task completed successfully!"
            },
            "fiscal": {
                "nfe_validated": "NFe validated successfully. Key: {chave}",
                "nfe_invalid": "Invalid NFe: {motivo}",
                "cte_validated": "CTe validated successfully. Key: {chave}",
                "cte_invalid": "Invalid CTe: {motivo}",
                "tax_calculated": "Taxes calculated: {total}",
                "icms_rate": "ICMS rate from {uf_origem} to {uf_destino}: {rate}",
                "pis_cofins_rate": "PIS: {pis} | COFINS: {cofins}",
                "sped_generated": "SPED {tipo} generated successfully.",
                "sped_error": "SPED generation error: {erro}"
            },
            "financial": {
                "payment_due": "Payment of {valor} due on {data}",
                "payment_received": "Payment of {valor} received.",
                "invoice_created": "Invoice {numero} created.",
                "balance_updated": "Balance updated: {saldo}",
                "insufficient_funds": "Insufficient funds."
            },
            "tms": {
                "shipment_created": "Shipment {codigo} created.",
                "shipment_dispatched": "Shipment {codigo} dispatched.",
                "shipment_delivered": "Shipment {codigo} delivered.",
                "route_optimized": "Route optimized: {economia} savings.",
                "driver_assigned": "Driver {nome} assigned to shipment."
            },
            "voice": {
                "transcription_ready": "Transcription ready.",
                "synthesis_ready": "Audio generated.",
                "no_speech": "No speech detected in audio.",
                "audio_too_short": "Audio too short for processing.",
                "processing_error": "Voice processing error."
            },
            "rag": {
                "no_results": "I couldn't find information about this in the legislation.",
                "sources_found": "Found {count} relevant sources.",
                "legislation_context": "Based on current legislation:"
            },
            "task": {
                "queued": "Task queued. ID: {task_id}",
                "running": "Task running...",
                "completed": "Task completed.",
                "failed": "Task failed: {error}",
                "cancelled": "Task cancelled."
            },
            "webhook": {
                "delivered": "Webhook delivered successfully.",
                "failed": "Webhook delivery failed.",
                "retry": "Retrying... ({attempt}/{max})"
            },
            "document": {
                "imported": "Document {tipo} imported successfully.",
                "processed": "Document processed. Confidence: {confidence}%",
                "invalid": "Invalid document: {motivo}",
                "ocr_failed": "Document recognition failed."
            }
        }
    
    @staticmethod
    def _get_es_translations() -> dict[str, Any]:
        """Traduções em espanhol."""
        return {
            "general": {
                "welcome": "¡Bienvenido a AuraCore! ¿Cómo puedo ayudar?",
                "goodbye": "¡Hasta luego! Que tengas un excelente día.",
                "error_generic": "Ocurrió un error inesperado. Intente de nuevo.",
                "not_found": "Recurso no encontrado.",
                "unauthorized": "Acceso no autorizado.",
                "forbidden": "Acceso denegado.",
                "validation_error": "Error de validación: {details}"
            },
            "agent": {
                "thinking": "Analizando su solicitud...",
                "processing": "Procesando...",
                "error": "No fue posible procesar su solicitud.",
                "unknown_intent": "No entendí su solicitud. ¿Puede reformular?",
                "clarification_needed": "Necesito más información: {question}",
                "task_completed": "¡Tarea completada con éxito!"
            },
            "fiscal": {
                "nfe_validated": "NFe validada con éxito. Clave: {chave}",
                "nfe_invalid": "NFe inválida: {motivo}",
                "cte_validated": "CTe validado con éxito. Clave: {chave}",
                "cte_invalid": "CTe inválido: {motivo}",
                "tax_calculated": "Impuestos calculados: {total}",
                "icms_rate": "Alícuota ICMS de {uf_origem} para {uf_destino}: {rate}",
                "pis_cofins_rate": "PIS: {pis} | COFINS: {cofins}",
                "sped_generated": "SPED {tipo} generado con éxito.",
                "sped_error": "Error en la generación del SPED: {erro}"
            },
            "financial": {
                "payment_due": "Pago de {valor} vence en {data}",
                "payment_received": "Pago de {valor} recibido.",
                "invoice_created": "Factura {numero} creada.",
                "balance_updated": "Saldo actualizado: {saldo}",
                "insufficient_funds": "Saldo insuficiente."
            },
            "tms": {
                "shipment_created": "Embarque {codigo} creado.",
                "shipment_dispatched": "Embarque {codigo} despachado.",
                "shipment_delivered": "Embarque {codigo} entregado.",
                "route_optimized": "Ruta optimizada: {economia} de ahorro.",
                "driver_assigned": "Conductor {nome} asignado al embarque."
            },
            "voice": {
                "transcription_ready": "Transcripción lista.",
                "synthesis_ready": "Audio generado.",
                "no_speech": "No se detectó habla en el audio.",
                "audio_too_short": "Audio muy corto para procesamiento.",
                "processing_error": "Error en el procesamiento de voz."
            },
            "rag": {
                "no_results": "No encontré información sobre esto en la legislación.",
                "sources_found": "Encontré {count} fuentes relevantes.",
                "legislation_context": "Basado en la legislación vigente:"
            },
            "task": {
                "queued": "Tarea encolada. ID: {task_id}",
                "running": "Tarea en ejecución...",
                "completed": "Tarea completada.",
                "failed": "Tarea falló: {error}",
                "cancelled": "Tarea cancelada."
            },
            "webhook": {
                "delivered": "Webhook entregado con éxito.",
                "failed": "Falla en la entrega del webhook.",
                "retry": "Intentando de nuevo... ({attempt}/{max})"
            },
            "document": {
                "imported": "Documento {tipo} importado con éxito.",
                "processed": "Documento procesado. Confianza: {confidence}%",
                "invalid": "Documento inválido: {motivo}",
                "ocr_failed": "Falla en el reconocimiento del documento."
            }
        }


# Singleton
_translator: Optional[Translator] = None


def get_translator() -> Translator:
    """Retorna instância singleton do translator."""
    global _translator
    if _translator is None:
        _translator = Translator()
    return _translator
