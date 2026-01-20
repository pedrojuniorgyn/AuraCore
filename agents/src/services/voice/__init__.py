"""
Serviço de voz com Google Cloud Speech.

Fornece:
- SpeechToTextService: Transcrição de áudio para texto (pt-BR)
- TextToSpeechService: Síntese de texto para áudio (vozes Wavenet BR)
- VoiceProcessor: Processador end-to-end (STT → Agent → TTS)

@module services/voice
"""

from .speech_to_text import SpeechToTextService, get_stt_service, TranscriptionResult
from .text_to_speech import TextToSpeechService, get_tts_service, SynthesisResult
from .voice_processor import VoiceProcessor, get_voice_processor, VoiceResult, VoiceContext

__all__ = [
    # Speech-to-Text
    "SpeechToTextService",
    "get_stt_service",
    "TranscriptionResult",
    # Text-to-Speech
    "TextToSpeechService",
    "get_tts_service",
    "SynthesisResult",
    # Voice Processor
    "VoiceProcessor",
    "get_voice_processor",
    "VoiceResult",
    "VoiceContext",
]
