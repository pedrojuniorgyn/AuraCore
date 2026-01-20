"""
Tool: Maintenance Scheduler
Agendamento e controle de manutenções de veículos.

Risk Level: MEDIUM (cria/cancela agendamentos)

Tipos de Manutenção:
- PREVENTIVE: Baseada em km ou tempo (troca de óleo, filtros, etc.)
- CORRECTIVE: Reparo de falhas/defeitos
- PREDICTIVE: Baseada em análise de dados/sensores
"""

from typing import Any, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal
from dataclasses import dataclass

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


@dataclass
class MaintenanceItem:
    """Item de manutenção."""
    service_type: str
    description: str
    estimated_cost: Decimal
    estimated_hours: float
    priority: str
    parts_needed: list[str]


@dataclass
class MaintenanceAlert:
    """Alerta de manutenção."""
    vehicle_id: int
    vehicle_plate: str
    alert_type: str  # KM_BASED, TIME_BASED, CONDITION_BASED
    service_type: str
    description: str
    due_date: Optional[date]
    due_km: Optional[int]
    current_km: Optional[int]
    days_overdue: int
    km_overdue: int
    priority: str


class MaintenanceSchedulerTool:
    """Agendamento e controle de manutenções de veículos."""
    
    name = "maintenance_scheduler"
    description = """
    Gerencia agendamento de manutenções de veículos.
    
    Ações disponíveis:
    - schedule: Agendar nova manutenção
    - cancel: Cancelar manutenção agendada
    - reschedule: Reagendar manutenção existente
    - list_pending: Listar manutenções pendentes
    - check_alerts: Verificar alertas baseados em km/tempo
    
    Parâmetros:
    - action: Ação a executar
    - vehicle_id: ID do veículo (para schedule/reschedule)
    - maintenance_type: PREVENTIVE, CORRECTIVE, PREDICTIVE
    - scheduled_date: Data agendada
    - items: Lista de serviços com custo e prioridade
    - maintenance_id: ID da manutenção (para cancel/reschedule)
    - days_ahead: Dias à frente para buscar (list_pending/check_alerts)
    
    Retorna:
    - maintenance_id se agendado com sucesso
    - Lista de manutenções pendentes
    - Alertas de manutenção com prioridade
    """
    guardrail_level = GuardrailLevel.MEDIUM
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        action: str,
        vehicle_id: Optional[int] = None,
        maintenance_type: Optional[str] = None,
        scheduled_date: Optional[str] = None,
        items: Optional[list[dict]] = None,
        mechanic_id: Optional[int] = None,
        notes: Optional[str] = None,
        maintenance_id: Optional[str] = None,
        cancel_reason: Optional[str] = None,
        days_ahead: int = 30,
        include_overdue: bool = True,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Gerencia agendamento de manutenções.
        
        Args:
            action: schedule, cancel, reschedule, list_pending, check_alerts
            vehicle_id: ID do veículo
            maintenance_type: PREVENTIVE, CORRECTIVE, PREDICTIVE
            scheduled_date: Data agendada (YYYY-MM-DD)
            items: Lista de serviços
            maintenance_id: ID da manutenção existente
            days_ahead: Dias à frente para buscar
            
        Returns:
            Resultado da operação
        """
        logger.info(
            "Iniciando maintenance_scheduler",
            extra={
                "org_id": organization_id,
                "branch_id": branch_id,
                "action": action,
                "vehicle_id": vehicle_id
            }
        )
        
        valid_actions = ["schedule", "cancel", "reschedule", "list_pending", "check_alerts"]
        if action not in valid_actions:
            return {"success": False, "error": f"Ação inválida. Use: {', '.join(valid_actions)}"}
        
        if action == "schedule":
            return await self._schedule_maintenance(
                vehicle_id, maintenance_type, scheduled_date, items, 
                mechanic_id, notes, organization_id, branch_id
            )
        elif action == "cancel":
            return await self._cancel_maintenance(maintenance_id, cancel_reason)
        elif action == "reschedule":
            return await self._reschedule_maintenance(maintenance_id, scheduled_date)
        elif action == "list_pending":
            return await self._list_pending_maintenances(
                organization_id, branch_id, days_ahead, include_overdue
            )
        elif action == "check_alerts":
            return await self._check_maintenance_alerts(organization_id, branch_id)
        
        return {"success": False, "error": "Ação não implementada"}
    
    async def _schedule_maintenance(
        self,
        vehicle_id: Optional[int],
        maintenance_type: Optional[str],
        scheduled_date: Optional[str],
        items: Optional[list[dict]],
        mechanic_id: Optional[int],
        notes: Optional[str],
        org_id: Optional[int],
        branch_id: Optional[int]
    ) -> dict[str, Any]:
        """Agenda nova manutenção."""
        warnings = []
        
        # Validações
        if not vehicle_id:
            return {"success": False, "error": "vehicle_id é obrigatório para agendar manutenção"}
        
        if not scheduled_date:
            return {"success": False, "error": "scheduled_date é obrigatório"}
        
        if not items or len(items) == 0:
            return {"success": False, "error": "Pelo menos um item de manutenção é obrigatório"}
        
        # Parse date
        try:
            parsed_date = date.fromisoformat(scheduled_date)
        except ValueError:
            return {"success": False, "error": f"Data inválida: {scheduled_date}. Use formato YYYY-MM-DD"}
        
        # Verificar se data é no passado
        if parsed_date < date.today():
            warnings.append("Data agendada está no passado")
        
        # Calcular totais
        total_cost = sum(Decimal(str(item.get("estimated_cost", 0))) for item in items)
        total_hours = sum(float(item.get("estimated_hours", 1)) for item in items)
        
        # Verificar se há itens urgentes
        urgent_items = [i for i in items if i.get("priority") == "URGENT"]
        if urgent_items and parsed_date > date.today() + timedelta(days=3):
            warnings.append(f"{len(urgent_items)} item(s) urgente(s) agendado(s) para mais de 3 dias")
        
        # Gerar ID da manutenção
        maintenance_id = f"MAINT-{datetime.now().strftime('%Y%m%d%H%M%S')}-{vehicle_id}"
        
        logger.info(
            "maintenance_scheduled",
            maintenance_id=maintenance_id,
            vehicle_id=vehicle_id,
            scheduled_date=scheduled_date,
            items_count=len(items),
            total_cost=float(total_cost)
        )
        
        return {
            "success": True,
            "action": "schedule",
            "maintenance_id": maintenance_id,
            "vehicle_id": vehicle_id,
            "maintenance_type": maintenance_type or "PREVENTIVE",
            "scheduled_date": scheduled_date,
            "items_count": len(items),
            "total_estimated_cost": float(total_cost),
            "total_estimated_hours": total_hours,
            "warnings": warnings,
            "message": f"Manutenção {maintenance_id} agendada para {scheduled_date}"
        }
    
    async def _cancel_maintenance(
        self, maintenance_id: Optional[str], cancel_reason: Optional[str]
    ) -> dict[str, Any]:
        """Cancela manutenção agendada."""
        if not maintenance_id:
            return {"success": False, "error": "maintenance_id é obrigatório para cancelar"}
        
        logger.info(
            "maintenance_cancelled",
            maintenance_id=maintenance_id,
            reason=cancel_reason
        )
        
        return {
            "success": True,
            "action": "cancel",
            "maintenance_id": maintenance_id,
            "cancel_reason": cancel_reason,
            "message": f"Manutenção {maintenance_id} cancelada"
        }
    
    async def _reschedule_maintenance(
        self, maintenance_id: Optional[str], scheduled_date: Optional[str]
    ) -> dict[str, Any]:
        """Reagenda manutenção existente."""
        if not maintenance_id:
            return {"success": False, "error": "maintenance_id é obrigatório para reagendar"}
        
        if not scheduled_date:
            return {"success": False, "error": "scheduled_date é obrigatório para reagendar"}
        
        logger.info(
            "maintenance_rescheduled",
            maintenance_id=maintenance_id,
            new_date=scheduled_date
        )
        
        return {
            "success": True,
            "action": "reschedule",
            "maintenance_id": maintenance_id,
            "scheduled_date": scheduled_date,
            "message": f"Manutenção {maintenance_id} reagendada para {scheduled_date}"
        }
    
    async def _list_pending_maintenances(
        self,
        org_id: Optional[int],
        branch_id: Optional[int],
        days_ahead: int,
        include_overdue: bool
    ) -> dict[str, Any]:
        """Lista manutenções pendentes."""
        # Simulação de dados
        pending = [
            {
                "maintenance_id": "MAINT-20250115-001",
                "vehicle_id": 1,
                "vehicle_plate": "ABC-1234",
                "vehicle_model": "Volvo FH 540",
                "maintenance_type": "PREVENTIVE",
                "scheduled_date": "2025-01-25",
                "items": ["Troca de óleo", "Filtro de ar"],
                "status": "SCHEDULED",
                "estimated_cost": 450.00,
                "priority": "NORMAL"
            },
            {
                "maintenance_id": "MAINT-20250110-002",
                "vehicle_id": 2,
                "vehicle_plate": "DEF-5678",
                "vehicle_model": "Scania R450",
                "maintenance_type": "CORRECTIVE",
                "scheduled_date": "2025-01-18",
                "items": ["Reparo freios"],
                "status": "OVERDUE",
                "estimated_cost": 1200.00,
                "priority": "HIGH"
            },
            {
                "maintenance_id": "MAINT-20250120-003",
                "vehicle_id": 3,
                "vehicle_plate": "GHI-9012",
                "vehicle_model": "Mercedes Actros",
                "maintenance_type": "PREVENTIVE",
                "scheduled_date": "2025-02-01",
                "items": ["Revisão geral", "Troca de pneus"],
                "status": "SCHEDULED",
                "estimated_cost": 3500.00,
                "priority": "NORMAL"
            },
        ]
        
        overdue = [p for p in pending if p["status"] == "OVERDUE"]
        
        return {
            "success": True,
            "action": "list_pending",
            "pending_maintenances": pending,
            "total_pending": len(pending),
            "total_overdue": len(overdue),
            "total_estimated_cost": sum(p["estimated_cost"] for p in pending),
            "message": f"Encontradas {len(pending)} manutenções pendentes ({len(overdue)} atrasadas)"
        }
    
    async def _check_maintenance_alerts(
        self, org_id: Optional[int], branch_id: Optional[int]
    ) -> dict[str, Any]:
        """Verifica alertas de manutenção baseados em km/tempo."""
        # Simulação de alertas
        alerts = [
            {
                "vehicle_id": 1,
                "vehicle_plate": "ABC-1234",
                "alert_type": "KM_BASED",
                "service_type": "OIL_CHANGE",
                "description": "Troca de óleo vencida por quilometragem",
                "due_km": 45000,
                "current_km": 46500,
                "km_overdue": 1500,
                "priority": "HIGH"
            },
            {
                "vehicle_id": 2,
                "vehicle_plate": "DEF-5678",
                "alert_type": "TIME_BASED",
                "service_type": "TIRE_ROTATION",
                "description": "Rodízio de pneus - 6 meses",
                "due_date": "2025-01-10",
                "days_overdue": 10,
                "priority": "NORMAL"
            },
            {
                "vehicle_id": 3,
                "vehicle_plate": "GHI-9012",
                "alert_type": "KM_BASED",
                "service_type": "BRAKE_CHECK",
                "description": "Revisão de freios próxima",
                "due_km": 60000,
                "current_km": 58500,
                "km_overdue": 0,
                "priority": "LOW"
            },
        ]
        
        critical = [a for a in alerts if a["priority"] in ["HIGH", "URGENT"]]
        
        logger.info(
            "maintenance_alerts_checked",
            total_alerts=len(alerts),
            critical_alerts=len(critical)
        )
        
        return {
            "success": True,
            "action": "check_alerts",
            "alerts": alerts,
            "total_alerts": len(alerts),
            "critical_alerts": len(critical),
            "message": f"Encontrados {len(alerts)} alertas ({len(critical)} críticos)"
        }
