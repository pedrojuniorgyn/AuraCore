"""
Text-to-Speech usando Google Cloud TTS API.

Sintetiza texto em áudio de alta qualidade com:
- Vozes Wavenet e Neural2 para português brasileiro
- Controle de velocidade e tom
- Limite de 5000 caracteres por requisição

@module services/voice/text_to_speech
"""

from typing import Optional
from dataclasses import dataclass
from enum import Enum

from src.core.observability import get_logger

logger = get_logger(__name__)

# Importação condicional do Google Cloud TTS
try:
    from google.cloud import texttospeech_v1 as tts
    TTS_AVAILABLE = True
except ImportError:
    TTS_AVAILABLE = False
    tts = None  # type: ignore
    logger.warning("google_cloud_tts_not_installed")


class VoiceGender(Enum):
    """Gênero da voz."""

    MALE = "MALE"
    FEMALE = "FEMALE"
    NEUTRAL = "NEUTRAL"


class VoiceType(Enum):
    """Tipo de voz disponível."""

    FEMALE_WAVENET = "pt-BR-Wavenet-B"
    MALE_WAVENET = "pt-BR-Wavenet-C"
    FEMALE_NEURAL = "pt-BR-Neural2-A"
    MALE_NEURAL = "pt-BR-Neural2-B"
    FEMALE_STANDARD = "pt-BR-Standard-A"
    MALE_STANDARD = "pt-BR-Standard-B"


@dataclass
class TTSConfig:
    """Configuração do Text-to-Speech."""

    language_code: str = "pt-BR"
    voice_name: str = "pt-BR-Wavenet-B"  # Voz feminina Wavenet (qualidade alta)
    speaking_rate: float = 1.0  # 0.25 a 4.0 (1.0 = normal)
    pitch: float = 0.0  # -20.0 a 20.0 (0.0 = normal)
    volume_gain_db: float = 0.0  # -96.0 a 16.0


@dataclass
class SynthesisResult:
    """Resultado da síntese de voz."""

    success: bool
    audio_content: Optional[bytes] = None
    audio_format: str = "mp3"
    duration_estimate_seconds: float = 0.0
    error: Optional[str] = None


class TextToSpeechService:
    """
    Serviço de síntese de texto para áudio.

    Usa Google Cloud Text-to-Speech API para converter texto
    em áudio de alta qualidade com vozes brasileiras.
    """

    # Vozes disponíveis para pt-BR
    VOICES = {
        "female_wavenet": "pt-BR-Wavenet-B",
        "male_wavenet": "pt-BR-Wavenet-C",
        "female_neural": "pt-BR-Neural2-A",
        "male_neural": "pt-BR-Neural2-B",
        "female_standard": "pt-BR-Standard-A",
        "male_standard": "pt-BR-Standard-B",
    }

    # Limite da API
    MAX_CHARACTERS = 5000

    def __init__(self, config: Optional[TTSConfig] = None) -> None:
        """
        Inicializa o serviço de síntese.

        Args:
            config: Configuração do TTS (opcional)
        """
        self.config = config or TTSConfig()
        self._client: Optional[object] = None
        logger.info("tts_service_initialized", available=TTS_AVAILABLE)

    def _get_client(self) -> object:
        """Obtém cliente Google Cloud TTS (lazy loading)."""
        if not TTS_AVAILABLE:
            raise RuntimeError(
                "Google Cloud TTS não instalado. "
                "Execute: pip install google-cloud-texttospeech"
            )
        if self._client is None:
            self._client = tts.TextToSpeechClient()
        return self._client

    async def synthesize(
        self,
        text: str,
        voice_name: Optional[str] = None,
        speaking_rate: Optional[float] = None,
        pitch: Optional[float] = None,
    ) -> SynthesisResult:
        """
        Sintetiza texto em áudio MP3.

        Args:
            text: Texto a ser sintetizado
            voice_name: Nome da voz (opcional, usa config.voice_name)
            speaking_rate: Velocidade da fala (opcional)
            pitch: Tom da voz (opcional)

        Returns:
            SynthesisResult com áudio em bytes (MP3)
        """
        if not TTS_AVAILABLE:
            logger.warning("tts_not_available")
            return SynthesisResult(
                success=False,
                error="Google Cloud TTS não disponível",
            )

        # Validar texto
        if not text or not text.strip():
            return SynthesisResult(
                success=False,
                error="Texto vazio",
            )

        # Truncar se exceder limite
        if len(text) > self.MAX_CHARACTERS:
            logger.warning(
                "tts_text_truncated",
                original_length=len(text),
                max_length=self.MAX_CHARACTERS,
            )
            text = text[: self.MAX_CHARACTERS - 3] + "..."

        try:
            client = self._get_client()

            # Input de síntese
            synthesis_input = tts.SynthesisInput(text=text)

            # Seleção de voz
            voice = tts.VoiceSelectionParams(
                language_code=self.config.language_code,
                name=voice_name or self.config.voice_name,
            )

            # Configuração de áudio
            audio_config = tts.AudioConfig(
                audio_encoding=tts.AudioEncoding.MP3,
                speaking_rate=speaking_rate or self.config.speaking_rate,
                pitch=pitch or self.config.pitch,
                volume_gain_db=self.config.volume_gain_db,
            )

            # Sintetizar
            response = client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config,
            )

            # Estimar duração (aprox 150 palavras/minuto)
            word_count = len(text.split())
            duration_estimate = (word_count / 150) * 60  # segundos

            logger.info(
                "tts_success",
                text_length=len(text),
                audio_size=len(response.audio_content),
                voice=voice_name or self.config.voice_name,
            )

            return SynthesisResult(
                success=True,
                audio_content=response.audio_content,
                audio_format="mp3",
                duration_estimate_seconds=duration_estimate,
            )

        except Exception as e:
            logger.error("tts_error", error=str(e), error_type=type(e).__name__)
            return SynthesisResult(
                success=False,
                error=str(e),
            )

    async def synthesize_ssml(
        self,
        ssml: str,
        voice_name: Optional[str] = None,
    ) -> SynthesisResult:
        """
        Sintetiza SSML em áudio.

        SSML permite controle fino sobre prosódia, pausas, ênfases, etc.

        Args:
            ssml: Texto SSML (Speech Synthesis Markup Language)
            voice_name: Nome da voz (opcional)

        Returns:
            SynthesisResult com áudio em bytes (MP3)
        """
        if not TTS_AVAILABLE:
            return SynthesisResult(
                success=False,
                error="Google Cloud TTS não disponível",
            )

        if not ssml or not ssml.strip():
            return SynthesisResult(
                success=False,
                error="SSML vazio",
            )

        try:
            client = self._get_client()

            synthesis_input = tts.SynthesisInput(ssml=ssml)

            voice = tts.VoiceSelectionParams(
                language_code=self.config.language_code,
                name=voice_name or self.config.voice_name,
            )

            audio_config = tts.AudioConfig(
                audio_encoding=tts.AudioEncoding.MP3,
                speaking_rate=self.config.speaking_rate,
                pitch=self.config.pitch,
            )

            response = client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config,
            )

            return SynthesisResult(
                success=True,
                audio_content=response.audio_content,
                audio_format="mp3",
            )

        except Exception as e:
            logger.error("tts_ssml_error", error=str(e))
            return SynthesisResult(
                success=False,
                error=str(e),
            )

    def list_voices(self) -> dict[str, str]:
        """
        Lista vozes disponíveis para pt-BR.

        Returns:
            Dicionário {nome_amigável: voice_name}
        """
        return self.VOICES.copy()


# Singleton
_tts_service: Optional[TextToSpeechService] = None


def get_tts_service() -> TextToSpeechService:
    """
    Retorna instância singleton do serviço TTS.

    Returns:
        TextToSpeechService configurado
    """
    global _tts_service
    if _tts_service is None:
        _tts_service = TextToSpeechService()
    return _tts_service
