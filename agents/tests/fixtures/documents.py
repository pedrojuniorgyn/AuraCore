# agents/tests/fixtures/documents.py
"""
Fixtures de documentos.
"""

import pytest
import base64
from datetime import datetime
from typing import Dict, Any


@pytest.fixture
def sample_pdf_content() -> bytes:
    """Conteúdo de PDF de teste (mínimo válido)."""
    # PDF mínimo válido
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n"
        b"xref\n0 4\n"
        b"0000000000 65535 f\n"
        b"0000000009 00000 n\n"
        b"0000000052 00000 n\n"
        b"0000000101 00000 n\n"
        b"trailer<</Size 4/Root 1 0 R>>\n"
        b"startxref\n178\n%%EOF"
    )
    return pdf_content


@pytest.fixture
def sample_pdf_base64(sample_pdf_content) -> str:
    """PDF em base64."""
    return base64.b64encode(sample_pdf_content).decode()


@pytest.fixture
def sample_audio_content() -> bytes:
    """Conteúdo de áudio de teste (WAV header mínimo)."""
    # WAV header mínimo
    wav_header = bytes([
        0x52, 0x49, 0x46, 0x46,  # "RIFF"
        0x24, 0x00, 0x00, 0x00,  # File size - 8
        0x57, 0x41, 0x56, 0x45,  # "WAVE"
        0x66, 0x6D, 0x74, 0x20,  # "fmt "
        0x10, 0x00, 0x00, 0x00,  # Chunk size (16)
        0x01, 0x00,              # Audio format (1 = PCM)
        0x01, 0x00,              # Num channels (1)
        0x44, 0xAC, 0x00, 0x00,  # Sample rate (44100)
        0x88, 0x58, 0x01, 0x00,  # Byte rate
        0x02, 0x00,              # Block align
        0x10, 0x00,              # Bits per sample (16)
        0x64, 0x61, 0x74, 0x61,  # "data"
        0x00, 0x00, 0x00, 0x00,  # Data size
    ])
    return wav_header


@pytest.fixture
def sample_audio_base64(sample_audio_content) -> str:
    """Áudio em base64."""
    return base64.b64encode(sample_audio_content).decode()


@pytest.fixture
def danfe_extracted_data() -> Dict[str, Any]:
    """Dados extraídos de DANFe de teste."""
    return {
        "chave_acesso": "35260112345678000190550010000000011234567890",
        "numero": "1",
        "serie": "1",
        "data_emissao": "2026-01-20",
        "emitente": {
            "cnpj": "12345678000190",
            "razao_social": "EMPRESA TESTE LTDA",
            "inscricao_estadual": "123456789"
        },
        "destinatario": {
            "cnpj": "98765432000110",
            "razao_social": "CLIENTE TESTE SA"
        },
        "valores": {
            "total_produtos": 1000.00,
            "total_nota": 1120.00,
            "icms": 120.00
        }
    }


@pytest.fixture
def document_upload_response() -> Dict[str, Any]:
    """Resposta de upload de documento."""
    return {
        "id": "doc_001",
        "name": "nota_fiscal.pdf",
        "type": "nfe",
        "size_bytes": 12345,
        "created_at": datetime.utcnow().isoformat(),
        "metadata": {}
    }


@pytest.fixture
def transcription_result() -> Dict[str, Any]:
    """Resultado de transcrição."""
    return {
        "text": "Olá, mundo! Este é um teste de transcrição.",
        "language": "pt-BR",
        "confidence": 0.95,
        "duration_seconds": 3.5,
        "segments": [
            {"start": 0.0, "end": 1.5, "text": "Olá, mundo!"},
            {"start": 1.5, "end": 3.5, "text": "Este é um teste de transcrição."}
        ]
    }


@pytest.fixture
def synthesis_result() -> Dict[str, Any]:
    """Resultado de síntese."""
    return {
        "audio": base64.b64encode(b"fake_audio_content").decode(),
        "format": "mp3",
        "duration_seconds": 2.0,
        "sample_rate": 24000
    }
