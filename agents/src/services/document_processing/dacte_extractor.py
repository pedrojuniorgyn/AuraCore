"""
Extrator de dados de DACTe (Documento Auxiliar do CTe).

Extrai:
- Chave de acesso (44 dígitos, modelo 57)
- Dados do emitente (transportadora)
- Dados do remetente e destinatário
- Informações da carga
- Valores do frete
- Dados do veículo
- NFes vinculadas

@module services/document_processing/dacte_extractor
"""

import re
import asyncio
import atexit
from typing import Optional, List
from dataclasses import dataclass, field
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor

from src.core.observability import get_logger
from .docling_processor import DoclingProcessor, ProcessedDocument, get_docling_processor

logger = get_logger(__name__)

# Executor com cleanup automático
_executor: Optional[ThreadPoolExecutor] = None


def _get_executor() -> ThreadPoolExecutor:
    """Retorna executor singleton com cleanup."""
    global _executor
    if _executor is None:
        _executor = ThreadPoolExecutor(max_workers=4)
        atexit.register(_executor.shutdown, wait=False)
    return _executor


@dataclass
class DacteEmitente:
    """Dados da transportadora (emitente do CTe)."""

    cnpj: str
    razao_social: str
    nome_fantasia: Optional[str] = None
    inscricao_estadual: Optional[str] = None
    endereco: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None


@dataclass
class DacteParticipante:
    """Dados de remetente ou destinatário."""

    documento: str  # CNPJ ou CPF
    nome: str
    inscricao_estadual: Optional[str] = None
    endereco: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None


@dataclass
class DacteCarga:
    """Informações da carga transportada."""

    produto_predominante: Optional[str] = None
    valor_carga: Decimal = field(default_factory=lambda: Decimal("0"))
    peso_bruto: Decimal = field(default_factory=lambda: Decimal("0"))  # kg
    peso_cubado: Optional[Decimal] = None
    quantidade_volumes: int = 0
    unidade_medida: str = "KG"


@dataclass
class DacteVeiculo:
    """Dados do veículo."""

    placa: str
    uf: Optional[str] = None
    rntrc: Optional[str] = None  # Registro Nacional Transportadores
    tipo: Optional[str] = None  # Truck, Carreta, etc.


@dataclass
class DacteData:
    """Dados extraídos do DACTe."""

    # Identificação
    chave_acesso: str
    numero: str
    serie: str
    data_emissao: str
    cfop: Optional[str] = None
    natureza_operacao: Optional[str] = None

    # Tipo de CTe
    tipo_cte: str = "NORMAL"  # NORMAL, COMPLEMENTAR, ANULACAO, SUBSTITUTO
    modal: str = "RODOVIARIO"  # RODOVIARIO, AEREO, AQUAVIARIO, FERROVIARIO, DUTOVIARIO

    # Participantes
    emitente: Optional[DacteEmitente] = None
    remetente: Optional[DacteParticipante] = None
    destinatario: Optional[DacteParticipante] = None
    expedidor: Optional[DacteParticipante] = None
    recebedor: Optional[DacteParticipante] = None

    # Carga
    carga: Optional[DacteCarga] = None

    # NFes vinculadas
    nfes_vinculadas: List[str] = field(default_factory=list)

    # Valores
    valor_total_servico: Decimal = field(default_factory=lambda: Decimal("0"))
    valor_receber: Decimal = field(default_factory=lambda: Decimal("0"))
    valor_icms: Decimal = field(default_factory=lambda: Decimal("0"))
    valor_icms_st: Decimal = field(default_factory=lambda: Decimal("0"))

    # Veículo
    veiculo: Optional[DacteVeiculo] = None

    # Percurso
    uf_inicio: Optional[str] = None
    uf_fim: Optional[str] = None
    municipio_inicio: Optional[str] = None
    municipio_fim: Optional[str] = None

    # Metadados
    confidence_score: float = 0.0
    warnings: List[str] = field(default_factory=list)


@dataclass
class DacteExtractionResult:
    """Resultado da extração de DACTe."""

    success: bool
    data: Optional[DacteData] = None
    error: Optional[str] = None


class DacteExtractor:
    """
    Extrator de dados de DACTe.

    Uso:
        extractor = DacteExtractor()
        result = await extractor.extract_from_file("/path/to/dacte.pdf")

        if result.success:
            print(f"Chave: {result.data.chave_acesso}")
            print(f"Frete: R$ {result.data.valor_total_servico}")
    """

    def __init__(self, processor: Optional[DoclingProcessor] = None) -> None:
        """
        Inicializa o extrator.

        Args:
            processor: Processador Docling (opcional, usa singleton)
        """
        self.processor = processor or get_docling_processor()

    async def extract_from_file(self, file_path: str) -> DacteExtractionResult:
        """
        Extrai dados de arquivo DACTe PDF.

        Args:
            file_path: Caminho do arquivo PDF

        Returns:
            DacteExtractionResult com dados extraídos
        """
        logger.info("extracting_dacte", file_path=file_path)

        # Processar com Docling
        doc_result = await self.processor.process_file(file_path)

        if not doc_result.success:
            return DacteExtractionResult(
                success=False,
                error=doc_result.error,
            )

        # Extrair dados em thread separada (não bloqueia event loop)
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _get_executor(),
            self._extract_data,
            doc_result,
        )

    async def extract_from_bytes(
        self,
        content: bytes,
        filename: str = "dacte.pdf",
    ) -> DacteExtractionResult:
        """
        Extrai dados de bytes do PDF.

        Args:
            content: Bytes do arquivo PDF
            filename: Nome do arquivo para logging

        Returns:
            DacteExtractionResult com dados extraídos
        """
        logger.info("extracting_dacte_bytes", filename=filename, size=len(content))

        doc_result = await self.processor.process_bytes(content, filename)

        if not doc_result.success:
            return DacteExtractionResult(
                success=False,
                error=doc_result.error,
            )

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _get_executor(),
            self._extract_data,
            doc_result,
        )

    def _extract_data(self, doc_result: ProcessedDocument) -> DacteExtractionResult:
        """Extrai dados do documento processado (sync)."""
        text = doc_result.text
        warnings: List[str] = []

        # Extrair chave de acesso (44 dígitos, modelo 57)
        chave_acesso = self._extract_chave_acesso(text)
        if not chave_acesso:
            warnings.append("Chave de acesso não encontrada")

        # Extrair número e série
        numero, serie = self._extract_numero_serie(text)

        # Extrair CFOP
        cfop = self._extract_cfop(text)

        # Extrair emitente (transportadora)
        emitente = self._extract_emitente(text)

        # Extrair remetente e destinatário
        remetente = self._extract_participante(text, "REMETENTE")
        destinatario = self._extract_participante(text, "DESTINATÁRIO")

        # Extrair carga
        carga = self._extract_carga(text, doc_result.tables)

        # Extrair valores
        valores = self._extract_valores(text)

        # Extrair veículo
        veiculo = self._extract_veiculo(text)

        # Extrair NFes vinculadas
        nfes = self._extract_nfes_vinculadas(text)

        # Extrair percurso
        uf_inicio, uf_fim = self._extract_percurso(text)

        # Extrair data
        data_emissao = self._extract_data_emissao(text)

        # Calcular confidence
        confidence = self._calculate_confidence(
            chave_acesso,
            numero,
            emitente,
            valores.get("total"),
        )

        data = DacteData(
            chave_acesso=chave_acesso or "",
            numero=numero or "",
            serie=serie or "",
            data_emissao=data_emissao or "",
            cfop=cfop,
            emitente=emitente,
            remetente=remetente,
            destinatario=destinatario,
            carga=carga,
            nfes_vinculadas=nfes,
            valor_total_servico=valores.get("total", Decimal("0")),
            valor_receber=valores.get("receber", Decimal("0")),
            valor_icms=valores.get("icms", Decimal("0")),
            veiculo=veiculo,
            uf_inicio=uf_inicio,
            uf_fim=uf_fim,
            confidence_score=confidence,
            warnings=warnings,
        )

        logger.info(
            "dacte_extracted",
            chave=chave_acesso[:20] + "..." if chave_acesso else None,
            numero=numero,
            total=float(data.valor_total_servico),
            confidence=confidence,
        )

        return DacteExtractionResult(success=True, data=data)

    def _extract_chave_acesso(self, text: str) -> Optional[str]:
        """Extrai chave de acesso (44 dígitos, modelo 57 = CTe)."""
        patterns = [
            r"\b(\d{44})\b",
            r"CHAVE\s*(?:DE\s*)?ACESSO[:\s]*(\d[\d\s]{42,54})",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                chave = re.sub(r"\s", "", match.group(1))
                if len(chave) == 44 and chave.isdigit():
                    # CTe começa com código UF + AAMM + modelo 57
                    if chave[20:22] == "57":  # Modelo 57 = CTe
                        return chave
        return None

    def _extract_numero_serie(self, text: str) -> tuple[Optional[str], Optional[str]]:
        """Extrai número e série do CTe."""
        numero_match = re.search(r"CT-?[eE]\s*N[ºÚU°]?\s*[:.]?\s*(\d{1,9})", text)
        numero = numero_match.group(1) if numero_match else None

        serie_match = re.search(r"S[ÉE]RIE\s*[:.]?\s*(\d{1,3})", text, re.IGNORECASE)
        serie = serie_match.group(1) if serie_match else None

        return numero, serie

    def _extract_cfop(self, text: str) -> Optional[str]:
        """Extrai CFOP."""
        match = re.search(r"CFOP\s*[:.]?\s*(\d{4})", text)
        return match.group(1) if match else None

    def _extract_emitente(self, text: str) -> Optional[DacteEmitente]:
        """Extrai dados da transportadora."""
        cnpj_match = re.search(
            r"TRANSPORTADOR.*?CNPJ[:\s]*(\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2})",
            text,
            re.IGNORECASE | re.DOTALL,
        )

        if not cnpj_match:
            # Tentar padrão alternativo
            cnpj_match = re.search(
                r"CNPJ[:\s]*(\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2})",
                text[:2000],  # Primeiros 2000 chars (emitente geralmente no topo)
                re.IGNORECASE,
            )

        if not cnpj_match:
            return None

        cnpj = re.sub(r"[.\-/\s]", "", cnpj_match.group(1))

        # Tentar extrair razão social
        razao_match = re.search(
            r"(?:RAZ[ÃA]O\s*SOCIAL|NOME)[:\s]*([^\n]+)",
            text[:2000],
            re.IGNORECASE,
        )
        razao_social = razao_match.group(1).strip() if razao_match else ""

        return DacteEmitente(
            cnpj=cnpj,
            razao_social=razao_social,
        )

    def _extract_participante(
        self,
        text: str,
        tipo: str,
    ) -> Optional[DacteParticipante]:
        """Extrai dados de remetente ou destinatário."""
        # Procurar seção
        pattern = rf"{tipo}.*?(?=REMETENTE|DESTINATÁRIO|EXPEDIDOR|RECEBEDOR|DADOS|$)"
        section = re.search(pattern, text, re.IGNORECASE | re.DOTALL)

        if not section:
            return None

        section_text = section.group(0)

        # CNPJ/CPF
        doc_match = re.search(
            r"(?:CNPJ|CPF)[:\s]*(\d[\d.\-/\s]{10,18})",
            section_text,
            re.IGNORECASE,
        )

        if not doc_match:
            return None

        documento = re.sub(r"[.\-/\s]", "", doc_match.group(1))

        # Nome
        nome_match = re.search(
            r"(?:RAZ[ÃA]O\s*SOCIAL|NOME)[:\s]*([^\n]+)",
            section_text,
            re.IGNORECASE,
        )
        nome = nome_match.group(1).strip() if nome_match else ""

        return DacteParticipante(
            documento=documento,
            nome=nome,
        )

    def _extract_carga(
        self,
        text: str,
        tables: List[dict],
    ) -> Optional[DacteCarga]:
        """Extrai informações da carga."""
        carga = DacteCarga()

        # Produto predominante
        prod_match = re.search(
            r"PRODUTO\s*PREDOMINANTE[:\s]*([^\n]+)",
            text,
            re.IGNORECASE,
        )
        if prod_match:
            carga.produto_predominante = prod_match.group(1).strip()

        # Valor da carga
        valor_match = re.search(
            r"VALOR\s*(?:DA\s*)?(?:TOTAL\s*)?(?:DA\s*)?CARGA[:\s]*R?\$?\s*([\d.,]+)",
            text,
            re.IGNORECASE,
        )
        if valor_match:
            try:
                carga.valor_carga = Decimal(
                    valor_match.group(1).replace(".", "").replace(",", ".")
                )
            except Exception:
                pass

        # Peso bruto
        peso_match = re.search(
            r"PESO\s*(?:BRUTO|TOTAL)[:\s]*([\d.,]+)\s*(?:KG)?",
            text,
            re.IGNORECASE,
        )
        if peso_match:
            try:
                carga.peso_bruto = Decimal(
                    peso_match.group(1).replace(".", "").replace(",", ".")
                )
            except Exception:
                pass

        # Quantidade de volumes
        vol_match = re.search(
            r"(?:QTD|QUANTIDADE)\s*(?:DE\s*)?VOLUMES?[:\s]*(\d+)",
            text,
            re.IGNORECASE,
        )
        if vol_match:
            carga.quantidade_volumes = int(vol_match.group(1))

        return carga

    def _extract_valores(self, text: str) -> dict[str, Decimal]:
        """Extrai valores do frete."""
        valores: dict[str, Decimal] = {}

        patterns = {
            "total": r"VALOR\s*TOTAL\s*(?:DO\s*)?(?:SERVI[ÇC]O|FRETE)[:\s]*R?\$?\s*([\d.,]+)",
            "receber": r"VALOR\s*(?:A\s*)?RECEBER[:\s]*R?\$?\s*([\d.,]+)",
            "icms": r"VALOR\s*(?:DO\s*)?ICMS[:\s]*R?\$?\s*([\d.,]+)",
            "prestacao": r"VALOR\s*(?:DA\s*)?PRESTA[ÇC][ÃA]O[:\s]*R?\$?\s*([\d.,]+)",
        }

        for key, pattern in patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    valores[key] = Decimal(
                        match.group(1).replace(".", "").replace(",", ".")
                    )
                except Exception:
                    pass

        return valores

    def _extract_veiculo(self, text: str) -> Optional[DacteVeiculo]:
        """Extrai dados do veículo."""
        # Placa (formatos: ABC-1234 ou ABC1D23)
        placa_match = re.search(
            r"PLACA[:\s]*([A-Z]{3}[-\s]?\d{4}|[A-Z]{3}\d[A-Z]\d{2})",
            text,
            re.IGNORECASE,
        )

        if not placa_match:
            return None

        placa = placa_match.group(1).upper().replace("-", "").replace(" ", "")

        # UF do veículo
        uf_match = re.search(r"PLACA.*?UF[:\s]*([A-Z]{2})", text, re.IGNORECASE)
        uf = uf_match.group(1) if uf_match else None

        # RNTRC
        rntrc_match = re.search(r"RNTRC[:\s]*(\d+)", text, re.IGNORECASE)
        rntrc = rntrc_match.group(1) if rntrc_match else None

        return DacteVeiculo(
            placa=placa,
            uf=uf,
            rntrc=rntrc,
        )

    def _extract_nfes_vinculadas(self, text: str) -> List[str]:
        """Extrai chaves de NFe vinculadas."""
        nfes: List[str] = []

        # Procurar chaves de 44 dígitos que começam com modelo 55 (NFe)
        for match in re.finditer(r"\b(\d{44})\b", text):
            chave = match.group(1)
            if chave[20:22] == "55":  # Modelo 55 = NFe
                nfes.append(chave)

        return list(set(nfes))  # Remover duplicatas

    def _extract_percurso(self, text: str) -> tuple[Optional[str], Optional[str]]:
        """Extrai UF de início e fim do percurso."""
        inicio_match = re.search(
            r"(?:INÍCIO|ORIGEM|IN[IÍ]CIO\s*DA\s*PRESTA[ÇC][ÃA]O).*?UF[:\s]*([A-Z]{2})",
            text,
            re.IGNORECASE,
        )

        fim_match = re.search(
            r"(?:T[ÉE]RMINO|DESTINO|FIM\s*DA\s*PRESTA[ÇC][ÃA]O).*?UF[:\s]*([A-Z]{2})",
            text,
            re.IGNORECASE,
        )

        uf_inicio = inicio_match.group(1) if inicio_match else None
        uf_fim = fim_match.group(1) if fim_match else None

        return uf_inicio, uf_fim

    def _extract_data_emissao(self, text: str) -> Optional[str]:
        """Extrai data de emissão."""
        match = re.search(
            r"DATA\s*(?:DE\s*)?EMISS[ÃA]O[:\s]*(\d{2}[/.\-]\d{2}[/.\-]\d{2,4})",
            text,
            re.IGNORECASE,
        )
        return match.group(1) if match else None

    def _calculate_confidence(
        self,
        chave: Optional[str],
        numero: Optional[str],
        emitente: Optional[DacteEmitente],
        total: Optional[Decimal],
    ) -> float:
        """Calcula score de confiança."""
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
