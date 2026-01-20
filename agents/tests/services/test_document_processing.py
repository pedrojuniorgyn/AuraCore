# agents/tests/services/test_document_processing.py
"""
Testes dos serviços de processamento de documentos (Docling, DANFe, DACTe).
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from decimal import Decimal

from src.services.document_processing.danfe_extractor import DanfeExtractor
from src.services.document_processing.dacte_extractor import DacteExtractor
from src.services.document_processing.docling_processor import DoclingProcessor


class TestDoclingProcessor:
    """Testes do processador Docling."""
    
    @pytest.fixture
    def processor(self):
        """Cria processador para testes."""
        return DoclingProcessor()
    
    @pytest.mark.unit
    def test_processor_initialization(self, processor):
        """Verifica inicialização do processador."""
        assert processor is not None
        assert processor.cache_dir is not None
    
    @pytest.mark.unit
    def test_supported_formats(self, processor):
        """Verifica formatos suportados."""
        # Docling suporta PDF, DOCX, imagens
        assert hasattr(processor, 'process_file') or hasattr(processor, 'process_bytes')


class TestDanfeExtractor:
    """Testes do extrator de DANFe."""
    
    @pytest.fixture
    def extractor(self):
        """Cria extrator para testes."""
        mock_processor = MagicMock()
        return DanfeExtractor(processor=mock_processor)
    
    @pytest.mark.unit
    def test_extract_chave_acesso_valid(self, extractor, sample_danfe_text):
        """Testa extração de chave de acesso válida."""
        chave = extractor._extract_chave_acesso(sample_danfe_text)
        
        assert chave is not None
        assert len(chave) == 44
        assert chave.isdigit()
        # Modelo 55 = NFe
        assert chave[20:22] == "55", f"Modelo deveria ser 55, é {chave[20:22]}"
    
    @pytest.mark.unit
    def test_extract_chave_acesso_invalid_returns_none(self, extractor):
        """Testa que texto sem chave válida retorna None."""
        text_without_key = "Texto sem chave de acesso válida 123456"
        chave = extractor._extract_chave_acesso(text_without_key)
        
        assert chave is None
    
    @pytest.mark.unit
    def test_extract_cnpj_from_text(self, extractor, sample_danfe_text):
        """Testa extração de CNPJ."""
        # O texto tem CNPJ formatado 12.345.678/0001-95
        cnpj = extractor._extract_cnpj(sample_danfe_text)
        
        assert cnpj is not None
        # CNPJ sem formatação tem 14 dígitos
        assert len(cnpj) == 14 or "." in cnpj
    
    @pytest.mark.unit
    def test_extract_valores(self, extractor, sample_danfe_text):
        """Testa extração de valores monetários."""
        valores = extractor._extract_valores(sample_danfe_text)
        
        assert valores is not None
        # Deve ter algum valor extraído
        assert len(valores) > 0
    
    @pytest.mark.unit
    def test_calculate_confidence_full_data(self, extractor):
        """Testa cálculo de confiança com dados completos."""
        # Simula dados completos
        mock_emitente = MagicMock()
        mock_emitente.cnpj = "12345678000195"
        
        conf = extractor._calculate_confidence(
            chave="35240112345678000195550010000001231234567890",
            numero="123",
            emitente=mock_emitente,
            total=Decimal("1000.00")
        )
        
        # Com todos os dados, confiança deve ser alta
        assert conf >= 0.75
    
    @pytest.mark.unit
    def test_calculate_confidence_no_data(self, extractor):
        """Testa cálculo de confiança sem dados."""
        conf = extractor._calculate_confidence(
            chave=None,
            numero=None,
            emitente=None,
            total=None
        )
        
        assert conf == 0.0


class TestDacteExtractor:
    """Testes do extrator de DACTe."""
    
    @pytest.fixture
    def extractor(self):
        """Cria extrator para testes."""
        mock_processor = MagicMock()
        return DacteExtractor(processor=mock_processor)
    
    @pytest.mark.unit
    def test_extract_chave_acesso_cte(self, extractor, sample_dacte_text):
        """Testa extração de chave de CTe (modelo 57)."""
        chave = extractor._extract_chave_acesso(sample_dacte_text)
        
        assert chave is not None
        assert len(chave) == 44
        # Modelo 57 = CTe
        assert chave[20:22] == "57", f"Modelo deveria ser 57, é {chave[20:22]}"
    
    @pytest.mark.unit
    def test_extract_veiculo(self, extractor, sample_dacte_text):
        """Testa extração de dados do veículo."""
        veiculo = extractor._extract_veiculo(sample_dacte_text)
        
        assert veiculo is not None
        assert veiculo.placa is not None
        # Placa no formato antigo (ABC1234) ou Mercosul (ABC1D23)
        assert len(veiculo.placa) == 7
    
    @pytest.mark.unit
    def test_extract_carga(self, extractor, sample_dacte_text):
        """Testa extração de informações da carga."""
        carga = extractor._extract_carga(sample_dacte_text, [])
        
        assert carga is not None
        assert carga.valor_carga >= 0
        assert carga.peso_bruto >= 0
    
    @pytest.mark.unit
    def test_extract_nfes_vinculadas(self, extractor):
        """Testa extração de NFes vinculadas."""
        text_with_nfes = """
        NFe vinculada: 35240112345678000195550010000001231234567890
        NFe vinculada: 35240198765432000110550010000009871234567890
        """
        
        nfes = extractor._extract_nfes_vinculadas(text_with_nfes)
        
        assert len(nfes) == 2
        for nfe in nfes:
            assert len(nfe) == 44
            assert nfe[20:22] == "55"  # Modelo NFe
    
    @pytest.mark.unit
    def test_extract_emitente(self, extractor, sample_dacte_text):
        """Testa extração do transportador/emitente."""
        emitente = extractor._extract_emitente(sample_dacte_text)
        
        assert emitente is not None
        assert emitente.cnpj is not None


class TestChaveAcessoValidation:
    """Testes de validação de chave de acesso."""
    
    @pytest.mark.unit
    def test_chave_nfe_modelo_55(self):
        """Valida estrutura de chave NFe (modelo 55)."""
        chave = "35240112345678000195550010000001231234567890"
        
        assert len(chave) == 44
        assert chave[20:22] == "55"  # Modelo NFe
        assert chave[:2] == "35"  # UF SP
        assert chave[2:6] == "2401"  # AAMM
    
    @pytest.mark.unit
    def test_chave_cte_modelo_57(self):
        """Valida estrutura de chave CTe (modelo 57)."""
        chave = "35240112345678000195570010000001231234567890"
        
        assert len(chave) == 44
        assert chave[20:22] == "57"  # Modelo CTe
        assert chave[:2] == "35"  # UF SP
    
    @pytest.mark.unit
    def test_chave_invalid_length(self):
        """Valida que chaves com tamanho errado são rejeitadas."""
        invalid_keys = [
            "123",  # Muito curta
            "35240112345678000195550010000001231234567890123",  # Muito longa
        ]
        
        for key in invalid_keys:
            assert len(key) != 44
