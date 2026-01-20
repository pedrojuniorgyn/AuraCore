"""
API endpoints para processamento de voz.

Endpoints:
- POST /api/voice/transcribe - Speech-to-Text
- POST /api/voice/synthesize - Text-to-Speech
- POST /api/voice/process - Pipeline completo (STT → Agent → TTS)
- GET /api/voice/voices - Lista vozes disponíveis
- GET /api/voice/health - Health check

@module api/voice
"""

import base64
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field
import structlog

from src.services.voice import (
    get_stt_service,
    get_tts_service,
    get_voice_processor,
    VoiceContext,
)
from src.services.voice.speech_to_text import SPEECH_AVAILABLE
from src.services.voice.text_to_speech import TTS_AVAILABLE

logger = structlog.get_logger()

router = APIRouter()


# ===== SCHEMAS =====


class TranscribeRequest(BaseModel):
    """Request para transcrição de áudio."""

    audio_base64: str = Field(..., description="Áudio em base64")
    encoding: str = Field(default="WEBM_OPUS", description="Formato do áudio")
    language: str = Field(default="pt-BR", description="Idioma")


class TranscribeResponse(BaseModel):
    """Response da transcrição."""

    success: bool
    text: str
    confidence: float
    error: Optional[str] = None


class SynthesizeRequest(BaseModel):
    """Request para síntese de voz."""

    text: str = Field(..., description="Texto para sintetizar", max_length=5000)
    voice_name: Optional[str] = Field(None, description="Nome da voz")
    speaking_rate: Optional[float] = Field(None, ge=0.25, le=4.0, description="Velocidade")
    pitch: Optional[float] = Field(None, ge=-20.0, le=20.0, description="Tom")


class SynthesizeResponse(BaseModel):
    """Response da síntese."""

    success: bool
    audio_base64: Optional[str] = None
    audio_format: str = "mp3"
    error: Optional[str] = None


class VoiceContextRequest(BaseModel):
    """Contexto do usuário para voice."""

    user_id: str
    org_id: int
    branch_id: int
    session_id: str


class VoiceProcessRequest(BaseModel):
    """Request para processamento completo de voz."""

    audio_base64: str = Field(..., description="Áudio em base64")
    encoding: str = Field(default="WEBM_OPUS", description="Formato do áudio")
    context: VoiceContextRequest
    respond_with_audio: bool = Field(default=True, description="Retornar áudio")


class VoiceProcessResponse(BaseModel):
    """Response do processamento de voz."""

    success: bool
    transcribed_text: str
    transcription_confidence: float
    agent_response: str
    agent_used: Optional[str] = None
    audio_response: Optional[str] = None  # Base64
    audio_format: str = "mp3"
    error: Optional[str] = None


class VoiceInfo(BaseModel):
    """Informações sobre uma voz."""

    id: str
    name: str
    gender: str
    type: str = "wavenet"


class VoicesListResponse(BaseModel):
    """Lista de vozes disponíveis."""

    voices: list[VoiceInfo]
    default: str


class VoiceHealthResponse(BaseModel):
    """Health check do serviço de voz."""

    status: str
    speech_to_text: bool
    text_to_speech: bool
    message: str


# ===== ENDPOINTS =====


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(request: TranscribeRequest) -> TranscribeResponse:
    """
    Transcreve áudio para texto (Speech-to-Text).

    Args:
        request: Áudio em base64 e configurações

    Returns:
        Texto transcrito com confidence score
    """
    logger.info("voice_transcribe_request", encoding=request.encoding)

    try:
        # Decodificar base64
        audio_bytes = base64.b64decode(request.audio_base64)

        # Transcrever
        stt = get_stt_service()
        result = await stt.transcribe_bytes(audio_bytes, request.encoding)

        return TranscribeResponse(
            success=True,
            text=result.text,
            confidence=result.confidence,
        )

    except Exception as e:
        logger.error("voice_transcribe_error", error=str(e))
        return TranscribeResponse(
            success=False,
            text="",
            confidence=0.0,
            error=str(e),
        )


@router.post("/synthesize", response_model=SynthesizeResponse)
async def synthesize_speech(request: SynthesizeRequest) -> SynthesizeResponse:
    """
    Sintetiza texto em áudio (Text-to-Speech).

    Args:
        request: Texto e configurações de voz

    Returns:
        Áudio em base64
    """
    logger.info("voice_synthesize_request", text_length=len(request.text))

    try:
        tts = get_tts_service()
        result = await tts.synthesize(
            text=request.text,
            voice_name=request.voice_name,
            speaking_rate=request.speaking_rate,
            pitch=request.pitch,
        )

        if not result.success:
            return SynthesizeResponse(
                success=False,
                error=result.error,
            )

        # Codificar em base64
        audio_b64 = ""
        if result.audio_content:
            audio_b64 = base64.b64encode(result.audio_content).decode("utf-8")

        return SynthesizeResponse(
            success=True,
            audio_base64=audio_b64,
            audio_format=result.audio_format,
        )

    except Exception as e:
        logger.error("voice_synthesize_error", error=str(e))
        return SynthesizeResponse(
            success=False,
            error=str(e),
        )


@router.post("/process", response_model=VoiceProcessResponse)
async def process_voice(request: VoiceProcessRequest) -> VoiceProcessResponse:
    """
    Processa voz completo: STT → Agent → TTS.

    Pipeline:
    1. Transcreve o áudio (STT)
    2. Envia texto para o agente apropriado
    3. Sintetiza resposta em áudio (TTS)

    Args:
        request: Áudio, contexto e configurações

    Returns:
        Transcrição, resposta do agente e áudio
    """
    logger.info(
        "voice_process_request",
        user_id=request.context.user_id,
        org_id=request.context.org_id,
        encoding=request.encoding,
    )

    try:
        # Decodificar base64
        audio_bytes = base64.b64decode(request.audio_base64)

        # Criar contexto
        context = VoiceContext(
            user_id=request.context.user_id,
            org_id=request.context.org_id,
            branch_id=request.context.branch_id,
            session_id=request.context.session_id,
        )

        # Processar
        processor = get_voice_processor()
        result = await processor.process(
            audio_content=audio_bytes,
            context=context,
            encoding=request.encoding,
            respond_with_audio=request.respond_with_audio,
        )

        return VoiceProcessResponse(
            success=result.success,
            transcribed_text=result.transcribed_text,
            transcription_confidence=result.transcription_confidence,
            agent_response=result.agent_response,
            agent_used=result.agent_used,
            audio_response=result.audio_response_base64,
            audio_format=result.audio_format,
            error=result.error,
        )

    except Exception as e:
        logger.error("voice_process_error", error=str(e))
        return VoiceProcessResponse(
            success=False,
            transcribed_text="",
            transcription_confidence=0.0,
            agent_response="",
            error=str(e),
        )


@router.get("/voices", response_model=VoicesListResponse)
async def list_voices() -> VoicesListResponse:
    """Lista vozes disponíveis para TTS."""
    return VoicesListResponse(
        voices=[
            VoiceInfo(id="female_wavenet", name="pt-BR-Wavenet-B", gender="female", type="wavenet"),
            VoiceInfo(id="male_wavenet", name="pt-BR-Wavenet-C", gender="male", type="wavenet"),
            VoiceInfo(id="female_neural", name="pt-BR-Neural2-A", gender="female", type="neural"),
            VoiceInfo(id="male_neural", name="pt-BR-Neural2-B", gender="male", type="neural"),
            VoiceInfo(id="female_standard", name="pt-BR-Standard-A", gender="female", type="standard"),
            VoiceInfo(id="male_standard", name="pt-BR-Standard-B", gender="male", type="standard"),
        ],
        default="pt-BR-Wavenet-B",
    )


@router.get("/health", response_model=VoiceHealthResponse)
async def voice_health() -> VoiceHealthResponse:
    """Health check do serviço de voz."""
    all_available = SPEECH_AVAILABLE and TTS_AVAILABLE

    return VoiceHealthResponse(
        status="ok" if all_available else "degraded",
        speech_to_text=SPEECH_AVAILABLE,
        text_to_speech=TTS_AVAILABLE,
        message=(
            "Voice service operational"
            if all_available
            else "Some voice services unavailable - check Google Cloud credentials"
        ),
    )
