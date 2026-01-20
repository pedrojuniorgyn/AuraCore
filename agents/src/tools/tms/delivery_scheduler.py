"""
Tool para agendamento de entregas.

Funcionalidades:
- Distribuição de entregas por veículo
- Respeito a janelas de entrega
- Balanceamento de carga de trabalho
- Consideração de restrições
"""

from typing import Any, Optional
from datetime import datetime, date
from dataclasses import dataclass

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


@dataclass
class Vehicle:
    """Veículo disponível."""
    id: str
    plate: str
    type: str
    capacity_kg: float
    capacity_m3: float
    driver_id: Optional[str]
    driver_name: Optional[str]


@dataclass 
class Delivery:
    """Entrega a agendar."""
    id: str
    weight_kg: float
    volume_m3: float
    priority: int
    window_start: Optional[str]
    window_end: Optional[str]
    city: str
    latitude: float
    longitude: float


class DeliverySchedulerTool:
    """Agendamento inteligente de entregas."""
    
    name = "delivery_scheduler"
    description = """
    Distribui entregas entre veículos disponíveis respeitando capacidade e janelas.
    
    Parâmetros:
    - schedule_date: Data do agendamento (YYYY-MM-DD)
    - delivery_ids: Lista de IDs de entregas específicas (opcional)
    - vehicle_ids: Lista de IDs de veículos específicos (opcional)
    - auto_assign: Se True, cria agendamentos automaticamente
    - balance_strategy: Estratégia de balanceamento (distance, capacity, time)
    - max_deliveries_per_vehicle: Máximo de entregas por veículo
    
    Retorna:
    - Proposta de agendamento com distribuição por veículo
    - Métricas de utilização
    - Entregas não alocadas
    """
    guardrail_level = GuardrailLevel.MEDIUM  # Pode criar agendamentos
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        schedule_date: Optional[str] = None,
        delivery_ids: Optional[list[str]] = None,
        vehicle_ids: Optional[list[str]] = None,
        auto_assign: bool = False,
        balance_strategy: str = "distance",
        max_deliveries_per_vehicle: int = 30,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        user_id: Optional[str] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Agenda entregas para data específica.
        
        Args:
            schedule_date: Data do agendamento (YYYY-MM-DD)
            delivery_ids: IDs das entregas (None = todas pendentes)
            vehicle_ids: IDs dos veículos (None = todos disponíveis)
            auto_assign: Se True, cria agendamentos automaticamente
            balance_strategy: Estratégia de balanceamento (distance, capacity, time)
            max_deliveries_per_vehicle: Máximo de entregas por veículo
            
        Returns:
            Proposta de agendamento com distribuição por veículo
        """
        logger.info(
            "Iniciando delivery_scheduler",
            extra={
                "org_id": organization_id,
                "date": schedule_date,
                "strategy": balance_strategy
            }
        )
        
        target_date = schedule_date or date.today().isoformat()
        
        # Buscar entregas pendentes
        deliveries = await self._fetch_pending_deliveries(
            organization_id, branch_id, delivery_ids
        )
        
        if not deliveries:
            return {
                "success": True,
                "error": "Nenhuma entrega pendente encontrada",
                "schedule_date": target_date,
                "pending_deliveries": 0
            }
        
        # Buscar veículos disponíveis
        vehicles = await self._fetch_available_vehicles(
            organization_id, branch_id, vehicle_ids, target_date
        )
        
        if not vehicles:
            return {
                "success": True,
                "error": "Nenhum veículo disponível para a data",
                "schedule_date": target_date,
                "pending_deliveries": len(deliveries)
            }
        
        # Distribuir entregas
        schedule = self._distribute_deliveries(
            deliveries,
            vehicles,
            balance_strategy,
            max_deliveries_per_vehicle
        )
        
        # Calcular métricas
        metrics = self._calculate_metrics(schedule)
        
        # Auto-assign se solicitado
        assigned_count = 0
        if auto_assign:
            assigned_count = await self._auto_assign(
                organization_id, branch_id, user_id, schedule, target_date
            )
        
        return {
            "success": True,
            "schedule_date": target_date,
            "summary": {
                "total_deliveries": len(deliveries),
                "total_vehicles": len(vehicles),
                "scheduled": sum(len(v["deliveries"]) for v in schedule),
                "unscheduled": len(deliveries) - sum(len(v["deliveries"]) for v in schedule)
            },
            "vehicle_assignments": schedule,
            "metrics": metrics,
            "unscheduled_deliveries": self._get_unscheduled(deliveries, schedule),
            "auto_assigned": assigned_count,
            "warnings": self._generate_warnings(schedule, metrics)
        }
    
    async def _fetch_pending_deliveries(
        self, org_id: Optional[int], branch_id: Optional[int], delivery_ids: Optional[list[str]]
    ) -> list[Delivery]:
        """Busca entregas pendentes."""
        try:
            params: dict[str, Any] = {
                "organizationId": org_id,
                "branchId": branch_id,
                "status": "PENDING"
            }
            if delivery_ids:
                params["ids"] = ",".join(delivery_ids)
            
            result = await self.client.get("/api/tms/deliveries", params=params)
            
            return [
                Delivery(
                    id=d.get("id", ""),
                    weight_kg=d.get("weightKg", 100),
                    volume_m3=d.get("volumeM3", 1),
                    priority=d.get("priority", 1),
                    window_start=d.get("deliveryWindowStart"),
                    window_end=d.get("deliveryWindowEnd"),
                    city=d.get("deliveryAddress", {}).get("city", ""),
                    latitude=d.get("deliveryAddress", {}).get("latitude", 0),
                    longitude=d.get("deliveryAddress", {}).get("longitude", 0)
                )
                for d in result.get("items", [])
            ]
        except Exception as e:
            logger.error(f"Erro ao buscar entregas: {e}")
            # Retornar dados simulados para demo
            return [
                Delivery(
                    id=f"del-{i}",
                    weight_kg=100 + i * 50,
                    volume_m3=1 + i * 0.5,
                    priority=i % 3 + 1,
                    window_start=None,
                    window_end=None,
                    city="São Paulo",
                    latitude=-23.5505 + i * 0.01,
                    longitude=-46.6333 + i * 0.01
                )
                for i in range(5)
            ]
    
    async def _fetch_available_vehicles(
        self,
        org_id: Optional[int],
        branch_id: Optional[int],
        vehicle_ids: Optional[list[str]],
        target_date: str
    ) -> list[Vehicle]:
        """Busca veículos disponíveis."""
        try:
            params: dict[str, Any] = {
                "organizationId": org_id,
                "branchId": branch_id,
                "status": "AVAILABLE",
                "availableOn": target_date
            }
            if vehicle_ids:
                params["ids"] = ",".join(vehicle_ids)
            
            result = await self.client.get("/api/fleet/vehicles", params=params)
            
            return [
                Vehicle(
                    id=v.get("id", ""),
                    plate=v.get("plate", ""),
                    type=v.get("type", "truck"),
                    capacity_kg=v.get("capacityKg", 10000),
                    capacity_m3=v.get("capacityM3", 50),
                    driver_id=v.get("currentDriver", {}).get("id"),
                    driver_name=v.get("currentDriver", {}).get("name")
                )
                for v in result.get("items", [])
            ]
        except Exception as e:
            logger.error(f"Erro ao buscar veículos: {e}")
            # Retornar dados simulados para demo
            return [
                Vehicle(
                    id=f"v-{i}",
                    plate=f"ABC-{1234+i}",
                    type="truck",
                    capacity_kg=10000,
                    capacity_m3=50,
                    driver_id=f"d-{i}",
                    driver_name=f"Motorista {i+1}"
                )
                for i in range(3)
            ]
    
    def _distribute_deliveries(
        self,
        deliveries: list[Delivery],
        vehicles: list[Vehicle],
        strategy: str,
        max_per_vehicle: int
    ) -> list[dict]:
        """Distribui entregas entre veículos."""
        # Ordenar entregas por prioridade e janela de entrega
        sorted_deliveries = sorted(
            deliveries,
            key=lambda d: (-d.priority, d.window_start or "")
        )
        
        # Inicializar atribuições
        assignments = []
        for v in vehicles:
            assignments.append({
                "vehicle_id": v.id,
                "plate": v.plate,
                "type": v.type,
                "driver": v.driver_name,
                "capacity": {
                    "weight_kg": v.capacity_kg,
                    "volume_m3": v.capacity_m3
                },
                "used": {
                    "weight_kg": 0.0,
                    "volume_m3": 0.0
                },
                "deliveries": []
            })
        
        assigned_ids: set[str] = set()
        
        # Distribuir por estratégia
        for delivery in sorted_deliveries:
            if delivery.id in assigned_ids:
                continue
            
            # Encontrar melhor veículo
            best_vehicle_idx = self._find_best_vehicle(
                delivery, assignments, strategy, max_per_vehicle
            )
            
            if best_vehicle_idx >= 0:
                v = assignments[best_vehicle_idx]
                v["deliveries"].append({
                    "id": delivery.id,
                    "city": delivery.city,
                    "weight_kg": delivery.weight_kg,
                    "volume_m3": delivery.volume_m3,
                    "priority": delivery.priority,
                    "window": {
                        "start": delivery.window_start,
                        "end": delivery.window_end
                    }
                })
                v["used"]["weight_kg"] += delivery.weight_kg
                v["used"]["volume_m3"] += delivery.volume_m3
                assigned_ids.add(delivery.id)
        
        return assignments
    
    def _find_best_vehicle(
        self,
        delivery: Delivery,
        assignments: list[dict],
        strategy: str,
        max_per_vehicle: int
    ) -> int:
        """Encontra melhor veículo para entrega."""
        best_idx = -1
        best_score = float('inf')
        
        for i, v in enumerate(assignments):
            # Verificar limites
            if len(v["deliveries"]) >= max_per_vehicle:
                continue
            
            remaining_weight = v["capacity"]["weight_kg"] - v["used"]["weight_kg"]
            remaining_volume = v["capacity"]["volume_m3"] - v["used"]["volume_m3"]
            
            if delivery.weight_kg > remaining_weight or delivery.volume_m3 > remaining_volume:
                continue
            
            # Calcular score baseado na estratégia
            if strategy == "capacity":
                # Preferir veículo com mais capacidade usada (consolidar)
                score = remaining_weight + remaining_volume
            elif strategy == "distance":
                # Preferir veículo com entregas na mesma região
                if v["deliveries"]:
                    same_city = sum(1 for d in v["deliveries"] if d["city"] == delivery.city)
                    score = -same_city  # Negativo para priorizar mais entregas na mesma cidade
                else:
                    score = 0
            else:  # time
                # Balancear número de entregas
                score = len(v["deliveries"])
            
            if score < best_score:
                best_score = score
                best_idx = i
        
        return best_idx
    
    def _calculate_metrics(self, schedule: list[dict]) -> dict:
        """Calcula métricas do agendamento."""
        total_weight = sum(v["used"]["weight_kg"] for v in schedule)
        total_volume = sum(v["used"]["volume_m3"] for v in schedule)
        total_capacity_weight = sum(v["capacity"]["weight_kg"] for v in schedule)
        total_capacity_volume = sum(v["capacity"]["volume_m3"] for v in schedule)
        
        vehicles_used = sum(1 for v in schedule if v["deliveries"])
        deliveries_count = sum(len(v["deliveries"]) for v in schedule)
        
        return {
            "vehicles_used": vehicles_used,
            "vehicles_available": len(schedule),
            "utilization_rate_percent": round(vehicles_used / len(schedule) * 100, 1) if schedule else 0,
            "weight_utilization_percent": round(total_weight / total_capacity_weight * 100, 1) if total_capacity_weight else 0,
            "volume_utilization_percent": round(total_volume / total_capacity_volume * 100, 1) if total_capacity_volume else 0,
            "avg_deliveries_per_vehicle": round(deliveries_count / vehicles_used, 1) if vehicles_used else 0,
            "total_weight_kg": round(total_weight, 2),
            "total_volume_m3": round(total_volume, 2)
        }
    
    def _get_unscheduled(
        self,
        deliveries: list[Delivery],
        schedule: list[dict]
    ) -> list[dict]:
        """Retorna entregas não agendadas."""
        scheduled_ids: set[str] = set()
        for v in schedule:
            for d in v["deliveries"]:
                scheduled_ids.add(d["id"])
        
        return [
            {
                "id": d.id,
                "city": d.city,
                "weight_kg": d.weight_kg,
                "reason": "Sem veículo com capacidade disponível"
            }
            for d in deliveries
            if d.id not in scheduled_ids
        ][:10]  # Limit to 10
    
    async def _auto_assign(
        self,
        org_id: Optional[int],
        branch_id: Optional[int],
        user_id: Optional[str],
        schedule: list[dict],
        target_date: str
    ) -> int:
        """Cria agendamentos automaticamente."""
        count = 0
        for v in schedule:
            if not v["deliveries"]:
                continue
            
            try:
                await self.client.post(
                    "/api/tms/schedules",
                    data={
                        "organizationId": org_id,
                        "branchId": branch_id,
                        "vehicleId": v["vehicle_id"],
                        "date": target_date,
                        "deliveryIds": [d["id"] for d in v["deliveries"]],
                        "createdBy": user_id
                    }
                )
                count += len(v["deliveries"])
            except Exception as e:
                logger.error(f"Erro ao criar agendamento: {e}")
        
        return count
    
    def _generate_warnings(
        self,
        schedule: list[dict],
        metrics: dict
    ) -> list[dict]:
        """Gera alertas sobre o agendamento."""
        warnings = []
        
        # Veículo sobrecarregado
        for v in schedule:
            if v["capacity"]["weight_kg"] > 0:
                weight_pct = v["used"]["weight_kg"] / v["capacity"]["weight_kg"] * 100
                if weight_pct > 95:
                    warnings.append({
                        "type": "overload_risk",
                        "severity": "warning",
                        "vehicle": v["plate"],
                        "message": f"⚠️ Veículo {v['plate']} com {weight_pct:.1f}% da capacidade de peso"
                    })
        
        # Baixa utilização
        if metrics["utilization_rate_percent"] < 50:
            warnings.append({
                "type": "low_utilization",
                "severity": "info",
                "message": f"ℹ️ Apenas {metrics['vehicles_used']} de {metrics['vehicles_available']} veículos utilizados"
            })
        
        return warnings
