"""
Voice Processor: Pipeline completo STT → Agent → TTS.

Processa interações por voz de ponta a ponta:
1. Transcreve áudio do usuário (STT)
2. Envia texto para agente processar
3. Sintetiza resposta em áudio (TTS)

@module services/voice/voice_processor
"""

from typing import Optional, Any, Protocol
from dataclasses import dataclass
import base64

from src.core.observability import get_logger
from .speech_to_text import SpeechToTextService, get_stt_service, TranscriptionResult
from .text_to_speech import TextToSpeechService, get_tts_service, SynthesisResult

logger = get_logger(__name__)


class OrchestratorProtocol(Protocol):
    """Protocolo para orquestrador de agentes."""

    async def process_message(
        self,
        message: str,
        context: dict[str, Any],
    ) -> dict[str, Any]:
        """Processa mensagem e retorna resposta do agente."""
        ...


@dataclass
class VoiceContext:
    """Contexto da interação por voz."""

    user_id: str
    org_id: int
    branch_id: int
    session_id: str
    channel: str = "voice"


@dataclass
class VoiceResult:
    """Resultado completo da interação por voz."""

    success: bool
    # Transcrição
    transcribed_text: str
    transcription_confidence: float
    # Resposta do agente
    agent_response: str = ""
    agent_used: Optional[str] = None
    # Áudio de resposta
    audio_response: Optional[bytes] = None
    audio_response_base64: Optional[str] = None
    audio_format: str = "mp3"
    # Erro
    error: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        """Converte para dicionário (serialização API)."""
        return {
            "success": self.success,
            "transcribed_text": self.transcribed_text,
            "transcription_confidence": self.transcription_confidence,
            "agent_response": self.agent_response,
            "agent_used": self.agent_used,
            "audio_response": self.audio_response_base64,
            "audio_format": self.audio_format,
            "error": self.error,
        }


class VoiceProcessor:
    """
    Processador end-to-end de interações por voz.

    Combina STT, processamento de agente e TTS para fornecer
    uma experiência de voz completa.
    """

    def __init__(
        self,
        stt: Optional[SpeechToTextService] = None,
        tts: Optional[TextToSpeechService] = None,
    ) -> None:
        """
        Inicializa o processador de voz.

        Args:
            stt: Serviço de transcrição (opcional, usa singleton)
            tts: Serviço de síntese (opcional, usa singleton)
        """
        self.stt = stt or get_stt_service()
        self.tts = tts or get_tts_service()
        self._orchestrator: Optional[OrchestratorProtocol] = None
        logger.info("voice_processor_initialized")

    def set_orchestrator(self, orchestrator: OrchestratorProtocol) -> None:
        """
        Configura orquestrador de agentes.

        Args:
            orchestrator: Instância do orquestrador
        """
        self._orchestrator = orchestrator
        logger.info("voice_processor_orchestrator_set")

    async def process(
        self,
        audio_content: bytes,
        context: VoiceContext,
        encoding: str = "WEBM_OPUS",
        respond_with_audio: bool = True,
    ) -> VoiceResult:
        """
        Processa áudio completo: STT → Agent → TTS.

        Args:
            audio_content: Conteúdo do áudio em bytes
            context: Contexto da interação
            encoding: Formato do áudio de entrada
            respond_with_audio: Se deve gerar áudio de resposta

        Returns:
            VoiceResult com transcrição, resposta e áudio
        """
        logger.info(
            "voice_process_start",
            audio_size=len(audio_content),
            encoding=encoding,
            user_id=context.user_id,
        )

        # 1. Speech-to-Text
        transcription = await self.stt.transcribe_bytes(
            audio_content=audio_content,
            encoding=encoding,
        )

        if not transcription.text.strip():
            logger.warning("voice_empty_transcription")
            return VoiceResult(
                success=False,
                transcribed_text="",
                transcription_confidence=0.0,
                error="Não foi possível transcrever o áudio. Tente falar mais claramente.",
            )

        logger.info(
            "voice_transcription_complete",
            text_length=len(transcription.text),
            confidence=transcription.confidence,
        )

        # 2. Processar com Agente
        agent_response = ""
        agent_used = None

        if self._orchestrator:
            try:
                result = await self._orchestrator.process_message(
                    message=transcription.text,
                    context={
                        "user_id": context.user_id,
                        "org_id": context.org_id,
                        "branch_id": context.branch_id,
                        "session_id": context.session_id,
                        "channel": context.channel,
                    },
                )
                agent_response = result.get("response", "")
                agent_used = result.get("agent_used")
                logger.info(
                    "voice_agent_response",
                    agent=agent_used,
                    response_length=len(agent_response),
                )
            except Exception as e:
                logger.error("voice_agent_error", error=str(e))
                agent_response = "Desculpe, ocorreu um erro ao processar sua solicitação."
        else:
            # Sem orquestrador - modo echo para testes
            agent_response = f"Você disse: {transcription.text}"
            logger.debug("voice_no_orchestrator_echo_mode")

        # 3. Text-to-Speech (se solicitado)
        audio_response = None
        audio_response_base64 = None

        if respond_with_audio and agent_response:
            synthesis = await self.tts.synthesize(agent_response)
            if synthesis.success and synthesis.audio_content:
                audio_response = synthesis.audio_content
                audio_response_base64 = base64.b64encode(audio_response).decode("utf-8")
                logger.info(
                    "voice_tts_complete",
                    audio_size=len(audio_response),
                )
            else:
                logger.warning("voice_tts_failed", error=synthesis.error)

        return VoiceResult(
            success=True,
            transcribed_text=transcription.text,
            transcription_confidence=transcription.confidence,
            agent_response=agent_response,
            agent_used=agent_used,
            audio_response=audio_response,
            audio_response_base64=audio_response_base64,
            audio_format="mp3",
        )

    async def transcribe_only(
        self,
        audio_content: bytes,
        encoding: str = "WEBM_OPUS",
    ) -> TranscriptionResult:
        """
        Apenas transcreve áudio (sem agente/TTS).

        Args:
            audio_content: Conteúdo do áudio
            encoding: Formato do áudio

        Returns:
            TranscriptionResult
        """
        return await self.stt.transcribe_bytes(audio_content, encoding)

    async def synthesize_only(
        self,
        text: str,
        voice_name: Optional[str] = None,
    ) -> SynthesisResult:
        """
        Apenas sintetiza texto (sem transcrição/agente).

        Args:
            text: Texto a sintetizar
            voice_name: Nome da voz (opcional)

        Returns:
            SynthesisResult
        """
        return await self.tts.synthesize(text, voice_name)


# Singleton
_processor: Optional[VoiceProcessor] = None


def get_voice_processor() -> VoiceProcessor:
    """
    Retorna instância singleton do processador de voz.

    Returns:
        VoiceProcessor configurado
    """
    global _processor
    if _processor is None:
        _processor = VoiceProcessor()
    return _processor
