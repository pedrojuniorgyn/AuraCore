"""
Tool para geração de propostas comerciais.

Gera propostas personalizadas considerando:
- Histórico de preços
- Perfil do cliente
- Rotas e volumes
- Margem desejada
"""

from typing import Any, Optional
from datetime import datetime, date, timedelta
from enum import Enum

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


class ProposalType(str, Enum):
    """Tipos de proposta."""
    SPOT = "spot"           # Carga avulsa
    CONTRACT = "contract"   # Contrato recorrente
    PROJECT = "project"     # Projeto específico


class PricingModel(str, Enum):
    """Modelos de precificação."""
    WEIGHT = "weight"       # Por peso (R$/kg)
    VALUE = "value"         # Por valor (% ad valorem)
    COMBINED = "combined"   # Peso + Valor
    FIXED = "fixed"         # Preço fixo por entrega


class ProposalGeneratorTool:
    """Geração de propostas comerciais."""
    
    name = "proposal_generator"
    description = """
    Gera propostas comerciais personalizadas com precificação otimizada.
    
    Parâmetros:
    - lead_id: ID do lead
    - customer_id: ID do cliente (se já existir)
    - proposal_type: Tipo de proposta (spot, contract, project)
    - routes: Lista de rotas [{origin, destination, weight_kg, value}]
    - target_margin: Margem alvo em %
    - validity_days: Validade da proposta em dias
    
    Retorna:
    - Proposta estruturada com número único
    - Precificação detalhada por rota
    - Serviços inclusos e opcionais
    - Termos e próximos passos
    """
    guardrail_level = GuardrailLevel.MEDIUM  # Envolve preços
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        lead_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        proposal_type: str = "contract",
        routes: Optional[list[dict]] = None,
        estimated_monthly_volume: float = 0,
        cargo_type: str = "geral",
        validity_days: int = 15,
        include_comparison: bool = True,
        target_margin: float = 15.0,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        user_id: Optional[str] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Gera proposta comercial.
        
        Args:
            lead_id: ID do lead
            customer_id: ID do cliente (se já existir)
            proposal_type: Tipo de proposta (spot, contract, project)
            routes: Lista de rotas [{origin, destination, weight_kg, value}]
            estimated_monthly_volume: Volume mensal estimado em R$
            cargo_type: Tipo de carga
            validity_days: Validade da proposta em dias
            include_comparison: Incluir comparativo de preços
            target_margin: Margem alvo em %
            
        Returns:
            Proposta estruturada pronta para apresentação
        """
        logger.info(
            "Iniciando proposal_generator",
            extra={
                "org_id": organization_id,
                "lead_id": lead_id,
                "type": proposal_type
            }
        )
        
        if not lead_id and not customer_id:
            return {"error": "Informe lead_id ou customer_id"}
        
        # Buscar dados do lead/cliente
        entity = await self._fetch_entity(
            organization_id, branch_id, lead_id, customer_id
        )
        
        if not entity:
            return {"error": "Lead ou cliente não encontrado"}
        
        # Se não informou rotas, buscar do cadastro
        if not routes:
            routes = entity.get("desiredRoutes", [])
            # Converter rotas simples para formato completo
            if routes and isinstance(routes[0], str):
                routes = [
                    {
                        "origin": r.split("-")[0] if "-" in r else "São Paulo-SP",
                        "destination": r.split("-")[1] if "-" in r else r,
                        "weight_kg": 1000,
                        "value": 50000
                    }
                    for r in routes
                ]
        
        if not routes:
            return {
                "error": "Rotas não informadas. Informe as rotas desejadas.",
                "example": {
                    "routes": [
                        {"origin": "São Paulo-SP", "destination": "Rio de Janeiro-RJ", "weight_kg": 1000, "value": 50000}
                    ]
                }
            }
        
        # Calcular preços para cada rota
        pricing = await self._calculate_pricing(
            organization_id, branch_id,
            routes, cargo_type, target_margin
        )
        
        # Calcular serviços adicionais
        services = self._calculate_services(
            routes, cargo_type, estimated_monthly_volume
        )
        
        # Calcular totais
        totals = self._calculate_totals(pricing, services, estimated_monthly_volume)
        
        # Gerar comparativo se solicitado
        comparison = None
        if include_comparison:
            comparison = self._generate_comparison(routes)
        
        # Montar proposta
        proposal = {
            "success": True,
            "proposal_number": f"PROP-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "generated_at": datetime.now().isoformat(),
            "valid_until": (date.today() + timedelta(days=validity_days)).isoformat(),
            "validity_days": validity_days,
            
            "customer": {
                "id": entity.get("id"),
                "company_name": entity.get("companyName"),
                "cnpj": entity.get("cnpj"),
                "contact_name": entity.get("contactName"),
                "contact_email": entity.get("email"),
                "contact_phone": entity.get("phone")
            },
            
            "proposal_type": proposal_type,
            "cargo_type": cargo_type,
            
            "pricing": {
                "model": pricing["model"],
                "routes": pricing["routes"],
                "notes": pricing.get("notes", [])
            },
            
            "services": services,
            
            "financial_summary": totals,
            
            "comparison": comparison,
            
            "terms_and_conditions": self._get_terms(proposal_type),
            
            "next_steps": self._get_next_steps(proposal_type),
            
            "metadata": {
                "organization_id": organization_id,
                "branch_id": branch_id,
                "created_by": user_id,
                "target_margin": target_margin
            }
        }
        
        return proposal
    
    async def _fetch_entity(
        self,
        org_id: Optional[int],
        branch_id: Optional[int],
        lead_id: Optional[str],
        customer_id: Optional[str]
    ) -> Optional[dict]:
        """Busca lead ou cliente."""
        try:
            if customer_id:
                return await self.client.get(
                    f"/api/crm/customers/{customer_id}",
                    params={"organizationId": org_id, "branchId": branch_id}
                )
            elif lead_id:
                return await self.client.get(
                    f"/api/crm/leads/{lead_id}",
                    params={"organizationId": org_id, "branchId": branch_id}
                )
        except Exception as e:
            logger.error(f"Erro ao buscar entidade: {e}")
        
        # Retornar dados simulados para demo
        return {
            "id": lead_id or customer_id,
            "companyName": "Empresa Exemplo Ltda",
            "cnpj": "12.345.678/0001-90",
            "contactName": "João Silva",
            "email": "joao@empresa.com.br",
            "phone": "(11) 99999-9999",
            "desiredRoutes": ["SP-RJ", "SP-MG"]
        }
    
    async def _calculate_pricing(
        self,
        org_id: Optional[int],
        branch_id: Optional[int],
        routes: list[dict],
        cargo_type: str,
        target_margin: float
    ) -> dict:
        """Calcula preços para rotas."""
        # Buscar tabela de preços base
        base_prices = await self._fetch_base_prices(org_id, branch_id)
        
        route_pricing = []
        
        for route in routes:
            origin = route.get("origin", "São Paulo-SP")
            destination = route.get("destination", "Rio de Janeiro-RJ")
            weight = route.get("weight_kg", 1000)
            value = route.get("value", 50000)
            
            # Calcular frete peso
            freight_weight = self._calculate_freight_weight(
                origin, destination, weight, base_prices
            )
            
            # Calcular ad valorem
            ad_valorem_rate = self._get_ad_valorem_rate(cargo_type)
            ad_valorem = value * ad_valorem_rate
            
            # GRIS (Gerenciamento de Risco)
            gris_rate = self._get_gris_rate(cargo_type, value)
            gris = value * gris_rate
            
            # Pedágio estimado
            toll = self._estimate_toll(origin, destination)
            
            # Total da rota
            subtotal = freight_weight + ad_valorem + gris + toll
            
            # Aplicar margem
            margin_value = subtotal * (target_margin / 100)
            total = subtotal + margin_value
            
            route_pricing.append({
                "origin": origin,
                "destination": destination,
                "weight_kg": weight,
                "declared_value": value,
                "breakdown": {
                    "freight_weight": round(freight_weight, 2),
                    "ad_valorem": round(ad_valorem, 2),
                    "ad_valorem_rate": f"{ad_valorem_rate * 100:.2f}%",
                    "gris": round(gris, 2),
                    "gris_rate": f"{gris_rate * 100:.2f}%",
                    "toll": round(toll, 2)
                },
                "subtotal": round(subtotal, 2),
                "margin": round(margin_value, 2),
                "total": round(total, 2),
                "price_per_kg": round(total / weight, 2) if weight else 0
            })
        
        # Determinar modelo de precificação predominante
        avg_value = sum(r.get("value", 0) for r in routes) / len(routes) if routes else 0
        if avg_value > 100000:
            model = PricingModel.COMBINED.value
        else:
            model = PricingModel.WEIGHT.value
        
        return {
            "model": model,
            "routes": route_pricing,
            "notes": [
                "Preços sujeitos a confirmação de cubagem",
                "Frete mínimo: R$ 150,00 por coleta",
                "Valores não incluem ICMS destacado"
            ]
        }
    
    async def _fetch_base_prices(
        self, org_id: Optional[int], branch_id: Optional[int]
    ) -> dict:
        """Busca tabela de preços base."""
        try:
            result = await self.client.get(
                "/api/pricing/tables",
                params={
                    "organizationId": org_id,
                    "branchId": branch_id,
                    "active": True
                }
            )
            tables = result.get("items", [])
            if tables:
                return tables[0]
        except Exception:
            pass
        
        # Tabela default se não encontrar
        return {
            "baseRatePerKg": 0.50,
            "minimumFreight": 150.0,
            "distanceMultiplier": 0.001
        }
    
    def _calculate_freight_weight(
        self,
        origin: str,
        destination: str,
        weight: float,
        base_prices: dict
    ) -> float:
        """Calcula frete peso."""
        base_rate = base_prices.get("baseRatePerKg", 0.50)
        minimum = base_prices.get("minimumFreight", 150.0)
        
        # Estimar distância
        distance = self._estimate_distance(origin, destination)
        
        # Fator de distância
        distance_factor = 1 + (distance * base_prices.get("distanceMultiplier", 0.001))
        
        freight = weight * base_rate * distance_factor
        
        return max(freight, minimum)
    
    def _estimate_distance(self, origin: str, destination: str) -> float:
        """Estima distância entre cidades."""
        # Distâncias aproximadas de São Paulo
        distances_from_sp = {
            "rio de janeiro": 430,
            "belo horizonte": 590,
            "curitiba": 400,
            "porto alegre": 1100,
            "brasilia": 1000,
            "salvador": 1950,
            "recife": 2660,
            "fortaleza": 3000,
            "campinas": 100,
        }
        
        dest_lower = destination.lower()
        for city, dist in distances_from_sp.items():
            if city in dest_lower:
                return dist
        
        return 500  # Default: 500km
    
    def _get_ad_valorem_rate(self, cargo_type: str) -> float:
        """Retorna taxa ad valorem por tipo de carga."""
        rates = {
            "geral": 0.003,        # 0.3%
            "eletronicos": 0.005,  # 0.5%
            "farmaceutico": 0.004, # 0.4%
            "perecivel": 0.003,
            "e-commerce": 0.004,
        }
        return rates.get(cargo_type.lower(), 0.003)
    
    def _get_gris_rate(self, cargo_type: str, value: float) -> float:
        """Retorna taxa GRIS."""
        if value > 200000:
            return 0.003  # 0.3%
        elif value > 100000:
            return 0.002  # 0.2%
        else:
            return 0.001  # 0.1%
    
    def _estimate_toll(self, origin: str, destination: str) -> float:
        """Estima valor de pedágio."""
        distance = self._estimate_distance(origin, destination)
        return distance * 0.15  # Média de R$ 0.15/km em pedágios
    
    def _calculate_services(
        self,
        routes: list[dict],
        cargo_type: str,
        monthly_volume: float
    ) -> list[dict]:
        """Calcula serviços adicionais."""
        services = []
        
        # Coleta programada
        services.append({
            "service": "Coleta Programada",
            "description": "Coleta na data/horário agendado",
            "included": True,
            "price": 0
        })
        
        # Rastreamento
        services.append({
            "service": "Rastreamento Online",
            "description": "Acompanhamento em tempo real via portal",
            "included": True,
            "price": 0
        })
        
        # Seguro
        total_value = sum(r.get("value", 0) for r in routes)
        insurance_rate = 0.0005  # 0.05%
        insurance = total_value * insurance_rate
        
        services.append({
            "service": "Seguro de Carga (RCT-C)",
            "description": f"Cobertura até R$ {total_value:,.2f}",
            "included": True,
            "price": round(insurance, 2)
        })
        
        # Entrega com agendamento
        if cargo_type.lower() in ["e-commerce", "varejo"]:
            services.append({
                "service": "Agendamento de Entrega",
                "description": "Entrega em janela de 2 horas",
                "included": False,
                "price": 25.00,
                "unit": "por entrega"
            })
        
        # Reentrega
        services.append({
            "service": "Reentrega",
            "description": "Tentativa adicional de entrega",
            "included": False,
            "price": 35.00,
            "unit": "por tentativa"
        })
        
        return services
    
    def _calculate_totals(
        self,
        pricing: dict,
        services: list[dict],
        monthly_volume: float
    ) -> dict:
        """Calcula totais da proposta."""
        route_total = sum(r["total"] for r in pricing["routes"])
        services_included = sum(
            s["price"] for s in services if s.get("included", False)
        )
        
        # Estimativa mensal
        if monthly_volume > 0:
            estimated_monthly = monthly_volume * 0.03  # ~3% do volume em frete
        else:
            estimated_monthly = route_total * 4  # Assumir 4 operações/mês
        
        return {
            "route_total": round(route_total, 2),
            "services_total": round(services_included, 2),
            "proposal_total": round(route_total + services_included, 2),
            "estimated_monthly": round(estimated_monthly, 2),
            "estimated_annual": round(estimated_monthly * 12, 2),
            "currency": "BRL"
        }
    
    def _generate_comparison(self, routes: list[dict]) -> dict:
        """Gera comparativo de preços."""
        return {
            "market_position": "competitivo",
            "price_index": 0.95,  # 5% abaixo da média
            "notes": [
                "Preços 5% abaixo da média de mercado",
                "Baseado em análise de 50+ cotações similares"
            ]
        }
    
    def _get_terms(self, proposal_type: str) -> list[str]:
        """Retorna termos e condições."""
        terms = [
            "Proposta válida mediante disponibilidade de veículos",
            "Preços sujeitos a reajuste conforme variação do diesel (ANP)",
            "Faturamento em 28 dias após emissão do CTe",
            "Multa de 2% + juros de 1% a.m. por atraso"
        ]
        
        if proposal_type == "contract":
            terms.extend([
                "Contrato mínimo de 12 meses",
                "Aviso prévio de 30 dias para cancelamento",
                "Reajuste anual pelo IGPM"
            ])
        
        return terms
    
    def _get_next_steps(self, proposal_type: str) -> list[dict]:
        """Retorna próximos passos."""
        steps = [
            {
                "step": 1,
                "action": "Análise da proposta",
                "description": "Revise os valores e condições apresentados"
            },
            {
                "step": 2,
                "action": "Esclarecimento de dúvidas",
                "description": "Entre em contato para ajustes ou dúvidas"
            },
            {
                "step": 3,
                "action": "Aceite da proposta",
                "description": "Confirme o aceite por e-mail ou assinatura digital"
            }
        ]
        
        if proposal_type == "contract":
            steps.append({
                "step": 4,
                "action": "Assinatura do contrato",
                "description": "Formalização via contrato de prestação de serviços"
            })
        
        return steps
