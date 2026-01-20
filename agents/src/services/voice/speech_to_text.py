"""
Speech-to-Text usando Google Cloud Speech API.

Transcreve áudio para texto com suporte a:
- Português brasileiro (pt-BR)
- Contexto fiscal/logístico (termos específicos)
- Múltiplos formatos de áudio (WEBM_OPUS, LINEAR16, FLAC)

@module services/voice/speech_to_text
"""

from typing import Optional, List
from dataclasses import dataclass, field

from src.core.observability import get_logger

logger = get_logger(__name__)

# Importação condicional do Google Cloud Speech
try:
    from google.cloud import speech_v1 as speech
    SPEECH_AVAILABLE = True
except ImportError:
    SPEECH_AVAILABLE = False
    speech = None  # type: ignore
    logger.warning("google_cloud_speech_not_installed")


@dataclass
class TranscriptionResult:
    """Resultado da transcrição de áudio."""

    text: str
    confidence: float
    is_final: bool
    language: str = "pt-BR"
    alternatives: List[str] = field(default_factory=list)
    duration_seconds: float = 0.0


@dataclass
class SpeechConfig:
    """Configuração do reconhecimento de fala."""

    language_code: str = "pt-BR"
    sample_rate_hertz: int = 16000
    encoding: str = "LINEAR16"
    enable_automatic_punctuation: bool = True
    model: str = "latest_long"
    # Contexto fiscal/logístico para melhorar reconhecimento
    speech_contexts: Optional[List[str]] = None

    def __post_init__(self) -> None:
        """Inicializa contexto padrão se não fornecido."""
        if self.speech_contexts is None:
            self.speech_contexts = [
                # Documentos fiscais
                "NFe", "CTe", "DANFe", "DACTe", "MDFe", "NFSe",
                # Impostos
                "ICMS", "PIS", "COFINS", "ISS", "IPI", "IRPJ", "CSLL",
                # Logística
                "frete", "entrega", "romaneio", "coleta", "rastreio",
                "motorista", "veículo", "rota", "carga",
                # Financeiro
                "contas a pagar", "contas a receber", "fluxo de caixa",
                "boleto", "nota fiscal", "pagamento", "recebimento",
                # Estratégico
                "BSC", "PDCA", "KPI", "war room", "meta", "indicador",
                # Sistema
                "AuraCore", "dashboard", "relatório",
            ]


class SpeechToTextService:
    """
    Serviço de transcrição de áudio para texto.

    Usa Google Cloud Speech-to-Text API para transcrever áudio
    com suporte otimizado para português brasileiro e termos
    fiscais/logísticos.
    """

    def __init__(self, config: Optional[SpeechConfig] = None) -> None:
        """
        Inicializa o serviço de transcrição.

        Args:
            config: Configuração do reconhecimento (opcional)
        """
        self.config = config or SpeechConfig()
        self._client: Optional[object] = None
        logger.info("stt_service_initialized", available=SPEECH_AVAILABLE)

    def _get_client(self) -> object:
        """Obtém cliente Google Cloud Speech (lazy loading)."""
        if not SPEECH_AVAILABLE:
            raise RuntimeError(
                "Google Cloud Speech não instalado. "
                "Execute: pip install google-cloud-speech"
            )
        if self._client is None:
            self._client = speech.SpeechClient()
        return self._client

    async def transcribe_bytes(
        self,
        audio_content: bytes,
        encoding: str = "WEBM_OPUS",
        sample_rate: Optional[int] = None,
    ) -> TranscriptionResult:
        """
        Transcreve áudio de bytes.

        Args:
            audio_content: Conteúdo do áudio em bytes
            encoding: Formato do áudio (WEBM_OPUS, LINEAR16, FLAC, etc)
            sample_rate: Taxa de amostragem (Hz). Se None, usa default por encoding

        Returns:
            TranscriptionResult com texto transcrito e confiança
        """
        if not SPEECH_AVAILABLE:
            logger.warning("stt_not_available")
            return TranscriptionResult(
                text="",
                confidence=0.0,
                is_final=True,
            )

        if not audio_content:
            return TranscriptionResult(
                text="",
                confidence=0.0,
                is_final=True,
            )

        try:
            client = self._get_client()

            # Determinar sample rate por encoding
            if sample_rate is None:
                sample_rate = self._get_default_sample_rate(encoding)

            # Configurar reconhecimento
            config = speech.RecognitionConfig(
                encoding=getattr(speech.RecognitionConfig.AudioEncoding, encoding),
                sample_rate_hertz=sample_rate,
                language_code=self.config.language_code,
                enable_automatic_punctuation=self.config.enable_automatic_punctuation,
                model=self.config.model,
                speech_contexts=[
                    speech.SpeechContext(phrases=self.config.speech_contexts or [])
                ],
            )

            audio = speech.RecognitionAudio(content=audio_content)

            # Executar reconhecimento
            response = client.recognize(config=config, audio=audio)

            if not response.results:
                logger.debug("stt_no_results")
                return TranscriptionResult(
                    text="",
                    confidence=0.0,
                    is_final=True,
                )

            # Extrair melhor resultado
            best_result = response.results[0]
            best_alternative = best_result.alternatives[0]

            # Coletar alternativas
            alternatives = [
                alt.transcript
                for alt in best_result.alternatives[1:4]  # Máx 3 alternativas
            ]

            logger.info(
                "stt_success",
                text_length=len(best_alternative.transcript),
                confidence=best_alternative.confidence,
            )

            return TranscriptionResult(
                text=best_alternative.transcript,
                confidence=best_alternative.confidence,
                is_final=best_result.is_final if hasattr(best_result, "is_final") else True,
                alternatives=alternatives,
            )

        except Exception as e:
            logger.error("stt_error", error=str(e), error_type=type(e).__name__)
            return TranscriptionResult(
                text="",
                confidence=0.0,
                is_final=True,
            )

    def _get_default_sample_rate(self, encoding: str) -> int:
        """Retorna sample rate padrão por tipo de encoding."""
        rates = {
            "WEBM_OPUS": 48000,
            "OGG_OPUS": 48000,
            "LINEAR16": 16000,
            "FLAC": 16000,
            "MULAW": 8000,
            "AMR": 8000,
            "AMR_WB": 16000,
            "MP3": 16000,
        }
        return rates.get(encoding, 16000)


# Singleton
_stt_service: Optional[SpeechToTextService] = None


def get_stt_service() -> SpeechToTextService:
    """
    Retorna instância singleton do serviço STT.

    Returns:
        SpeechToTextService configurado
    """
    global _stt_service
    if _stt_service is None:
        _stt_service = SpeechToTextService()
    return _stt_service
