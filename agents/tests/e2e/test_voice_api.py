# agents/tests/e2e/test_voice_api.py
"""
Testes E2E para API de Voice.
"""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from typing import Dict, Any


class TestVoiceAPI:
    """Testes da API de Voice."""
    
    @pytest.mark.asyncio
    async def test_transcribe_success(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any,
        sample_audio_base64: str,
        transcription_result: Dict[str, Any]
    ) -> None:
        """Deve transcrever áudio."""
        with patch("src.services.voice.get_voice_service") as mock_svc:
            mock_service = AsyncMock()
            mock_service.transcribe.return_value = transcription_result
            mock_svc.return_value = mock_service
            
            response = await client.post(
                "/v1/voice/transcribe",
                headers=api_key_header,
                json={
                    "audio": sample_audio_base64,
                    "language": "pt-BR"
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        assert data["confidence"] >= 0.9
    
    @pytest.mark.asyncio
    async def test_synthesize_success(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any,
        synthesis_result: Dict[str, Any]
    ) -> None:
        """Deve sintetizar texto para áudio."""
        with patch("src.services.voice.get_voice_service") as mock_svc:
            mock_service = AsyncMock()
            mock_service.synthesize.return_value = synthesis_result
            mock_svc.return_value = mock_service
            
            response = await client.post(
                "/v1/voice/synthesize",
                headers=api_key_header,
                json={
                    "text": "Olá, mundo!",
                    "voice": "default",
                    "language": "pt-BR"
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        assert "audio" in data
        assert data["format"] == "mp3"
    
    @pytest.mark.asyncio
    async def test_transcribe_empty_audio(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any
    ) -> None:
        """Deve validar áudio vazio."""
        response = await client.post(
            "/v1/voice/transcribe",
            headers=api_key_header,
            json={
                "audio": "",
                "language": "pt-BR"
            }
        )
        
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_synthesize_empty_text(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any
    ) -> None:
        """Deve validar texto vazio."""
        response = await client.post(
            "/v1/voice/synthesize",
            headers=api_key_header,
            json={
                "text": "",
                "voice": "default"
            }
        )
        
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_transcribe_without_auth(
        self,
        client: AsyncClient,
        sample_audio_base64: str
    ) -> None:
        """Deve retornar 401 sem autenticação."""
        response = await client.post(
            "/v1/voice/transcribe",
            json={
                "audio": sample_audio_base64,
                "language": "pt-BR"
            }
        )
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_transcribe_with_segments(
        self,
        client: AsyncClient,
        api_key_header: Dict[str, str],
        mock_auth_middleware: Any,
        sample_audio_base64: str,
        transcription_result: Dict[str, Any]
    ) -> None:
        """Deve retornar segmentos de transcrição."""
        with patch("src.services.voice.get_voice_service") as mock_svc:
            mock_service = AsyncMock()
            mock_service.transcribe.return_value = transcription_result
            mock_svc.return_value = mock_service
            
            response = await client.post(
                "/v1/voice/transcribe",
                headers=api_key_header,
                json={
                    "audio": sample_audio_base64,
                    "language": "pt-BR"
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        assert "segments" in data
        assert len(data["segments"]) > 0
