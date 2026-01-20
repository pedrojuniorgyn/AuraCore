"""
Extrator de dados de DANFe (Documento Auxiliar da NFe).

Extrai:
- Chave de acesso (44 dígitos)
- Dados do emitente (CNPJ, nome, endereço)
- Dados do destinatário
- Itens da nota (produtos)
- Valores (total, ICMS, IPI, etc.)
- Data de emissão e saída
"""

import re
import asyncio
import atexit
from typing import Optional, List
from dataclasses import dataclass, field
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor

from src.core.observability import get_logger
from src.services.document_processing.docling_processor import (
    DoclingProcessor,
    ProcessedDocument,
    get_docling_processor,
)

logger = get_logger(__name__)

# Module-level executor singleton com cleanup automático
_executor: Optional[ThreadPoolExecutor] = None


def _get_executor() -> ThreadPoolExecutor:
    """
    Retorna executor singleton com cleanup registrado.
    
    Usa atexit para garantir shutdown graceful do executor
    quando o processo Python termina.
    """
    global _executor
    if _executor is None:
        _executor = ThreadPoolExecutor(max_workers=4)
        atexit.register(_executor.shutdown, wait=False)
    return _executor


@dataclass
class DanfeItem:
    """Item da DANFe."""
    codigo: str
    descricao: str
    ncm: str
    cfop: str
    unidade: str
    quantidade: Decimal
    valor_unitario: Decimal
    valor_total: Decimal
    icms_base: Optional[Decimal] = None
    icms_valor: Optional[Decimal] = None
    icms_aliquota: Optional[Decimal] = None


@dataclass
class DanfeEmitente:
    """Dados do emitente."""
    cnpj: str
    razao_social: str
    nome_fantasia: Optional[str] = None
    inscricao_estadual: Optional[str] = None
    endereco: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None


@dataclass
class DanfeDestinatario:
    """Dados do destinatário."""
    documento: str  # CNPJ ou CPF
    nome: str
    inscricao_estadual: Optional[str] = None
    endereco: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None


@dataclass
class DanfeData:
    """Dados extraídos da DANFe."""
    # Identificação
    chave_acesso: str
    numero: str
    serie: str
    data_emissao: str
    data_saida: Optional[str] = None
    
    # Participantes
    emitente: Optional[DanfeEmitente] = None
    destinatario: Optional[DanfeDestinatario] = None
    
    # Valores
    valor_produtos: Decimal = field(default_factory=lambda: Decimal("0"))
    valor_frete: Decimal = field(default_factory=lambda: Decimal("0"))
    valor_seguro: Decimal = field(default_factory=lambda: Decimal("0"))
    valor_desconto: Decimal = field(default_factory=lambda: Decimal("0"))
    valor_total: Decimal = field(default_factory=lambda: Decimal("0"))
    
    # Impostos
    icms_base: Decimal = field(default_factory=lambda: Decimal("0"))
    icms_valor: Decimal = field(default_factory=lambda: Decimal("0"))
    ipi_valor: Decimal = field(default_factory=lambda: Decimal("0"))
    pis_valor: Decimal = field(default_factory=lambda: Decimal("0"))
    cofins_valor: Decimal = field(default_factory=lambda: Decimal("0"))
    
    # Itens
    itens: List[DanfeItem] = field(default_factory=list)
    
    # Transporte
    modalidade_frete: Optional[str] = None
    transportador_cnpj: Optional[str] = None
    transportador_nome: Optional[str] = None
    placa_veiculo: Optional[str] = None
    
    # Informações adicionais
    informacoes_complementares: Optional[str] = None
    
    # Metadados do processamento
    confidence_score: float = 0.0
    warnings: List[str] = field(default_factory=list)


@dataclass
class DanfeExtractionResult:
    """Resultado da extração de DANFe."""
    success: bool
    data: Optional[DanfeData] = None
    error: Optional[str] = None


class DanfeExtractor:
    """
    Extrator de dados de DANFe.
    
    Uso:
        extractor = DanfeExtractor()
        result = await extractor.extract_from_file("/path/to/danfe.pdf")
        
        if result.success:
            print(f"Chave: {result.data.chave_acesso}")
            print(f"Total: R$ {result.data.valor_total}")
    """
    
    def __init__(self, processor: Optional[DoclingProcessor] = None):
        self.processor = processor or get_docling_processor()
    
    async def extract_from_file(self, file_path: str) -> DanfeExtractionResult:
        """
        Extrai dados de arquivo DANFe PDF.
        
        Args:
            file_path: Caminho do arquivo PDF
            
        Returns:
            DanfeExtractionResult com dados extraídos
        """
        logger.info("extracting_danfe", extra={"file_path": file_path})
        
        # Processar com Docling
        doc_result = await self.processor.process_file(file_path)
        
        if not doc_result.success:
            return DanfeExtractionResult(
                success=False,
                error=doc_result.error
            )
        
        # Extrair dados em thread separada para não bloquear event loop
        # _extract_data é CPU-bound (regex), então usamos executor
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _get_executor(),
            self._extract_data,
            doc_result
        )
    
    async def extract_from_bytes(
        self,
        content: bytes,
        filename: str = "danfe.pdf"
    ) -> DanfeExtractionResult:
        """
        Extrai dados de bytes do PDF.
        
        Args:
            content: Conteúdo do PDF em bytes
            filename: Nome do arquivo
            
        Returns:
            DanfeExtractionResult
        """
        doc_result = await self.processor.process_bytes(content, filename)
        
        if not doc_result.success:
            return DanfeExtractionResult(
                success=False,
                error=doc_result.error
            )
        
        # Extrair dados em thread separada para não bloquear event loop
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _get_executor(),
            self._extract_data,
            doc_result
        )
    
    def _extract_data(self, doc_result: ProcessedDocument) -> DanfeExtractionResult:
        """Extrai dados do documento processado."""
        text = doc_result.text
        warnings: List[str] = []
        
        # Extrair chave de acesso (44 dígitos)
        chave_acesso = self._extract_chave_acesso(text)
        if not chave_acesso:
            warnings.append("Chave de acesso não encontrada")
        
        # Extrair número e série
        numero, serie = self._extract_numero_serie(text)
        
        # Extrair CNPJ do emitente
        emitente = self._extract_emitente(text)
        
        # Extrair destinatário
        destinatario = self._extract_destinatario(text)
        
        # Extrair valores
        valores = self._extract_valores(text)
        
        # Extrair itens das tabelas
        itens = self._extract_itens(doc_result.tables)
        
        # Extrair data
        data_emissao = self._extract_data_documento(text, "emissão")
        data_saida = self._extract_data_documento(text, "saída")
        
        # Calcular confidence score
        confidence = self._calculate_confidence(
            chave_acesso, numero, emitente, valores.get("total")
        )
        
        data = DanfeData(
            chave_acesso=chave_acesso or "",
            numero=numero or "",
            serie=serie or "",
            data_emissao=data_emissao or "",
            data_saida=data_saida,
            emitente=emitente,
            destinatario=destinatario,
            valor_produtos=valores.get("produtos", Decimal("0")),
            valor_frete=valores.get("frete", Decimal("0")),
            valor_seguro=valores.get("seguro", Decimal("0")),
            valor_desconto=valores.get("desconto", Decimal("0")),
            valor_total=valores.get("total", Decimal("0")),
            icms_base=valores.get("icms_base", Decimal("0")),
            icms_valor=valores.get("icms_valor", Decimal("0")),
            ipi_valor=valores.get("ipi", Decimal("0")),
            pis_valor=valores.get("pis", Decimal("0")),
            cofins_valor=valores.get("cofins", Decimal("0")),
            itens=itens,
            confidence_score=confidence,
            warnings=warnings
        )
        
        logger.info(
            "danfe_extracted",
            extra={
                "chave": chave_acesso[:20] + "..." if chave_acesso else None,
                "numero": numero,
                "total": float(data.valor_total),
                "itens": len(itens),
                "confidence": confidence
            }
        )
        
        return DanfeExtractionResult(
            success=True,
            data=data
        )
    
    def _extract_chave_acesso(self, text: str) -> Optional[str]:
        """Extrai chave de acesso (44 dígitos)."""
        patterns = [
            r'\b(\d{44})\b',  # 44 dígitos juntos
            r'(\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4})',
            r'CHAVE\s*(?:DE\s*)?ACESSO[:\s]*(\d[\d\s]{42,54})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                chave = re.sub(r'\s', '', match.group(1))
                if len(chave) == 44 and chave.isdigit():
                    return chave
        
        return None
    
    def _extract_numero_serie(self, text: str) -> tuple[Optional[str], Optional[str]]:
        """Extrai número e série da NFe."""
        numero_match = re.search(r'N[ºÚU°]?\s*[:.]?\s*(\d{1,9})', text, re.IGNORECASE)
        numero = numero_match.group(1) if numero_match else None
        
        serie_match = re.search(r'S[ÉE]RIE\s*[:.]?\s*(\d{1,3})', text, re.IGNORECASE)
        serie = serie_match.group(1) if serie_match else None
        
        return numero, serie
    
    def _extract_emitente(self, text: str) -> Optional[DanfeEmitente]:
        """Extrai dados do emitente."""
        cnpj_match = re.search(
            r'CNPJ[:\s]*(\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2})',
            text,
            re.IGNORECASE
        )
        
        if not cnpj_match:
            return None
        
        cnpj = re.sub(r'[.\-/\s]', '', cnpj_match.group(1))
        
        return DanfeEmitente(
            cnpj=cnpj,
            razao_social=""  # Extrair razão social requer análise mais complexa
        )
    
    def _extract_destinatario(self, text: str) -> Optional[DanfeDestinatario]:
        """Extrai dados do destinatário."""
        dest_section = re.search(
            r'DESTINAT[ÁA]RIO.*?(?=DADOS|PRODUTO|VALOR|$)',
            text,
            re.IGNORECASE | re.DOTALL
        )
        
        if not dest_section:
            return None
        
        section_text = dest_section.group(0)
        
        doc_match = re.search(
            r'(?:CNPJ|CPF)[:\s]*(\d[\d.\-/\s]{10,18})',
            section_text,
            re.IGNORECASE
        )
        
        if not doc_match:
            return None
        
        documento = re.sub(r'[.\-/\s]', '', doc_match.group(1))
        
        return DanfeDestinatario(
            documento=documento,
            nome=""  # Extrair nome requer análise mais complexa
        )
    
    def _extract_valores(self, text: str) -> dict[str, Decimal]:
        """Extrai valores monetários."""
        valores: dict[str, Decimal] = {}
        
        patterns = {
            "produtos": r'VALOR\s*(?:TOTAL\s*)?(?:DOS\s*)?PRODUTOS[:\s]*R?\$?\s*([\d.,]+)',
            "frete": r'VALOR\s*(?:DO\s*)?FRETE[:\s]*R?\$?\s*([\d.,]+)',
            "seguro": r'VALOR\s*(?:DO\s*)?SEGURO[:\s]*R?\$?\s*([\d.,]+)',
            "desconto": r'(?:VALOR\s*)?DESCONTO[:\s]*R?\$?\s*([\d.,]+)',
            "total": r'VALOR\s*TOTAL\s*(?:DA\s*)?(?:NOTA|NF)[:\s]*R?\$?\s*([\d.,]+)',
            "icms_base": r'BASE\s*(?:DE\s*)?C[ÁA]LC(?:ULO)?\s*(?:DO\s*)?ICMS[:\s]*R?\$?\s*([\d.,]+)',
            "icms_valor": r'VALOR\s*(?:DO\s*)?ICMS[:\s]*R?\$?\s*([\d.,]+)',
            "ipi": r'VALOR\s*(?:DO\s*)?IPI[:\s]*R?\$?\s*([\d.,]+)',
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                valor_str = match.group(1)
                valor_str = valor_str.replace('.', '').replace(',', '.')
                try:
                    valores[key] = Decimal(valor_str)
                except Exception:
                    pass
        
        return valores
    
    def _extract_itens(self, tables: List[dict]) -> List[DanfeItem]:
        """Extrai itens das tabelas."""
        itens: List[DanfeItem] = []
        
        for table in tables:
            if not table.get("data"):
                continue
            
            headers = table["data"][0] if table["data"] else []
            headers_lower = [str(h).lower() for h in headers]
            
            if any(kw in " ".join(headers_lower) for kw in ["código", "produto", "descrição", "qtd", "valor"]):
                for row in table["data"][1:]:
                    if len(row) >= 5:
                        try:
                            item = DanfeItem(
                                codigo=str(row[0]),
                                descricao=str(row[1]),
                                ncm=str(row[2]) if len(row) > 2 else "",
                                cfop=str(row[3]) if len(row) > 3 else "",
                                unidade=str(row[4]) if len(row) > 4 else "",
                                quantidade=Decimal(str(row[5]).replace(',', '.')) if len(row) > 5 else Decimal("0"),
                                valor_unitario=Decimal(str(row[6]).replace(',', '.')) if len(row) > 6 else Decimal("0"),
                                valor_total=Decimal(str(row[7]).replace(',', '.')) if len(row) > 7 else Decimal("0")
                            )
                            itens.append(item)
                        except Exception:
                            continue
        
        return itens
    
    def _extract_data_documento(self, text: str, tipo: str) -> Optional[str]:
        """Extrai data do documento."""
        pattern = rf'DATA\s*(?:DE\s*)?{tipo}[:\s]*(\d{{2}}[/.\-]\d{{2}}[/.\-]\d{{2,4}})'
        match = re.search(pattern, text, re.IGNORECASE)
        return match.group(1) if match else None
    
    def _calculate_confidence(
        self,
        chave: Optional[str],
        numero: Optional[str],
        emitente: Optional[DanfeEmitente],
        total: Optional[Decimal]
    ) -> float:
        """Calcula score de confiança da extração."""
        score = 0.0
        
        if chave and len(chave) == 44:
            score += 0.3
        if numero:
            score += 0.2
        if emitente and emitente.cnpj:
            score += 0.2
        if total and total > 0:
            score += 0.3
        
        return score
