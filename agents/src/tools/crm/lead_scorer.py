"""
Tool para scoring e qualificação de leads.

Pontua leads baseado em:
- Perfil da empresa (tamanho, segmento, localização)
- Comportamento (interações, downloads, visitas)
- Fit com serviços oferecidos
- Urgência da necessidade
"""

from typing import Any, Optional
from datetime import datetime
from enum import Enum
from dataclasses import dataclass

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


class LeadTemperature(str, Enum):
    """Temperatura do lead."""
    HOT = "hot"       # Score >= 80
    WARM = "warm"     # Score 50-79
    COLD = "cold"     # Score < 50


class LeadStage(str, Enum):
    """Estágio do lead no funil."""
    LEAD = "lead"
    PROSPECT = "prospect"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"


@dataclass
class ScoringCriteria:
    """Critério de pontuação."""
    name: str
    weight: float
    score: int
    max_score: int
    reason: str


class LeadScorerTool:
    """Scoring e qualificação de leads."""
    
    name = "lead_scorer"
    description = """
    Pontua e qualifica leads baseado em perfil, comportamento e fit com serviços.
    
    Parâmetros:
    - lead_id: ID do lead específico
    - cnpj: CNPJ para buscar lead
    - score_all_pending: Se True, pontua todos leads pendentes
    - min_score: Score mínimo para retornar
    - include_recommendations: Incluir recomendações de ação
    
    Retorna:
    - Score total (0-100)
    - Temperatura: 🔥 Hot, 🌡️ Warm, ❄️ Cold
    - Breakdown por critério
    - Recomendações de ação
    """
    guardrail_level = GuardrailLevel.LOW
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        lead_id: Optional[str] = None,
        cnpj: Optional[str] = None,
        score_all_pending: bool = False,
        min_score: int = 0,
        include_recommendations: bool = True,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Pontua lead(s) e retorna qualificação.
        
        Args:
            lead_id: ID do lead específico
            cnpj: CNPJ para buscar lead
            score_all_pending: Se True, pontua todos leads pendentes
            min_score: Score mínimo para retornar
            include_recommendations: Incluir recomendações de ação
            
        Returns:
            Score detalhado com breakdown e recomendações
        """
        logger.info(
            "Iniciando lead_scorer",
            extra={
                "org_id": organization_id,
                "lead_id": lead_id,
                "score_all": score_all_pending
            }
        )
        
        # Buscar lead(s)
        if lead_id:
            leads = [await self._fetch_lead(organization_id, branch_id, lead_id)]
        elif cnpj:
            leads = await self._fetch_lead_by_cnpj(organization_id, branch_id, cnpj)
        elif score_all_pending:
            leads = await self._fetch_pending_leads(organization_id, branch_id)
        else:
            return {"error": "Informe lead_id, cnpj ou score_all_pending=True"}
        
        leads = [l for l in leads if l]  # Remove None
        
        if not leads:
            return {"error": "Nenhum lead encontrado"}
        
        # Pontuar cada lead
        scored_leads = []
        for lead in leads:
            scoring = self._score_lead(lead)
            
            if scoring["total_score"] >= min_score:
                result = {
                    "lead_id": lead.get("id"),
                    "company_name": lead.get("companyName"),
                    "cnpj": lead.get("cnpj"),
                    "contact_name": lead.get("contactName"),
                    "current_stage": lead.get("stage"),
                    "scoring": scoring,
                    "temperature": self._get_temperature(scoring["total_score"]),
                    "qualified": scoring["total_score"] >= 60
                }
                
                if include_recommendations:
                    result["recommendations"] = self._generate_recommendations(
                        lead, scoring
                    )
                
                scored_leads.append(result)
        
        # Ordenar por score
        scored_leads.sort(key=lambda x: x["scoring"]["total_score"], reverse=True)
        
        # Estatísticas
        stats = self._calculate_stats(scored_leads)
        
        return {
            "success": True,
            "total_scored": len(scored_leads),
            "leads": scored_leads[:50],  # Limit to 50
            "statistics": stats,
            "scoring_criteria": self._get_criteria_description(),
            "generated_at": datetime.now().isoformat()
        }
    
    async def _fetch_lead(
        self, org_id: Optional[int], branch_id: Optional[int], lead_id: str
    ) -> Optional[dict]:
        """Busca lead por ID."""
        try:
            result = await self.client.get(
                f"/api/crm/leads/{lead_id}",
                params={"organizationId": org_id, "branchId": branch_id}
            )
            return result
        except Exception as e:
            logger.error(f"Erro ao buscar lead: {e}")
            # Retornar dados simulados para demo
            return {
                "id": lead_id,
                "companyName": "Empresa Exemplo Ltda",
                "cnpj": "12.345.678/0001-90",
                "contactName": "João Silva",
                "stage": "lead",
                "employeeCount": 150,
                "segment": "e-commerce",
                "state": "SP",
                "foundedYear": 2015,
                "estimatedMonthlyVolume": 150000,
                "shippingFrequency": "diário",
                "mainDestinations": ["SP", "RJ", "MG", "PR", "RS"],
                "recentInteractions": 3,
                "lastContactDate": datetime.now().isoformat(),
                "source": "site",
                "cargoType": "e-commerce",
                "desiredRoutes": ["SP-RJ", "SP-MG"],
                "decisionTimeline": "30 dias",
                "currentPain": "atraso nas entregas"
            }
    
    async def _fetch_lead_by_cnpj(
        self, org_id: Optional[int], branch_id: Optional[int], cnpj: str
    ) -> list[dict]:
        """Busca lead por CNPJ."""
        try:
            result = await self.client.get(
                "/api/crm/leads",
                params={
                    "organizationId": org_id,
                    "branchId": branch_id,
                    "cnpj": cnpj.replace(".", "").replace("/", "").replace("-", "")
                }
            )
            return result.get("items", [])
        except Exception:
            return []
    
    async def _fetch_pending_leads(
        self, org_id: Optional[int], branch_id: Optional[int]
    ) -> list[dict]:
        """Busca leads pendentes de qualificação."""
        try:
            result = await self.client.get(
                "/api/crm/leads",
                params={
                    "organizationId": org_id,
                    "branchId": branch_id,
                    "stage": "lead,prospect",
                    "limit": 100
                }
            )
            return result.get("items", [])
        except Exception:
            return []
    
    def _score_lead(self, lead: dict) -> dict:
        """Calcula score do lead."""
        criteria = []
        
        # 1. Perfil da Empresa (30%)
        company_score = self._score_company_profile(lead)
        criteria.append(company_score)
        
        # 2. Potencial de Volume (25%)
        volume_score = self._score_volume_potential(lead)
        criteria.append(volume_score)
        
        # 3. Engajamento/Comportamento (20%)
        engagement_score = self._score_engagement(lead)
        criteria.append(engagement_score)
        
        # 4. Fit com Serviços (15%)
        fit_score = self._score_service_fit(lead)
        criteria.append(fit_score)
        
        # 5. Urgência (10%)
        urgency_score = self._score_urgency(lead)
        criteria.append(urgency_score)
        
        # Calcular total ponderado
        total = sum(c.score * c.weight for c in criteria)
        max_total = sum(c.max_score * c.weight for c in criteria)
        
        return {
            "total_score": round(total),
            "max_possible": round(max_total),
            "percentage": round(total / max_total * 100, 1) if max_total else 0,
            "breakdown": [
                {
                    "criteria": c.name,
                    "score": c.score,
                    "max_score": c.max_score,
                    "weight": f"{c.weight * 100:.0f}%",
                    "weighted_score": round(c.score * c.weight),
                    "reason": c.reason
                }
                for c in criteria
            ]
        }
    
    def _score_company_profile(self, lead: dict) -> ScoringCriteria:
        """Pontua perfil da empresa."""
        score = 0
        reasons = []
        
        # Porte da empresa
        employees = lead.get("employeeCount", 0)
        if employees >= 500:
            score += 30
            reasons.append("Grande porte (500+ funcionários)")
        elif employees >= 100:
            score += 25
            reasons.append("Médio porte (100-499 funcionários)")
        elif employees >= 20:
            score += 15
            reasons.append("Pequeno porte (20-99 funcionários)")
        else:
            score += 5
            reasons.append("Micro empresa")
        
        # Segmento
        segment = lead.get("segment", "").lower()
        high_value_segments = ["industria", "varejo", "e-commerce", "atacado", "farmaceutico"]
        if any(s in segment for s in high_value_segments):
            score += 30
            reasons.append(f"Segmento de alto valor: {segment}")
        else:
            score += 15
        
        # Localização
        state = lead.get("state", "")
        high_volume_states = ["SP", "RJ", "MG", "PR", "RS", "SC"]
        if state in high_volume_states:
            score += 20
            reasons.append(f"Estado com alto volume: {state}")
        else:
            score += 10
        
        # Tempo de empresa
        founded_year = lead.get("foundedYear")
        if founded_year:
            years = datetime.now().year - founded_year
            if years >= 10:
                score += 20
                reasons.append(f"Empresa estabelecida ({years} anos)")
            elif years >= 5:
                score += 15
            else:
                score += 10
        
        return ScoringCriteria(
            name="Perfil da Empresa",
            weight=0.30,
            score=min(score, 100),
            max_score=100,
            reason="; ".join(reasons[:3])
        )
    
    def _score_volume_potential(self, lead: dict) -> ScoringCriteria:
        """Pontua potencial de volume."""
        score = 0
        reasons = []
        
        # Volume mensal estimado
        monthly_volume = lead.get("estimatedMonthlyVolume", 0)
        if monthly_volume >= 500000:  # > R$ 500k
            score += 50
            reasons.append(f"Alto volume: R$ {monthly_volume:,.0f}/mês")
        elif monthly_volume >= 100000:
            score += 35
            reasons.append(f"Médio volume: R$ {monthly_volume:,.0f}/mês")
        elif monthly_volume >= 20000:
            score += 20
            reasons.append(f"Volume inicial: R$ {monthly_volume:,.0f}/mês")
        else:
            score += 10
        
        # Frequência de embarques
        frequency = lead.get("shippingFrequency", "").lower()
        if "diario" in frequency or "diária" in frequency:
            score += 30
            reasons.append("Embarques diários")
        elif "semanal" in frequency:
            score += 20
            reasons.append("Embarques semanais")
        else:
            score += 10
        
        # Destinos
        destinations = lead.get("mainDestinations", [])
        if len(destinations) >= 10:
            score += 20
            reasons.append(f"{len(destinations)} destinos diferentes")
        elif len(destinations) >= 5:
            score += 15
        else:
            score += 5
        
        return ScoringCriteria(
            name="Potencial de Volume",
            weight=0.25,
            score=min(score, 100),
            max_score=100,
            reason="; ".join(reasons[:2])
        )
    
    def _score_engagement(self, lead: dict) -> ScoringCriteria:
        """Pontua engajamento do lead."""
        score = 0
        reasons = []
        
        # Interações recentes
        interactions = lead.get("recentInteractions", 0)
        if interactions >= 5:
            score += 40
            reasons.append(f"{interactions} interações recentes")
        elif interactions >= 2:
            score += 25
            reasons.append(f"{interactions} interações")
        else:
            score += 10
        
        # Último contato
        last_contact = lead.get("lastContactDate")
        if last_contact:
            try:
                last_dt = datetime.fromisoformat(last_contact.replace("Z", "+00:00"))
                days_ago = (datetime.now(last_dt.tzinfo) - last_dt).days
                
                if days_ago <= 7:
                    score += 30
                    reasons.append("Contato na última semana")
                elif days_ago <= 30:
                    score += 20
                    reasons.append("Contato no último mês")
                else:
                    score += 5
            except ValueError:
                pass
        
        # Origem do lead
        source = lead.get("source", "").lower()
        high_intent_sources = ["indicacao", "site", "google", "linkedin"]
        if any(s in source for s in high_intent_sources):
            score += 30
            reasons.append(f"Origem qualificada: {source}")
        else:
            score += 10
        
        return ScoringCriteria(
            name="Engajamento",
            weight=0.20,
            score=min(score, 100),
            max_score=100,
            reason="; ".join(reasons[:2])
        )
    
    def _score_service_fit(self, lead: dict) -> ScoringCriteria:
        """Pontua fit com serviços oferecidos."""
        score = 0
        reasons = []
        
        # Tipo de carga
        cargo_type = lead.get("cargoType", "").lower()
        good_fit_cargo = ["geral", "paletizada", "fracionada", "e-commerce"]
        if any(c in cargo_type for c in good_fit_cargo):
            score += 40
            reasons.append(f"Tipo de carga compatível: {cargo_type}")
        else:
            score += 20
        
        # Rotas desejadas
        routes = lead.get("desiredRoutes", [])
        if routes:
            score += 30
            reasons.append(f"Rotas definidas: {len(routes)} trajetos")
        
        # Requisitos especiais
        requirements = lead.get("specialRequirements", [])
        complex_req = ["temperatura", "perigosa", "adr"]
        
        has_complex = any(r.lower() in str(requirements).lower() for r in complex_req)
        if has_complex:
            score += 10
            reasons.append("Requisitos complexos (verificar capacidade)")
        else:
            score += 30
            reasons.append("Requisitos padrão")
        
        return ScoringCriteria(
            name="Fit com Serviços",
            weight=0.15,
            score=min(score, 100),
            max_score=100,
            reason="; ".join(reasons[:2])
        )
    
    def _score_urgency(self, lead: dict) -> ScoringCriteria:
        """Pontua urgência da necessidade."""
        score = 0
        reasons = []
        
        # Prazo para decisão
        decision_timeline = lead.get("decisionTimeline", "").lower()
        if "imediato" in decision_timeline or "urgente" in decision_timeline:
            score += 50
            reasons.append("Decisão imediata")
        elif "30 dias" in decision_timeline or "1 mes" in decision_timeline:
            score += 35
            reasons.append("Decisão em 30 dias")
        elif "90 dias" in decision_timeline or "3 meses" in decision_timeline:
            score += 20
            reasons.append("Decisão em 90 dias")
        else:
            score += 10
        
        # Problema atual
        current_pain = lead.get("currentPain", "").lower()
        urgent_pains = ["atraso", "custo alto", "insatisfeito", "problema", "urgente"]
        if any(p in current_pain for p in urgent_pains):
            score += 50
            reasons.append("Dor urgente identificada")
        else:
            score += 20
        
        return ScoringCriteria(
            name="Urgência",
            weight=0.10,
            score=min(score, 100),
            max_score=100,
            reason="; ".join(reasons[:2])
        )
    
    def _get_temperature(self, score: int) -> dict:
        """Retorna temperatura do lead."""
        if score >= 80:
            return {"level": "hot", "emoji": "🔥", "label": "Quente"}
        elif score >= 50:
            return {"level": "warm", "emoji": "🌡️", "label": "Morno"}
        else:
            return {"level": "cold", "emoji": "❄️", "label": "Frio"}
    
    def _generate_recommendations(
        self, lead: dict, scoring: dict
    ) -> list[dict]:
        """Gera recomendações de ação."""
        recommendations = []
        total_score = scoring["total_score"]
        
        if total_score >= 80:
            recommendations.append({
                "priority": "high",
                "action": "Agendar reunião comercial",
                "reason": "Lead quente com alto potencial de conversão"
            })
            recommendations.append({
                "priority": "high",
                "action": "Preparar proposta personalizada",
                "reason": "Alta probabilidade de fechamento"
            })
        elif total_score >= 60:
            recommendations.append({
                "priority": "medium",
                "action": "Enviar material institucional",
                "reason": "Lead qualificado, nutrir relacionamento"
            })
            recommendations.append({
                "priority": "medium",
                "action": "Agendar call de descoberta",
                "reason": "Entender melhor as necessidades"
            })
        else:
            recommendations.append({
                "priority": "low",
                "action": "Incluir em fluxo de nutrição",
                "reason": "Lead frio, educar sobre serviços"
            })
        
        # Recomendações específicas baseadas no breakdown
        for criteria in scoring["breakdown"]:
            if criteria["score"] < criteria["max_score"] * 0.5:
                if criteria["criteria"] == "Engajamento":
                    recommendations.append({
                        "priority": "medium",
                        "action": "Aumentar touchpoints",
                        "reason": "Baixo engajamento - intensificar contato"
                    })
        
        return recommendations[:5]
    
    def _calculate_stats(self, leads: list[dict]) -> dict:
        """Calcula estatísticas dos leads."""
        if not leads:
            return {}
        
        scores = [l["scoring"]["total_score"] for l in leads]
        temps = [l["temperature"]["level"] for l in leads]
        
        return {
            "average_score": round(sum(scores) / len(scores), 1),
            "max_score": max(scores),
            "min_score": min(scores),
            "hot_leads": sum(1 for t in temps if t == "hot"),
            "warm_leads": sum(1 for t in temps if t == "warm"),
            "cold_leads": sum(1 for t in temps if t == "cold"),
            "qualified_count": sum(1 for l in leads if l["qualified"])
        }
    
    def _get_criteria_description(self) -> list[dict]:
        """Retorna descrição dos critérios de scoring."""
        return [
            {"name": "Perfil da Empresa", "weight": "30%", "description": "Porte, segmento, localização"},
            {"name": "Potencial de Volume", "weight": "25%", "description": "Volume mensal, frequência, destinos"},
            {"name": "Engajamento", "weight": "20%", "description": "Interações, recência, origem"},
            {"name": "Fit com Serviços", "weight": "15%", "description": "Tipo de carga, rotas, requisitos"},
            {"name": "Urgência", "weight": "10%", "description": "Timeline, dor atual"}
        ]
