# agents/tests/services/test_voice_services.py
"""
Testes dos serviços de voz (STT, TTS, VoiceProcessor).
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from src.services.voice.speech_to_text import SpeechToTextService, SpeechConfig, SPEECH_AVAILABLE
from src.services.voice.text_to_speech import TextToSpeechService, TTSConfig, TTS_AVAILABLE
from src.services.voice.voice_processor import VoiceProcessor, VoiceContext


class TestSpeechToTextService:
    """Testes do serviço de Speech-to-Text."""
    
    @pytest.fixture
    def stt_service(self):
        """Cria serviço STT para testes."""
        return SpeechToTextService()
    
    @pytest.mark.unit
    def test_default_config_language(self, stt_service):
        """Verifica configuração padrão de idioma."""
        assert stt_service.config.language_code == "pt-BR"
    
    @pytest.mark.unit
    def test_default_config_punctuation(self, stt_service):
        """Verifica configuração padrão de pontuação."""
        assert stt_service.config.enable_automatic_punctuation is True
    
    @pytest.mark.unit
    def test_speech_contexts_include_fiscal_terms(self, stt_service):
        """Verifica que contexto inclui termos fiscais."""
        contexts = stt_service.config.speech_contexts
        
        # Deve incluir termos fiscais do AuraCore
        fiscal_terms = ["NFe", "CTe", "ICMS", "PIS", "COFINS"]
        for term in fiscal_terms:
            assert term in contexts, f"Termo '{term}' não está no contexto de fala"
    
    @pytest.mark.unit
    def test_service_available_flag(self, stt_service):
        """Verifica flag de disponibilidade."""
        # SPEECH_AVAILABLE depende se google-cloud-speech está instalado
        assert isinstance(SPEECH_AVAILABLE, bool)
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_transcribe_bytes_with_mock(
        self, 
        stt_service,
        mock_google_speech,
        sample_audio_bytes
    ):
        """Testa transcrição com mock do Google Speech."""
        with patch.object(stt_service, '_get_client', return_value=mock_google_speech):
            result = await stt_service.transcribe_bytes(
                sample_audio_bytes,
                encoding="LINEAR16"
            )
            
            assert result.text == "Texto transcrito de teste"
            assert result.confidence == 0.95
            assert result.is_final is True
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_transcribe_empty_audio_returns_empty(self, stt_service):
        """Testa que áudio vazio retorna resultado vazio."""
        with patch.object(stt_service, '_get_client') as mock_client:
            mock_client.return_value.recognize.return_value = MagicMock(results=[])
            
            result = await stt_service.transcribe_bytes(b"", encoding="LINEAR16")
            
            assert result.text == ""
            assert result.confidence == 0.0
    
    @pytest.mark.unit
    def test_speech_config_defaults(self):
        """Testa valores padrão de SpeechConfig."""
        config = SpeechConfig()
        
        assert config.language_code == "pt-BR"
        assert config.sample_rate_hertz == 16000
        assert config.enable_automatic_punctuation is True


class TestTextToSpeechService:
    """Testes do serviço de Text-to-Speech."""
    
    @pytest.fixture
    def tts_service(self):
        """Cria serviço TTS para testes."""
        return TextToSpeechService()
    
    @pytest.mark.unit
    def test_default_config_language(self, tts_service):
        """Verifica configuração padrão de idioma."""
        assert tts_service.config.language_code == "pt-BR"
    
    @pytest.mark.unit
    def test_default_voice_is_wavenet(self, tts_service):
        """Verifica que voz padrão é Wavenet."""
        assert "Wavenet" in tts_service.config.voice_name or "Neural" in tts_service.config.voice_name
    
    @pytest.mark.unit
    def test_available_voices(self, tts_service):
        """Verifica vozes disponíveis."""
        voices = tts_service.VOICES
        
        assert len(voices) > 0
        assert "female_wavenet" in voices or "male_wavenet" in voices
    
    @pytest.mark.unit
    def test_service_available_flag(self, tts_service):
        """Verifica flag de disponibilidade."""
        assert isinstance(TTS_AVAILABLE, bool)
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_synthesize_with_mock(self, tts_service, mock_google_tts):
        """Testa síntese com mock do Google TTS."""
        with patch.object(tts_service, '_get_client', return_value=mock_google_tts):
            result = await tts_service.synthesize("Texto de teste")
            
            assert result.success is True
            assert result.audio_content == b"fake-audio-content"
            assert result.audio_format == "mp3"
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_synthesize_empty_text_fails(self, tts_service):
        """Testa que texto vazio retorna erro."""
        result = await tts_service.synthesize("")
        
        assert result.success is False
        assert result.error is not None
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_synthesize_truncates_long_text(self, tts_service, mock_google_tts):
        """Testa que texto longo é truncado (limite 5000 chars)."""
        long_text = "A" * 6000
        
        with patch.object(tts_service, '_get_client', return_value=mock_google_tts):
            result = await tts_service.synthesize(long_text)
            
            # Deve funcionar (texto truncado internamente)
            assert result.success is True
    
    @pytest.mark.unit
    def test_tts_config_defaults(self):
        """Testa valores padrão de TTSConfig."""
        config = TTSConfig()
        
        assert config.language_code == "pt-BR"
        assert config.speaking_rate >= 0.5
        assert config.speaking_rate <= 2.0
        assert config.pitch >= -10
        assert config.pitch <= 10


class TestVoiceProcessor:
    """Testes do VoiceProcessor (pipeline completo)."""
    
    @pytest.fixture
    def processor(self):
        """Cria processador para testes."""
        return VoiceProcessor()
    
    @pytest.mark.unit
    def test_processor_has_stt_service(self, processor):
        """Verifica que processor tem serviço STT."""
        assert processor.stt is not None
        assert isinstance(processor.stt, SpeechToTextService)
    
    @pytest.mark.unit
    def test_processor_has_tts_service(self, processor):
        """Verifica que processor tem serviço TTS."""
        assert processor.tts is not None
        assert isinstance(processor.tts, TextToSpeechService)
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_process_returns_result(
        self,
        processor,
        voice_context,
        sample_audio_bytes,
        mock_google_speech,
        mock_google_tts
    ):
        """Testa que process retorna VoiceResult."""
        with patch.object(processor.stt, '_get_client', return_value=mock_google_speech):
            with patch.object(processor.tts, '_get_client', return_value=mock_google_tts):
                # Mock do orchestrator
                with patch.object(processor, '_orchestrator') as mock_orch:
                    mock_orch.route_message = AsyncMock(return_value={
                        "response": "Resposta do agente"
                    })
                    
                    result = await processor.process(
                        audio_content=sample_audio_bytes,
                        context=voice_context,
                        encoding="LINEAR16",
                        respond_with_audio=True
                    )
                    
                    assert result is not None
                    assert result.success is True
                    assert result.transcribed_text == "Texto transcrito de teste"
    
    @pytest.mark.unit
    def test_voice_context_fields(self, voice_context):
        """Testa campos do VoiceContext."""
        assert voice_context.user_id == "test-user"
        assert voice_context.org_id == 1
        assert voice_context.branch_id == 1
        assert voice_context.session_id == "test-session"
