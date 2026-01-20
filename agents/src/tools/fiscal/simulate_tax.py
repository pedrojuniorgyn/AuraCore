"""
Tool para simular carga tributária.

Compara cenário atual com Reforma Tributária 2026.
"""

from typing import Any, Dict

import structlog

logger = structlog.get_logger()


class SimulateTaxTool:
    """
    Simula carga tributária atual vs Reforma Tributária 2026.
    
    Útil para planejamento tributário e análise de impacto.
    """
    
    name = "simulate_tax"
    description = """
    Simula a carga tributária de uma operação, comparando:
    - Cenário atual (ICMS + PIS/COFINS)
    - Cenário Reforma 2026 (IBS + CBS em transição)
    - Cenário 2033 (Reforma concluída, só IBS + CBS)
    
    Parâmetros:
    - valor_operacao: Valor da prestação (R$)
    - uf_origem: UF de origem
    - uf_destino: UF de destino
    
    Útil para:
    - Planejamento tributário
    - Análise de impacto da reforma
    - Precificação de serviços
    - Decisões estratégicas
    """
    
    # Alíquotas Sul/Sudeste
    SUL_SUDESTE = {"SP", "RJ", "MG", "PR", "RS", "SC"}
    
    def _get_aliquota_icms(self, uf_origem: str, uf_destino: str) -> float:
        """Retorna alíquota ICMS."""
        is_interestadual = uf_origem.upper() != uf_destino.upper()
        
        if not is_interestadual:
            return 18.0  # Média interna
        
        origem_sul_sudeste = uf_origem.upper() in self.SUL_SUDESTE
        destino_sul_sudeste = uf_destino.upper() in self.SUL_SUDESTE
        
        if origem_sul_sudeste and not destino_sul_sudeste:
            return 7.0
        return 12.0
    
    async def run(
        self,
        valor_operacao: float,
        uf_origem: str,
        uf_destino: str,
    ) -> Dict[str, Any]:
        """
        Executa simulação tributária.
        
        Args:
            valor_operacao: Valor da prestação
            uf_origem: UF de origem
            uf_destino: UF de destino
            
        Returns:
            Comparativo de cenários tributários
        """
        
        uf_origem = uf_origem.upper().strip()
        uf_destino = uf_destino.upper().strip()
        is_interestadual = uf_origem != uf_destino
        
        logger.info(
            "Simulating tax scenarios",
            valor=valor_operacao,
            uf_origem=uf_origem,
            uf_destino=uf_destino,
        )
        
        # =====================================================================
        # CENÁRIO ATUAL
        # =====================================================================
        aliquota_icms = self._get_aliquota_icms(uf_origem, uf_destino)
        icms_atual = valor_operacao * (aliquota_icms / 100)
        
        # PIS/COFINS (regime não-cumulativo)
        pis_atual = valor_operacao * 0.0165  # 1.65%
        cofins_atual = valor_operacao * 0.076  # 7.6%
        
        total_atual = icms_atual + pis_atual + cofins_atual
        carga_atual = (total_atual / valor_operacao) * 100
        
        # =====================================================================
        # CENÁRIO 2026 (TRANSIÇÃO - EC 132/23)
        # =====================================================================
        # Em 2026: IBS 0.1%, CBS 0.9% + ICMS 100% + PIS/COFINS 100%
        ibs_2026 = valor_operacao * 0.001  # 0.1%
        cbs_2026 = valor_operacao * 0.009  # 0.9%
        
        # ICMS e PIS/COFINS ainda 100% vigentes
        icms_2026 = icms_atual
        pis_cofins_2026 = pis_atual + cofins_atual
        
        total_2026 = ibs_2026 + cbs_2026 + icms_2026 + pis_cofins_2026
        carga_2026 = (total_2026 / valor_operacao) * 100
        
        # =====================================================================
        # CENÁRIO 2033 (REFORMA CONCLUÍDA)
        # =====================================================================
        # Alíquota de referência IBS: ~25.45%
        # Alíquota de referência CBS: ~8.8%
        # (valores sujeitos a ajuste pela lei complementar)
        
        aliquota_ibs_ref = 25.45 / 100
        aliquota_cbs_ref = 8.8 / 100
        
        # IVA-Dual completo
        ibs_2033 = valor_operacao * aliquota_ibs_ref
        cbs_2033 = valor_operacao * aliquota_cbs_ref
        
        total_2033 = ibs_2033 + cbs_2033
        carga_2033 = (total_2033 / valor_operacao) * 100
        
        # =====================================================================
        # COMPARATIVO
        # =====================================================================
        diferenca_2033_vs_atual = total_2033 - total_atual
        variacao_percentual = ((total_2033 - total_atual) / total_atual) * 100
        
        # Análise qualitativa
        if abs(variacao_percentual) < 5:
            conclusao = "Carga tributária similar após reforma (~±5%)"
            impacto = "NEUTRO"
        elif variacao_percentual > 0:
            conclusao = f"Aumento de {variacao_percentual:.1f}% na carga tributária"
            impacto = "NEGATIVO"
        else:
            conclusao = f"Redução de {abs(variacao_percentual):.1f}% na carga tributária"
            impacto = "POSITIVO"
        
        return {
            "success": True,
            "valor_operacao": valor_operacao,
            "uf_origem": uf_origem,
            "uf_destino": uf_destino,
            "tipo_operacao": "interestadual" if is_interestadual else "interna",
            
            "cenario_atual": {
                "descricao": "Sistema tributário vigente",
                "icms": round(icms_atual, 2),
                "aliquota_icms": aliquota_icms,
                "pis": round(pis_atual, 2),
                "cofins": round(cofins_atual, 2),
                "total": round(total_atual, 2),
                "carga_percentual": round(carga_atual, 2),
                "base_legal": "LC 87/96, Leis 10.637/02 e 10.833/03",
            },
            
            "cenario_2026": {
                "descricao": "Início da transição (EC 132/23)",
                "icms": round(icms_2026, 2),
                "pis_cofins": round(pis_cofins_2026, 2),
                "ibs": round(ibs_2026, 2),
                "cbs": round(cbs_2026, 2),
                "total": round(total_2026, 2),
                "carga_percentual": round(carga_2026, 2),
                "nota": "IBS 0.1% + CBS 0.9% + tributos atuais 100%",
            },
            
            "cenario_2033": {
                "descricao": "Reforma concluída",
                "ibs": round(ibs_2033, 2),
                "aliquota_ibs": round(aliquota_ibs_ref * 100, 2),
                "cbs": round(cbs_2033, 2),
                "aliquota_cbs": round(aliquota_cbs_ref * 100, 2),
                "total": round(total_2033, 2),
                "carga_percentual": round(carga_2033, 2),
                "nota": "Apenas IBS + CBS (ICMS e PIS/COFINS extintos)",
            },
            
            "comparativo": {
                "diferenca_2033_vs_atual": round(diferenca_2033_vs_atual, 2),
                "variacao_percentual": round(variacao_percentual, 2),
                "impacto": impacto,
                "conclusao": conclusao,
            },
            
            "observacoes": [
                "Alíquotas do IBS/CBS são de referência e podem ser ajustadas",
                "O período de transição vai de 2026 a 2032",
                "Créditos serão mantidos integralmente no novo sistema",
                "Consulte contador para análise detalhada do seu caso",
            ],
            
            "base_legal": {
                "atual": "LC 87/96 (ICMS), Leis 10.637/02 e 10.833/03 (PIS/COFINS)",
                "reforma": "EC 132/2023 (Reforma Tributária)",
            },
        }
