# agents/sdk/python/auracore/resources/documents.py
"""
Resource de Documents.
"""

import base64
from typing import Optional, Union, TYPE_CHECKING
from pathlib import Path
from datetime import datetime
from ..types import Document
from ..exceptions import raise_for_status

if TYPE_CHECKING:
    from ..client import AuraCore


class DocumentsResource:
    """
    Resource para operações com documentos.
    
    Uso:
        # Upload
        doc = await client.documents.upload("nota.pdf", "nfe")
        
        # Process (DANFe, DACTe)
        result = await client.documents.process(doc.id, "danfe")
    """
    
    def __init__(self, client: "AuraCore"):
        self._client = client
    
    async def upload(
        self,
        file: Union[str, Path, bytes],
        document_type: str,
        filename: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> Document:
        """
        Faz upload de documento.
        
        Args:
            file: Caminho, Path, ou bytes do arquivo
            document_type: Tipo do documento (nfe, cte, pdf, etc)
            filename: Nome do arquivo (opcional se file for path)
            metadata: Metadados adicionais
        
        Returns:
            Document com informações do upload
        """
        if isinstance(file, (str, Path)):
            path = Path(file)
            filename = filename or path.name
            with open(path, "rb") as f:
                file_bytes = f.read()
        else:
            file_bytes = file
            filename = filename or "document"
        
        file_b64 = base64.b64encode(file_bytes).decode()
        
        response = await self._client.async_client.post(
            "/v1/documents/upload",
            json={
                "file": file_b64,
                "filename": filename,
                "document_type": document_type,
                "metadata": metadata or {}
            }
        )
        
        raise_for_status(response)
        data = response.json()
        
        return Document(
            id=data["id"],
            name=data["name"],
            type=data["type"],
            size_bytes=data["size_bytes"],
            created_at=datetime.fromisoformat(data["created_at"]),
            metadata=data.get("metadata", {})
        )
    
    def upload_sync(
        self,
        file: Union[str, Path, bytes],
        document_type: str,
        filename: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> Document:
        """Versão síncrona de upload()."""
        if isinstance(file, (str, Path)):
            path = Path(file)
            filename = filename or path.name
            with open(path, "rb") as f:
                file_bytes = f.read()
        else:
            file_bytes = file
            filename = filename or "document"
        
        file_b64 = base64.b64encode(file_bytes).decode()
        
        response = self._client.sync_client.post(
            "/v1/documents/upload",
            json={
                "file": file_b64,
                "filename": filename,
                "document_type": document_type,
                "metadata": metadata or {}
            }
        )
        
        raise_for_status(response)
        data = response.json()
        
        return Document(
            id=data["id"],
            name=data["name"],
            type=data["type"],
            size_bytes=data["size_bytes"],
            created_at=datetime.fromisoformat(data["created_at"]),
            metadata=data.get("metadata", {})
        )
    
    async def process(
        self,
        document_id: str,
        processor: str = "auto"
    ) -> dict:
        """
        Processa documento (OCR, extração).
        
        Args:
            document_id: ID do documento
            processor: Processador (auto, danfe, dacte, ocr)
        
        Returns:
            Dict com dados extraídos
        """
        response = await self._client.async_client.post(
            f"/v1/documents/{document_id}/process",
            json={"processor": processor}
        )
        
        raise_for_status(response)
        return response.json()
    
    def process_sync(
        self,
        document_id: str,
        processor: str = "auto"
    ) -> dict:
        """Versão síncrona de process()."""
        response = self._client.sync_client.post(
            f"/v1/documents/{document_id}/process",
            json={"processor": processor}
        )
        
        raise_for_status(response)
        return response.json()
    
    async def get(self, document_id: str) -> Document:
        """Obtém documento por ID."""
        response = await self._client.async_client.get(
            f"/v1/documents/{document_id}"
        )
        
        raise_for_status(response)
        data = response.json()
        
        return Document(
            id=data["id"],
            name=data["name"],
            type=data["type"],
            size_bytes=data["size_bytes"],
            created_at=datetime.fromisoformat(data["created_at"]),
            metadata=data.get("metadata", {})
        )
    
    def get_sync(self, document_id: str) -> Document:
        """Versão síncrona de get()."""
        response = self._client.sync_client.get(
            f"/v1/documents/{document_id}"
        )
        
        raise_for_status(response)
        data = response.json()
        
        return Document(
            id=data["id"],
            name=data["name"],
            type=data["type"],
            size_bytes=data["size_bytes"],
            created_at=datetime.fromisoformat(data["created_at"]),
            metadata=data.get("metadata", {})
        )
    
    async def delete(self, document_id: str) -> bool:
        """Remove documento."""
        response = await self._client.async_client.delete(
            f"/v1/documents/{document_id}"
        )
        
        raise_for_status(response)
        return True
    
    def delete_sync(self, document_id: str) -> bool:
        """Versão síncrona de delete()."""
        response = self._client.sync_client.delete(
            f"/v1/documents/{document_id}"
        )
        
        raise_for_status(response)
        return True
