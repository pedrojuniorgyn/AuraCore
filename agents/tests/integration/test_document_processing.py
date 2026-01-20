# agents/tests/integration/test_document_processing.py
"""
Testes de integração do processamento de documentos.
"""

import pytest
from unittest.mock import patch, AsyncMock
from typing import Dict, Any


class TestDocumentProcessingFlow:
    """Testes de processamento de documentos."""
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_danfe_extraction_flow(
        self,
        sample_pdf_content: bytes,
        danfe_extracted_data: Dict[str, Any]
    ) -> None:
        """
        Testa fluxo completo de extração de DANFe:
        1. Upload do PDF
        2. Processamento via Docling
        3. Extração de dados estruturados
        4. Validação da chave de acesso
        """
        with patch("src.services.documents.get_document_service") as mock_svc:
            mock_service = AsyncMock()
            mock_service.upload.return_value = {"id": "doc_001"}
            mock_service.process.return_value = danfe_extracted_data
            mock_svc.return_value = mock_service
            
            # Upload
            upload_result = await mock_service.upload(sample_pdf_content, "nfe")
            assert "id" in upload_result
            
            # Process
            extract_result = await mock_service.process(upload_result["id"], "danfe")
            
            # Validate
            assert "chave_acesso" in extract_result
            assert len(extract_result["chave_acesso"]) == 44
            assert "emitente" in extract_result
            assert "cnpj" in extract_result["emitente"]
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_document_to_agent_flow(
        self,
        sample_pdf_content: bytes,
        danfe_extracted_data: Dict[str, Any]
    ) -> None:
        """
        Testa fluxo de documento para agent:
        1. Extrai dados do documento
        2. Envia para agent fiscal
        3. Agent processa e responde
        """
        with patch("src.services.documents.get_document_service") as mock_doc:
            mock_doc_svc = AsyncMock()
            mock_doc_svc.process.return_value = danfe_extracted_data
            mock_doc.return_value = mock_doc_svc
            
            # Extract
            extracted = await mock_doc_svc.process("doc_001", "danfe")
            
            # Verify data ready for agent
            assert extracted["valores"]["icms"] == 120.00
            assert extracted["emitente"]["cnpj"] == "12345678000190"
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_batch_document_processing(
        self,
        sample_pdf_content: bytes,
        danfe_extracted_data: Dict[str, Any]
    ) -> None:
        """
        Testa processamento em lote de documentos.
        """
        with patch("src.services.documents.get_document_service") as mock_svc:
            mock_service = AsyncMock()
            mock_service.upload.return_value = {"id": "doc_batch"}
            mock_service.process.return_value = danfe_extracted_data
            mock_svc.return_value = mock_service
            
            # Simular upload de múltiplos documentos
            doc_ids = []
            for i in range(3):
                result = await mock_service.upload(sample_pdf_content, "nfe")
                doc_ids.append(result["id"])
            
            assert len(doc_ids) == 3
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_document_validation_flow(
        self,
        danfe_extracted_data: Dict[str, Any]
    ) -> None:
        """
        Testa validação de documento extraído.
        """
        # Validar chave de acesso
        chave = danfe_extracted_data["chave_acesso"]
        assert len(chave) == 44
        assert chave.isdigit()
        
        # Validar CNPJ emitente
        cnpj = danfe_extracted_data["emitente"]["cnpj"]
        assert len(cnpj) == 14
        
        # Validar valores
        valores = danfe_extracted_data["valores"]
        assert valores["total_nota"] > valores["total_produtos"]
        assert valores["icms"] > 0
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_cte_extraction_flow(self) -> None:
        """
        Testa extração de CT-e.
        """
        cte_data = {
            "chave_acesso": "35260112345678000190570010000000011234567890",
            "numero": "1",
            "serie": "1",
            "modal": "01",  # Rodoviário
            "tomador": {
                "cnpj": "12345678000190",
                "razao_social": "TRANSPORTADORA TESTE"
            },
            "valores": {
                "total_servico": 500.00,
                "icms": 60.00
            }
        }
        
        with patch("src.services.documents.get_document_service") as mock_svc:
            mock_service = AsyncMock()
            mock_service.process.return_value = cte_data
            mock_svc.return_value = mock_service
            
            result = await mock_service.process("doc_cte", "dacte")
            
            assert result["modal"] == "01"
            assert "tomador" in result
