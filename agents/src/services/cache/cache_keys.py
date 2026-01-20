# agents/src/services/cache/cache_keys.py
"""
Chaves de cache padronizadas.

Nomenclatura:
- {módulo}:{entidade}:{identificador}
- Exemplo: agent:response:abc123
"""

import hashlib
import json
from typing import Optional


class CacheKeys:
    """Gerador de chaves de cache."""
    
    # ===== AGENTS =====
    
    @staticmethod
    def agent_response(
        agent_type: str,
        message_hash: str,
        org_id: int,
        branch_id: int
    ) -> str:
        """Chave para resposta de agente."""
        return f"agent:response:{agent_type}:{org_id}:{branch_id}:{message_hash}"
    
    @staticmethod
    def agent_context(session_id: str) -> str:
        """Chave para contexto de sessão."""
        return f"agent:context:{session_id}"
    
    # ===== EMBEDDINGS =====
    
    @staticmethod
    def embedding(text_hash: str) -> str:
        """Chave para embedding de texto."""
        return f"embedding:{text_hash}"
    
    @staticmethod
    def embedding_batch(batch_hash: str) -> str:
        """Chave para batch de embeddings."""
        return f"embedding:batch:{batch_hash}"
    
    # ===== RAG =====
    
    @staticmethod
    def rag_query(
        query_hash: str,
        filter_type: Optional[str] = None
    ) -> str:
        """Chave para resultado de query RAG."""
        suffix = f":{filter_type}" if filter_type else ""
        return f"rag:query:{query_hash}{suffix}"
    
    @staticmethod
    def rag_context(query_hash: str) -> str:
        """Chave para contexto RAG formatado."""
        return f"rag:context:{query_hash}"
    
    # ===== VOICE =====
    
    @staticmethod
    def voice_transcription(audio_hash: str) -> str:
        """Chave para transcrição de áudio."""
        return f"voice:transcription:{audio_hash}"
    
    @staticmethod
    def voice_synthesis(text_hash: str, voice: str = "default") -> str:
        """Chave para síntese de voz."""
        return f"voice:synthesis:{voice}:{text_hash}"
    
    # ===== TOOLS =====
    
    @staticmethod
    def tool_result(
        tool_name: str,
        input_hash: str,
        org_id: int,
        branch_id: int
    ) -> str:
        """Chave para resultado de tool."""
        return f"tool:{tool_name}:{org_id}:{branch_id}:{input_hash}"
    
    # ===== LEGISLATION =====
    
    @staticmethod
    def legislation(law_id: str) -> str:
        """Chave para legislação."""
        return f"legislation:{law_id}"
    
    @staticmethod
    def tax_rate(
        tax_type: str,
        uf_origem: str,
        uf_destino: str
    ) -> str:
        """Chave para alíquota de imposto."""
        return f"tax:rate:{tax_type}:{uf_origem}:{uf_destino}"
    
    # ===== HELPERS =====
    
    @staticmethod
    def hash_text(text: str) -> str:
        """Gera hash de texto para usar como chave."""
        return hashlib.md5(text.encode()).hexdigest()
    
    @staticmethod
    def hash_dict(data: dict) -> str:
        """Gera hash de dicionário para usar como chave."""
        text = json.dumps(data, sort_keys=True, default=str)
        return hashlib.md5(text.encode()).hexdigest()
    
    @staticmethod
    def hash_bytes(data: bytes) -> str:
        """Gera hash de bytes para usar como chave."""
        return hashlib.md5(data).hexdigest()
