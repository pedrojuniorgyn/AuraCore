"""
Tool: Document Importer
Importa documentos fiscais (DANFe, DACTe) de PDFs usando Docling.

Risk Level: MEDIUM (extrai e pode criar registros no sistema)

Docling é uma biblioteca da IBM para extração de dados de PDFs
com alta precisão em tabelas (97.9%).
"""

import base64
from typing import Any, Optional

from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger, get_observability
from src.services.document_processing import (
    DanfeExtractor,
    DacteExtractor,
    get_docling_processor,
)

logger = get_logger(__name__)
obs = get_observability()


class DocumentImporterTool:
    """Importa documentos fiscais de PDFs usando Docling."""
    
    name = "document_importer"
    description = """
    Importa documentos fiscais de PDFs usando Docling.
    
    Suporta:
    - DANFe (Nota Fiscal Eletrônica)
    - DACTe (Conhecimento de Transporte) [em desenvolvimento]
    
    O Docling extrai com alta precisão:
    - Chave de acesso (44 dígitos)
    - Dados do emitente e destinatário (CNPJ, nome)
    - Valores e impostos (total, ICMS, IPI)
    - Itens/produtos (tabelas)
    
    Parâmetros:
    - document_type: "danfe", "dacte" ou "auto" (default: auto)
    - file_path: Caminho do arquivo PDF local
    - file_base64: Conteúdo do PDF em base64 (alternativa)
    - validate_sefaz: Validar chave na SEFAZ (default: True)
    - create_record: Criar registro no sistema (default: False)
    - dry_run: Apenas extrair sem criar registro (default: True)
    
    Retorna:
    - Dados extraídos do documento
    - Score de confiança da extração
    - Warnings sobre dados não encontrados
    """
    guardrail_level = GuardrailLevel.MEDIUM
    
    def __init__(self):
        self.processor = get_docling_processor()
        self.danfe_extractor = DanfeExtractor(self.processor)
        self.dacte_extractor = DacteExtractor(self.processor)
    
    async def run(
        self,
        document_type: str = "auto",
        file_path: Optional[str] = None,
        file_base64: Optional[str] = None,
        file_url: Optional[str] = None,
        validate_sefaz: bool = True,
        create_record: bool = False,
        dry_run: bool = True,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Importa documento fiscal de PDF.
        
        Args:
            document_type: Tipo do documento (danfe, dacte, auto)
            file_path: Caminho do arquivo PDF
            file_base64: Conteúdo em base64
            file_url: URL do arquivo (não suportado ainda)
            validate_sefaz: Validar na SEFAZ
            create_record: Criar registro no sistema
            dry_run: Modo de teste (apenas extrai)
            
        Returns:
            Dados extraídos e status da operação
        """
        logger.info(
            "document_importer_called",
            extra={
                "org_id": organization_id,
                "branch_id": branch_id,
                "document_type": document_type,
                "dry_run": dry_run
            }
        )
        
        errors: list[str] = []
        warnings: list[str] = []
        
        # Validar input
        if not any([file_path, file_base64, file_url]):
            return {
                "success": False,
                "errors": ["Forneça file_path, file_base64 ou file_url"],
                "message": "Nenhuma fonte de documento fornecida"
            }
        
        # Decodificar base64 se fornecido
        file_content: Optional[bytes] = None
        filename = "document.pdf"
        
        if file_base64:
            try:
                file_content = base64.b64decode(file_base64)
            except Exception as e:
                return {
                    "success": False,
                    "errors": [f"Erro ao decodificar base64: {e}"],
                    "message": "Base64 inválido"
                }
        
        # URL não suportada ainda
        if file_url and not file_path and not file_content:
            return {
                "success": False,
                "errors": ["URL não suportada ainda"],
                "message": "Use file_path ou file_base64"
            }
        
        try:
            # Extrair dados baseado no tipo
            if document_type in ["danfe", "auto"]:
                if file_content:
                    result = await self.danfe_extractor.extract_from_bytes(file_content, filename)
                elif file_path:
                    result = await self.danfe_extractor.extract_from_file(file_path)
                else:
                    return {
                        "success": False,
                        "errors": ["Nenhum conteúdo de arquivo fornecido"],
                        "message": "Forneça file_path ou file_base64"
                    }
                
                if not result.success:
                    return {
                        "success": False,
                        "errors": [result.error or "Erro na extração"],
                        "message": "Falha ao extrair dados do documento"
                    }
                
                data = result.data
                if data:
                    warnings.extend(data.warnings)
                    
                    # Formatar output
                    extracted = {
                        "document_type": "NFE",
                        "access_key": data.chave_acesso,
                        "number": data.numero,
                        "series": data.serie,
                        "issue_date": data.data_emissao,
                        "issuer_document": data.emitente.cnpj if data.emitente else None,
                        "issuer_name": data.emitente.razao_social if data.emitente else None,
                        "recipient_document": data.destinatario.documento if data.destinatario else None,
                        "recipient_name": data.destinatario.nome if data.destinatario else None,
                        "total_products": float(data.valor_produtos),
                        "total_value": float(data.valor_total),
                        "icms_value": float(data.icms_valor),
                        "items_count": len(data.itens),
                        "items": [
                            {
                                "codigo": item.codigo,
                                "descricao": item.descricao,
                                "quantidade": float(item.quantidade),
                                "valor_total": float(item.valor_total)
                            }
                            for item in data.itens[:10]  # Limitar a 10 itens
                        ],
                        "confidence_score": data.confidence_score,
                        "warnings": data.warnings
                    }
                    
                    # Validar na SEFAZ (simulado por enquanto)
                    sefaz_valid = None
                    sefaz_status = None
                    
                    if validate_sefaz and data.chave_acesso:
                        # Integração real com SEFAZ será implementada
                        sefaz_valid = True
                        sefaz_status = "Autorizada (simulado)"
                        warnings.append("Validação SEFAZ simulada - integração real pendente")
                    
                    # Criar registro (se solicitado e não dry_run)
                    created_id = None
                    if create_record and not dry_run:
                        # Integração com API do AuraCore será implementada
                        created_id = None
                        warnings.append("Criação de registro não implementada ainda")
                    
                    chave_preview = data.chave_acesso[:20] + "..." if data.chave_acesso else "N/A"
                    
                    # Registrar métrica de sucesso
                    obs.record_document_import("danfe", "success")
                    
                    return {
                        "success": True,
                        "extracted_data": extracted,
                        "created_record_id": created_id,
                        "sefaz_valid": sefaz_valid,
                        "sefaz_status": sefaz_status,
                        "warnings": warnings,
                        "message": f"DANFe extraída. Chave: {chave_preview} Confiança: {data.confidence_score:.0%}"
                    }
            
            elif document_type == "dacte":
                # Extrair DACTe
                if file_content:
                    result = await self.dacte_extractor.extract_from_bytes(file_content, filename)
                elif file_path:
                    result = await self.dacte_extractor.extract_from_file(file_path)
                else:
                    return {
                        "success": False,
                        "errors": ["Nenhum conteúdo de arquivo fornecido"],
                        "message": "Forneça file_path ou file_base64"
                    }
                
                if not result.success:
                    return {
                        "success": False,
                        "errors": [result.error or "Erro na extração"],
                        "message": "Falha ao extrair dados do DACTe"
                    }
                
                data = result.data
                if data:
                    warnings.extend(data.warnings)
                    
                    # Formatar output para DACTe/CTe
                    extracted = {
                        "document_type": "CTE",
                        "access_key": data.chave_acesso,
                        "number": data.numero,
                        "series": data.serie,
                        "issue_date": data.data_emissao,
                        "cfop": data.cfop,
                        "modal": data.modal,
                        "issuer_document": data.emitente.cnpj if data.emitente else None,
                        "issuer_name": data.emitente.razao_social if data.emitente else None,
                        "sender_document": data.remetente.documento if data.remetente else None,
                        "sender_name": data.remetente.nome if data.remetente else None,
                        "recipient_document": data.destinatario.documento if data.destinatario else None,
                        "recipient_name": data.destinatario.nome if data.destinatario else None,
                        "cargo_value": float(data.carga.valor_carga) if data.carga else None,
                        "cargo_weight": float(data.carga.peso_bruto) if data.carga else None,
                        "total_value": float(data.valor_total_servico),
                        "icms_value": float(data.valor_icms),
                        "linked_nfes": data.nfes_vinculadas[:10],  # Limitar a 10
                        "linked_nfes_count": len(data.nfes_vinculadas),
                        "vehicle_plate": data.veiculo.placa if data.veiculo else None,
                        "route_start_uf": data.uf_inicio,
                        "route_end_uf": data.uf_fim,
                        "confidence_score": data.confidence_score,
                        "warnings": data.warnings
                    }
                    
                    # Validar na SEFAZ (simulado)
                    sefaz_valid = None
                    sefaz_status = None
                    
                    if validate_sefaz and data.chave_acesso:
                        sefaz_valid = True
                        sefaz_status = "Autorizada (simulado)"
                        warnings.append("Validação SEFAZ simulada - integração real pendente")
                    
                    chave_preview = data.chave_acesso[:20] + "..." if data.chave_acesso else "N/A"
                    
                    # Registrar métrica de sucesso
                    obs.record_document_import("dacte", "success")
                    
                    return {
                        "success": True,
                        "extracted_data": extracted,
                        "created_record_id": None,
                        "sefaz_valid": sefaz_valid,
                        "sefaz_status": sefaz_status,
                        "warnings": warnings,
                        "message": f"DACTe extraído. Chave: {chave_preview} Confiança: {data.confidence_score:.0%}"
                    }
            
            else:
                return {
                    "success": False,
                    "errors": [f"Tipo de documento não suportado: {document_type}"],
                    "message": "Use danfe ou dacte"
                }
                
        except Exception as e:
            logger.error("document_import_error", extra={"error": str(e)})
            # Registrar métrica de erro
            obs.record_document_import(document_type, "error")
            return {
                "success": False,
                "errors": [str(e)],
                "message": "Erro ao processar documento"
            }
