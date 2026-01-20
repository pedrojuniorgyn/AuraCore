"""
Tool: War Room
Gestão de crises e situações críticas.

Risk Level: HIGH (cria/gerencia situações críticas)

Tipos de Crise:
- OPERATIONAL: Falhas operacionais (veículos, entregas)
- FINANCIAL: Problemas financeiros (caixa, inadimplência)
- COMMERCIAL: Perda de clientes, contratos
- REGULATORY: Problemas fiscais, legais
- REPUTATIONAL: Crise de imagem
"""

from typing import Any, Optional
from datetime import datetime

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


class WarRoomTool:
    """Gestão de crises e situações críticas."""
    
    name = "war_room"
    description = """
    Gerencia situações de crise que requerem ação imediata.
    
    Níveis de Severidade:
    - CRITICAL: Impacto imediato e significativo no negócio
    - HIGH: Impacto considerável, ação em até 24h
    - MEDIUM: Impacto moderado, ação em até 48h
    
    Tipos de Crise:
    - OPERATIONAL: Falhas operacionais
    - FINANCIAL: Problemas financeiros
    - COMMERCIAL: Perda de clientes/contratos
    - REGULATORY: Problemas fiscais/legais
    - REPUTATIONAL: Crise de imagem
    
    Ações:
    - create: Abrir nova situação de crise
    - update: Atualizar status/ações
    - list: Listar crises ativas
    - detail: Detalhes de uma crise
    - close: Encerrar crise
    - escalate: Escalar para nível superior
    
    Parâmetros:
    - action: create, update, list, detail, close, escalate
    - crisis_id: ID da crise
    - title: Título da crise (create)
    - description: Descrição detalhada
    - severity: CRITICAL, HIGH, MEDIUM
    - crisis_type: OPERATIONAL, FINANCIAL, etc.
    - actions: Lista de ações tomadas/planejadas
    
    Retorna:
    - ID da crise
    - Status e ações
    - Responsáveis e prazos
    """
    guardrail_level = GuardrailLevel.HIGH
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        action: str,
        crisis_id: Optional[str] = None,
        title: Optional[str] = None,
        description: Optional[str] = None,
        severity: Optional[str] = None,
        crisis_type: Optional[str] = None,
        impact: Optional[str] = None,
        actions_taken: Optional[list[dict]] = None,
        next_steps: Optional[list[dict]] = None,
        resolution: Optional[str] = None,
        lessons_learned: Optional[str] = None,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Gerencia situações de crise.
        
        Args:
            action: create, update, list, detail, close, escalate
            crisis_id: ID da crise
            title: Título
            description: Descrição
            severity: Nível de severidade
            crisis_type: Tipo de crise
            
        Returns:
            Status da crise
        """
        logger.info(
            "Iniciando war_room",
            extra={
                "org_id": organization_id,
                "branch_id": branch_id,
                "action": action,
                "severity": severity
            }
        )
        
        valid_actions = ["create", "update", "list", "detail", "close", "escalate"]
        if action not in valid_actions:
            return {"success": False, "error": f"Ação inválida. Use: {', '.join(valid_actions)}"}
        
        if action == "create":
            return await self._create_crisis(title, description, severity, crisis_type, impact)
        elif action == "update":
            return await self._update_crisis(crisis_id, actions_taken, next_steps)
        elif action == "list":
            return await self._list_crises()
        elif action == "detail":
            return await self._get_crisis_detail(crisis_id)
        elif action == "close":
            return await self._close_crisis(crisis_id, resolution, lessons_learned)
        elif action == "escalate":
            return await self._escalate_crisis(crisis_id)
        
        return {"success": False, "error": "Ação não implementada"}
    
    async def _create_crisis(
        self,
        title: Optional[str],
        description: Optional[str],
        severity: Optional[str],
        crisis_type: Optional[str],
        impact: Optional[str]
    ) -> dict[str, Any]:
        """Abre nova situação de crise."""
        if not title:
            return {"success": False, "error": "title é obrigatório"}
        if not description:
            return {"success": False, "error": "description é obrigatório"}
        
        valid_severities = ["CRITICAL", "HIGH", "MEDIUM"]
        if severity and severity.upper() not in valid_severities:
            return {"success": False, "error": f"severity inválida. Use: {', '.join(valid_severities)}"}
        
        valid_types = ["OPERATIONAL", "FINANCIAL", "COMMERCIAL", "REGULATORY", "REPUTATIONAL"]
        if crisis_type and crisis_type.upper() not in valid_types:
            return {"success": False, "error": f"crisis_type inválido. Use: {', '.join(valid_types)}"}
        
        crisis_id = f"WAR-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        severity = (severity or "HIGH").upper()
        crisis_type = (crisis_type or "OPERATIONAL").upper()
        
        crisis = {
            "id": crisis_id,
            "title": title,
            "description": description,
            "severity": severity,
            "type": crisis_type,
            "impact": impact,
            "status": "active",
            "created_at": datetime.now().isoformat(),
            "commander": "A definir",
            "stakeholders": [],
            "actions": [],
            "updates": []
        }
        
        logger.warning(
            "crisis_created",
            crisis_id=crisis_id,
            title=title,
            severity=severity,
            crisis_type=crisis_type
        )
        
        # Notificações baseadas em severidade
        notifications = []
        if severity == "CRITICAL":
            notifications = [
                "🚨 CEO notificado",
                "🚨 Diretoria convocada",
                "🚨 War Room virtual criada",
            ]
        elif severity == "HIGH":
            notifications = [
                "📢 Gerência notificada",
                "📢 Equipe de crise acionada",
            ]
        
        return {
            "success": True,
            "action": "create",
            "crisis_id": crisis_id,
            "crisis": crisis,
            "notifications": notifications,
            "message": f"🚨 CRISE {severity} ABERTA: {title}"
        }
    
    async def _update_crisis(
        self,
        crisis_id: Optional[str],
        actions_taken: Optional[list[dict]],
        next_steps: Optional[list[dict]]
    ) -> dict[str, Any]:
        """Atualiza status e ações da crise."""
        if not crisis_id:
            return {"success": False, "error": "crisis_id é obrigatório"}
        
        update = {
            "crisis_id": crisis_id,
            "timestamp": datetime.now().isoformat(),
            "actions_taken": actions_taken or [],
            "next_steps": next_steps or []
        }
        
        logger.info("crisis_updated", crisis_id=crisis_id)
        
        return {
            "success": True,
            "action": "update",
            "crisis_id": crisis_id,
            "update": update,
            "message": f"Crise {crisis_id} atualizada com {len(actions_taken or [])} ações"
        }
    
    async def _list_crises(self) -> dict[str, Any]:
        """Lista crises ativas."""
        # Simulação de dados
        crises = [
            {
                "id": "WAR-20250119001",
                "title": "Falha no sistema de rastreamento",
                "severity": "CRITICAL",
                "type": "OPERATIONAL",
                "status": "active",
                "created_at": "2025-01-19T14:30:00",
                "commander": "João Silva",
                "age_hours": 8,
                "last_update": "2025-01-19T22:00:00"
            },
            {
                "id": "WAR-20250118002",
                "title": "Cliente estratégico ameaça cancelar",
                "severity": "HIGH",
                "type": "COMMERCIAL",
                "status": "active",
                "created_at": "2025-01-18T10:00:00",
                "commander": "Maria Santos",
                "age_hours": 36,
                "last_update": "2025-01-19T18:00:00"
            },
            {
                "id": "WAR-20250115003",
                "title": "Autuação fiscal - ICMS",
                "severity": "HIGH",
                "type": "REGULATORY",
                "status": "monitoring",
                "created_at": "2025-01-15T09:00:00",
                "commander": "Carlos Souza",
                "age_hours": 110,
                "last_update": "2025-01-19T16:00:00"
            },
        ]
        
        critical = len([c for c in crises if c["severity"] == "CRITICAL"])
        high = len([c for c in crises if c["severity"] == "HIGH"])
        
        return {
            "success": True,
            "action": "list",
            "crises": crises,
            "summary": {
                "total": len(crises),
                "critical": critical,
                "high": high,
                "active": len([c for c in crises if c["status"] == "active"]),
                "monitoring": len([c for c in crises if c["status"] == "monitoring"])
            },
            "message": f"Crises ativas: {len(crises)} (🔴{critical} críticas, 🟠{high} altas)"
        }
    
    async def _get_crisis_detail(self, crisis_id: Optional[str]) -> dict[str, Any]:
        """Detalhes de uma crise."""
        if not crisis_id:
            return {"success": False, "error": "crisis_id é obrigatório"}
        
        # Simulação
        crisis = {
            "id": crisis_id,
            "title": "Falha no sistema de rastreamento",
            "description": "Sistema de rastreamento GPS parou de receber sinais de 80% da frota às 14:30",
            "severity": "CRITICAL",
            "type": "OPERATIONAL",
            "status": "active",
            "created_at": "2025-01-19T14:30:00",
            "impact": {
                "vehicles_affected": 45,
                "deliveries_at_risk": 120,
                "estimated_loss": "R$ 50.000",
                "customers_affected": 85
            },
            "commander": {
                "name": "João Silva",
                "role": "Diretor de Operações",
                "phone": "+55 11 99999-0001"
            },
            "team": [
                {"name": "Pedro TI", "role": "Lead Técnico", "status": "assigned"},
                {"name": "Ana Ops", "role": "Coordenadora", "status": "assigned"},
                {"name": "Carlos Frota", "role": "Supervisor Frota", "status": "assigned"},
            ],
            "timeline": [
                {"time": "14:30", "event": "Problema identificado - alertas de veículos offline"},
                {"time": "14:35", "event": "War Room aberta - equipe convocada"},
                {"time": "15:00", "event": "Causa raiz identificada - falha no servidor de telemetria"},
                {"time": "16:00", "event": "Plano de ação definido - restart dos serviços"},
                {"time": "17:30", "event": "50% da frota reconectada"},
                {"time": "22:00", "event": "85% da frota reconectada - monitoramento contínuo"},
            ],
            "actions_completed": [
                {"action": "Reiniciar servidor de telemetria", "status": "completed", "owner": "TI"},
                {"action": "Contato manual com motoristas críticos", "status": "completed", "owner": "Operações"},
                {"action": "Comunicado aos clientes afetados", "status": "completed", "owner": "CS"},
            ],
            "next_steps": [
                {"action": "Reconectar 15% restante", "deadline": "2025-01-20T06:00:00", "owner": "TI"},
                {"action": "Análise de causa raiz definitiva", "deadline": "2025-01-20T12:00:00", "owner": "TI"},
                {"action": "Plano de contingência", "deadline": "2025-01-21T18:00:00", "owner": "Operações"},
            ],
            "metrics": {
                "time_to_detect": "5 min",
                "time_to_respond": "30 min",
                "resolution_progress": 85
            }
        }
        
        return {
            "success": True,
            "action": "detail",
            "crisis": crisis,
            "message": f"Crise {crisis_id}: {crisis['metrics']['resolution_progress']}% resolvido"
        }
    
    async def _close_crisis(
        self,
        crisis_id: Optional[str],
        resolution: Optional[str],
        lessons_learned: Optional[str]
    ) -> dict[str, Any]:
        """Encerra uma crise."""
        if not crisis_id:
            return {"success": False, "error": "crisis_id é obrigatório"}
        if not resolution:
            return {"success": False, "error": "resolution é obrigatória para encerrar"}
        
        closure = {
            "crisis_id": crisis_id,
            "closed_at": datetime.now().isoformat(),
            "resolution": resolution,
            "lessons_learned": lessons_learned,
            "status": "closed",
            "post_mortem_required": True
        }
        
        logger.info("crisis_closed", crisis_id=crisis_id)
        
        return {
            "success": True,
            "action": "close",
            "closure": closure,
            "message": f"Crise {crisis_id} ENCERRADA. Post-mortem agendado."
        }
    
    async def _escalate_crisis(self, crisis_id: Optional[str]) -> dict[str, Any]:
        """Escala crise para nível superior."""
        if not crisis_id:
            return {"success": False, "error": "crisis_id é obrigatório"}
        
        escalation = {
            "crisis_id": crisis_id,
            "escalated_at": datetime.now().isoformat(),
            "previous_level": "HIGH",
            "new_level": "CRITICAL",
            "notifications": [
                "🚨 CEO notificado por SMS",
                "🚨 Diretoria convocada para reunião emergencial",
                "🚨 War Room física ativada",
                "🚨 Comunicação externa preparada",
            ]
        }
        
        logger.warning("crisis_escalated", crisis_id=crisis_id)
        
        return {
            "success": True,
            "action": "escalate",
            "escalation": escalation,
            "message": f"🚨 Crise {crisis_id} ESCALADA para CRITICAL"
        }
