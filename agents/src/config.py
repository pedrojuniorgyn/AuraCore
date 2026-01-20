"""
Configurações do sistema de agentes.

Carrega configurações de variáveis de ambiente com validação.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configurações carregadas de variáveis de ambiente."""

    # API Keys
    anthropic_api_key: str = Field(
        description="Chave de API da Anthropic para Claude"
    )

    # AuraCore API
    auracore_api_url: str = Field(
        default="http://localhost:3000",
        description="URL base da API do AuraCore"
    )
    auracore_api_timeout: int = Field(
        default=30,
        description="Timeout em segundos para chamadas à API"
    )

    # ChromaDB (Knowledge Module)
    chroma_host: str = Field(
        default="localhost",
        description="Host do ChromaDB"
    )
    chroma_port: int = Field(
        default=8000,
        description="Porta do ChromaDB"
    )
    chroma_collection: str = Field(
        default="auracore_knowledge",
        description="Nome da collection no ChromaDB"
    )

    # Logging
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO",
        description="Nível de log"
    )
    log_format: Literal["json", "text"] = Field(
        default="json",
        description="Formato de log"
    )

    # Memory
    memory_db_path: str = Field(
        default="./data/memory",
        description="Caminho para banco de memória SQLite"
    )

    # Rate Limiting
    rate_limit_requests: int = Field(
        default=100,
        description="Máximo de requests por janela"
    )
    rate_limit_window: int = Field(
        default=60,
        description="Janela de rate limit em segundos"
    )

    # Feature Flags
    enable_guardrails: bool = Field(
        default=True,
        description="Habilitar guardrails de segurança"
    )
    enable_observability: bool = Field(
        default=True,
        description="Habilitar métricas e tracing"
    )
    enable_memory: bool = Field(
        default=True,
        description="Habilitar memória persistente"
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }

    @property
    def chroma_url(self) -> str:
        """URL completa do ChromaDB."""
        return f"http://{self.chroma_host}:{self.chroma_port}"

    @property
    def knowledge_api_url(self) -> str:
        """URL da API de Knowledge do AuraCore."""
        return f"{self.auracore_api_url}/api/knowledge/search"


@lru_cache()
def get_settings() -> Settings:
    """Retorna instância singleton das configurações."""
    return Settings()
