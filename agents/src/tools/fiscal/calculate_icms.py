"""
Tool para calcular ICMS de operações de transporte.

Implementa regras de alíquotas interestaduais e internas.
"""

from typing import Any, Dict, List, Literal

import structlog

logger = structlog.get_logger()


class CalculateICMSTool:
    """
    Calcula ICMS para operações de transporte de carga.
    
    Considera:
    - Alíquotas interestaduais (7% ou 12%)
    - Alíquotas internas por estado
    - Benefícios fiscais quando aplicável
    - DIFAL para consumidor final
    """
    
    name = "calculate_icms"
    description = """
    Calcula o ICMS para operações de transporte de carga.
    
    Parâmetros:
    - valor_operacao: Valor da prestação de serviço (R$)
    - uf_origem: UF de origem (ex: SP)
    - uf_destino: UF de destino (ex: RJ)
    - tipo_operacao: Tipo da operação (transporte_carga, transporte_passageiros)
    - tem_beneficio_fiscal: Se há redução de base de cálculo
    
    Retorna:
    - Valor do ICMS
    - Alíquota aplicada
    - Base de cálculo
    - CFOP sugerido
    - CST aplicável
    - Base legal
    - Raciocínio passo a passo
    
    IMPORTANTE: Use este tool para TODOS os cálculos de ICMS.
    Nunca calcule manualmente.
    """
    
    # Estados do Sul/Sudeste (exceto ES)
    SUL_SUDESTE = {"SP", "RJ", "MG", "PR", "RS", "SC"}
    
    # Alíquotas internas por estado (2024)
    ALIQUOTAS_INTERNAS = {
        "AC": 19.0, "AL": 19.0, "AP": 18.0, "AM": 20.0,
        "BA": 20.5, "CE": 20.0, "DF": 20.0, "ES": 17.0,
        "GO": 19.0, "MA": 22.0, "MT": 17.0, "MS": 17.0,
        "MG": 18.0, "PA": 19.0, "PB": 20.0, "PR": 19.5,
        "PE": 20.5, "PI": 21.0, "RJ": 22.0, "RN": 20.0,
        "RS": 17.0, "RO": 19.5, "RR": 20.0, "SC": 17.0,
        "SP": 18.0, "SE": 19.0, "TO": 20.0,
    }
    
    def _get_aliquota_interestadual(self, uf_origem: str, uf_destino: str) -> float:
        """
        Retorna a alíquota interestadual conforme Resolução SF 22/89.
        
        Regras:
        - Sul/Sudeste (exceto ES) → Norte/Nordeste/Centro-Oeste/ES: 7%
        - Demais combinações: 12%
        """
        origem = uf_origem.upper()
        destino = uf_destino.upper()
        
        origem_sul_sudeste = origem in self.SUL_SUDESTE
        destino_sul_sudeste = destino in self.SUL_SUDESTE
        
        # Sul/Sudeste para outras regiões: 7%
        if origem_sul_sudeste and not destino_sul_sudeste:
            return 7.0
        
        # Todas as outras combinações: 12%
        return 12.0
    
    async def run(
        self,
        valor_operacao: float,
        uf_origem: str,
        uf_destino: str,
        tipo_operacao: Literal["transporte_carga", "transporte_passageiros"] = "transporte_carga",
        tem_beneficio_fiscal: bool = False,
        percentual_reducao: float = 0.0,
    ) -> Dict[str, Any]:
        """
        Executa o cálculo de ICMS.
        
        Args:
            valor_operacao: Valor da prestação
            uf_origem: UF de origem
            uf_destino: UF de destino
            tipo_operacao: Tipo da operação
            tem_beneficio_fiscal: Se há benefício fiscal
            percentual_reducao: Percentual de redução da base (0-100)
            
        Returns:
            Detalhamento completo do cálculo
        """
        
        uf_origem = uf_origem.upper().strip()
        uf_destino = uf_destino.upper().strip()
        
        # Validar UFs
        todas_ufs = set(self.ALIQUOTAS_INTERNAS.keys())
        if uf_origem not in todas_ufs:
            return {"error": f"UF de origem inválida: {uf_origem}"}
        if uf_destino not in todas_ufs:
            return {"error": f"UF de destino inválida: {uf_destino}"}
        
        reasoning: List[str] = []
        
        # 1. Identificar tipo de operação
        is_interestadual = uf_origem != uf_destino
        tipo_op = "INTERESTADUAL" if is_interestadual else "INTERNA"
        reasoning.append(
            f"1. Operação {tipo_op}: {uf_origem} → {uf_destino}"
        )
        
        # 2. Determinar alíquota
        if is_interestadual:
            aliquota = self._get_aliquota_interestadual(uf_origem, uf_destino)
            base_legal = "LC 87/96, Art. 155 II CF/88, Resolução SF 22/89"
            
            # Explicar regra aplicada
            if aliquota == 7.0:
                reasoning.append(
                    f"2. Alíquota interestadual: {aliquota}% "
                    f"(Sul/Sudeste → outras regiões)"
                )
            else:
                reasoning.append(
                    f"2. Alíquota interestadual: {aliquota}% "
                    f"(regra geral)"
                )
        else:
            aliquota = self.ALIQUOTAS_INTERNAS.get(uf_origem, 18.0)
            base_legal = f"RICMS-{uf_origem}"
            reasoning.append(f"2. Alíquota interna {uf_origem}: {aliquota}%")
        
        # 3. Base de cálculo
        base_calculo = valor_operacao
        if tem_beneficio_fiscal and percentual_reducao > 0:
            fator_reducao = 1 - (percentual_reducao / 100)
            base_calculo = valor_operacao * fator_reducao
            reasoning.append(
                f"3. Base de cálculo com redução de {percentual_reducao}%: "
                f"R$ {valor_operacao:,.2f} × {fator_reducao:.2f} = R$ {base_calculo:,.2f}"
            )
        else:
            reasoning.append(f"3. Base de cálculo integral: R$ {base_calculo:,.2f}")
        
        # 4. Calcular ICMS
        icms = base_calculo * (aliquota / 100)
        reasoning.append(
            f"4. ICMS = R$ {base_calculo:,.2f} × {aliquota}% = R$ {icms:,.2f}"
        )
        
        # 5. CFOP sugerido
        if is_interestadual:
            cfop = "6.353" if tipo_operacao == "transporte_carga" else "6.352"
            cfop_desc = "Prestação interestadual de transporte"
        else:
            cfop = "5.353" if tipo_operacao == "transporte_carga" else "5.352"
            cfop_desc = "Prestação interna de transporte"
        reasoning.append(f"5. CFOP sugerido: {cfop} ({cfop_desc})")
        
        # 6. CST
        cst = "00" if not tem_beneficio_fiscal else "20"
        cst_desc = "Tributação normal" if cst == "00" else "Com redução de base"
        reasoning.append(f"6. CST: {cst} ({cst_desc})")
        
        logger.info(
            "ICMS calculated",
            valor_operacao=valor_operacao,
            uf_origem=uf_origem,
            uf_destino=uf_destino,
            icms=icms,
            aliquota=aliquota,
        )
        
        return {
            "success": True,
            "icms_valor": round(icms, 2),
            "aliquota": aliquota,
            "base_calculo": round(base_calculo, 2),
            "valor_operacao": valor_operacao,
            "uf_origem": uf_origem,
            "uf_destino": uf_destino,
            "tipo_operacao": tipo_op.lower(),
            "cfop_sugerido": cfop,
            "cfop_descricao": cfop_desc,
            "cst": cst,
            "cst_descricao": cst_desc,
            "base_legal": base_legal,
            "reasoning": reasoning,
            "observacoes": [
                "Verifique se há convênio específico entre os estados",
                "Consulte a matriz tributária para casos especiais",
                "Para operações com DIFAL, consulte o destino",
            ],
        }
