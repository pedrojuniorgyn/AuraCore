# agents/sdk/python/auracore/resources/voice.py
"""
Resource de Voice.
"""

import base64
from typing import Union, TYPE_CHECKING
from pathlib import Path
from ..types import VoiceTranscription, VoiceSynthesis
from ..exceptions import raise_for_status

if TYPE_CHECKING:
    from ..client import AuraCore


class VoiceResource:
    """
    Resource para operações de voz.
    
    Uso:
        # Transcrição
        result = await client.voice.transcribe("audio.wav")
        print(result.text)
        
        # Síntese
        result = await client.voice.synthesize("Olá, mundo!")
        with open("output.mp3", "wb") as f:
            f.write(base64.b64decode(result.audio_base64))
    """
    
    def __init__(self, client: "AuraCore"):
        self._client = client
    
    async def transcribe(
        self,
        audio: Union[str, Path, bytes],
        language: str = "pt-BR"
    ) -> VoiceTranscription:
        """
        Transcreve áudio para texto.
        
        Args:
            audio: Caminho do arquivo, Path, ou bytes do áudio
            language: Código do idioma (default: pt-BR)
        
        Returns:
            VoiceTranscription com o texto
        """
        # Preparar áudio
        if isinstance(audio, (str, Path)):
            with open(audio, "rb") as f:
                audio_bytes = f.read()
        else:
            audio_bytes = audio
        
        audio_b64 = base64.b64encode(audio_bytes).decode()
        
        response = await self._client.async_client.post(
            "/v1/voice/transcribe",
            json={
                "audio": audio_b64,
                "language": language
            }
        )
        
        raise_for_status(response)
        data = response.json()
        
        return VoiceTranscription(
            text=data["text"],
            language=data.get("language", language),
            confidence=data.get("confidence", 1.0),
            duration_seconds=data.get("duration_seconds", 0),
            segments=data.get("segments", [])
        )
    
    def transcribe_sync(
        self,
        audio: Union[str, Path, bytes],
        language: str = "pt-BR"
    ) -> VoiceTranscription:
        """Versão síncrona de transcribe()."""
        if isinstance(audio, (str, Path)):
            with open(audio, "rb") as f:
                audio_bytes = f.read()
        else:
            audio_bytes = audio
        
        audio_b64 = base64.b64encode(audio_bytes).decode()
        
        response = self._client.sync_client.post(
            "/v1/voice/transcribe",
            json={
                "audio": audio_b64,
                "language": language
            }
        )
        
        raise_for_status(response)
        data = response.json()
        
        return VoiceTranscription(
            text=data["text"],
            language=data.get("language", language),
            confidence=data.get("confidence", 1.0),
            duration_seconds=data.get("duration_seconds", 0),
            segments=data.get("segments", [])
        )
    
    async def synthesize(
        self,
        text: str,
        voice: str = "default",
        language: str = "pt-BR",
        output_format: str = "mp3"
    ) -> VoiceSynthesis:
        """
        Sintetiza texto para áudio.
        
        Args:
            text: Texto a sintetizar
            voice: Voz a usar (default, male, female)
            language: Código do idioma
            output_format: Formato de saída (mp3, wav)
        
        Returns:
            VoiceSynthesis com áudio em base64
        """
        response = await self._client.async_client.post(
            "/v1/voice/synthesize",
            json={
                "text": text,
                "voice": voice,
                "language": language,
                "format": output_format
            }
        )
        
        raise_for_status(response)
        data = response.json()
        
        return VoiceSynthesis(
            audio_base64=data["audio"],
            format=data.get("format", output_format),
            duration_seconds=data.get("duration_seconds", 0),
            sample_rate=data.get("sample_rate", 24000)
        )
    
    def synthesize_sync(
        self,
        text: str,
        voice: str = "default",
        language: str = "pt-BR",
        output_format: str = "mp3"
    ) -> VoiceSynthesis:
        """Versão síncrona de synthesize()."""
        response = self._client.sync_client.post(
            "/v1/voice/synthesize",
            json={
                "text": text,
                "voice": voice,
                "language": language,
                "format": output_format
            }
        )
        
        raise_for_status(response)
        data = response.json()
        
        return VoiceSynthesis(
            audio_base64=data["audio"],
            format=data.get("format", output_format),
            duration_seconds=data.get("duration_seconds", 0),
            sample_rate=data.get("sample_rate", 24000)
        )
