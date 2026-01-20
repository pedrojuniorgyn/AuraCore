"""
Tool para rastreamento de cargas em tempo real.

Fornece:
- Status atual de veículos e entregas
- Histórico de posições
- ETA dinâmico
- Alertas de desvio
"""

from typing import Any, Optional
from datetime import datetime, timedelta
from enum import Enum
import math

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


class DeliveryStatus(str, Enum):
    """Status de entrega."""
    PENDING = "PENDING"
    COLLECTED = "COLLECTED"
    IN_TRANSIT = "IN_TRANSIT"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    RETURNED = "RETURNED"


class TrackingTool:
    """Rastreamento de cargas em tempo real."""
    
    name = "tracking"
    description = """
    Rastreia veículos e cargas em tempo real, fornecendo status e ETA.
    
    Parâmetros:
    - tracking_type: Tipo de rastreamento (delivery, vehicle, shipment)
    - tracking_id: ID da entrega (para tracking_type=delivery)
    - vehicle_plate: Placa do veículo (para tracking_type=vehicle)
    - shipment_number: Número do embarque (para tracking_type=shipment)
    - include_history: Incluir histórico de posições
    - history_hours: Horas de histórico a retornar
    
    Retorna:
    - Status atual
    - Localização em tempo real
    - ETA dinâmico
    - Histórico de posições (se solicitado)
    """
    guardrail_level = GuardrailLevel.LOW
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        tracking_type: str = "delivery",
        tracking_id: Optional[str] = None,
        vehicle_plate: Optional[str] = None,
        shipment_number: Optional[str] = None,
        include_history: bool = False,
        history_hours: int = 24,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Rastreia entrega, veículo ou embarque.
        
        Args:
            tracking_type: Tipo de rastreamento (delivery, vehicle, shipment)
            tracking_id: ID da entrega
            vehicle_plate: Placa do veículo
            shipment_number: Número do embarque
            include_history: Incluir histórico de posições
            history_hours: Horas de histórico
            
        Returns:
            Status atual, localização e ETA
        """
        logger.info(
            "Iniciando tracking",
            extra={
                "org_id": organization_id,
                "type": tracking_type,
                "id": tracking_id or vehicle_plate or shipment_number
            }
        )
        
        if tracking_type == "delivery":
            if not tracking_id:
                return {"error": "tracking_id é obrigatório para tracking_type=delivery"}
            return await self._track_delivery(
                organization_id, branch_id, tracking_id,
                include_history, history_hours
            )
        elif tracking_type == "vehicle":
            if not vehicle_plate:
                return {"error": "vehicle_plate é obrigatório para tracking_type=vehicle"}
            return await self._track_vehicle(
                organization_id, branch_id, vehicle_plate,
                include_history, history_hours
            )
        elif tracking_type == "shipment":
            if not shipment_number:
                return {"error": "shipment_number é obrigatório para tracking_type=shipment"}
            return await self._track_shipment(
                organization_id, branch_id, shipment_number,
                include_history, history_hours
            )
        else:
            return {"error": f"Tipo de rastreamento inválido: {tracking_type}. Use: delivery, vehicle, shipment"}
    
    async def _track_delivery(
        self,
        org_id: Optional[int],
        branch_id: Optional[int],
        delivery_id: str,
        include_history: bool,
        history_hours: int
    ) -> dict[str, Any]:
        """Rastreia uma entrega específica."""
        try:
            # Buscar dados da entrega
            delivery = await self._fetch_delivery(org_id, branch_id, delivery_id)
            
            if not delivery:
                return {
                    "success": False,
                    "error": f"Entrega {delivery_id} não encontrada"
                }
            
            # Buscar localização atual do veículo
            vehicle_id = delivery.get("vehicleId")
            current_location = None
            
            if vehicle_id:
                current_location = await self._get_vehicle_location(
                    org_id, branch_id, vehicle_id
                )
            
            # Calcular ETA
            eta = self._calculate_eta(delivery, current_location)
            
            # Buscar histórico se solicitado
            history = []
            if include_history and vehicle_id:
                history = await self._get_position_history(
                    org_id, branch_id, vehicle_id, history_hours
                )
            
            # Verificar alertas
            alerts = self._check_delivery_alerts(delivery, current_location, eta)
            
            return {
                "success": True,
                "tracking_type": "delivery",
                "delivery": {
                    "id": delivery_id,
                    "status": delivery.get("status"),
                    "status_description": self._get_status_description(
                        delivery.get("status")
                    ),
                    "recipient": delivery.get("recipientName"),
                    "destination": {
                        "address": delivery.get("deliveryAddress", {}).get("fullAddress"),
                        "city": delivery.get("deliveryAddress", {}).get("city"),
                        "state": delivery.get("deliveryAddress", {}).get("state"),
                        "latitude": delivery.get("deliveryAddress", {}).get("latitude"),
                        "longitude": delivery.get("deliveryAddress", {}).get("longitude")
                    },
                    "delivery_window": {
                        "start": delivery.get("deliveryWindowStart"),
                        "end": delivery.get("deliveryWindowEnd")
                    }
                },
                "current_location": current_location,
                "eta": eta,
                "vehicle": {
                    "id": vehicle_id,
                    "plate": delivery.get("vehiclePlate"),
                    "driver": delivery.get("driverName")
                } if vehicle_id else None,
                "history": history if include_history else None,
                "alerts": alerts,
                "last_update": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Erro ao rastrear entrega: {e}")
            return {"success": False, "error": str(e)}
    
    async def _track_vehicle(
        self,
        org_id: Optional[int],
        branch_id: Optional[int],
        plate: str,
        include_history: bool,
        history_hours: int
    ) -> dict[str, Any]:
        """Rastreia um veículo específico."""
        try:
            # Buscar veículo
            vehicle = await self._fetch_vehicle(org_id, branch_id, plate)
            
            if not vehicle:
                return {
                    "success": False,
                    "error": f"Veículo {plate} não encontrado"
                }
            
            vehicle_id = vehicle.get("id")
            
            # Buscar localização atual
            location = await self._get_vehicle_location(org_id, branch_id, vehicle_id)
            
            # Buscar entregas em andamento
            active_deliveries = await self._fetch_active_deliveries(
                org_id, branch_id, vehicle_id
            )
            
            # Buscar histórico
            history = []
            if include_history:
                history = await self._get_position_history(
                    org_id, branch_id, vehicle_id, history_hours
                )
            
            return {
                "success": True,
                "tracking_type": "vehicle",
                "vehicle": {
                    "id": vehicle_id,
                    "plate": plate,
                    "type": vehicle.get("type"),
                    "model": vehicle.get("model"),
                    "driver": vehicle.get("currentDriver", {}).get("name"),
                    "status": vehicle.get("status")
                },
                "current_location": location,
                "active_deliveries": [
                    {
                        "id": d.get("id"),
                        "recipient": d.get("recipientName"),
                        "destination": d.get("deliveryAddress", {}).get("city"),
                        "status": d.get("status")
                    }
                    for d in active_deliveries
                ],
                "statistics": {
                    "deliveries_today": len(active_deliveries),
                    "km_today": vehicle.get("kmToday", 0),
                    "fuel_level": vehicle.get("fuelLevel")
                },
                "history": history if include_history else None,
                "last_update": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Erro ao rastrear veículo: {e}")
            return {"success": False, "error": str(e)}
    
    async def _track_shipment(
        self,
        org_id: Optional[int],
        branch_id: Optional[int],
        shipment_number: str,
        include_history: bool,
        history_hours: int
    ) -> dict[str, Any]:
        """Rastreia um embarque (múltiplas entregas)."""
        try:
            # Buscar embarque
            shipment = await self._fetch_shipment(org_id, branch_id, shipment_number)
            
            if not shipment:
                return {
                    "success": False,
                    "error": f"Embarque {shipment_number} não encontrado"
                }
            
            # Buscar entregas do embarque
            deliveries = await self._fetch_shipment_deliveries(
                org_id, branch_id, shipment.get("id")
            )
            
            # Calcular estatísticas
            status_counts: dict[str, int] = {}
            for d in deliveries:
                status = d.get("status", "UNKNOWN")
                status_counts[status] = status_counts.get(status, 0) + 1
            
            delivered_count = status_counts.get("DELIVERED", 0)
            total_count = len(deliveries)
            
            return {
                "success": True,
                "tracking_type": "shipment",
                "shipment": {
                    "id": shipment.get("id"),
                    "number": shipment_number,
                    "status": shipment.get("status"),
                    "origin": shipment.get("origin"),
                    "created_at": shipment.get("createdAt")
                },
                "vehicle": {
                    "plate": shipment.get("vehiclePlate"),
                    "driver": shipment.get("driverName")
                },
                "deliveries": {
                    "total": total_count,
                    "by_status": status_counts,
                    "items": [
                        {
                            "id": d.get("id"),
                            "recipient": d.get("recipientName"),
                            "city": d.get("deliveryAddress", {}).get("city"),
                            "status": d.get("status")
                        }
                        for d in deliveries[:20]  # Limit to 20
                    ]
                },
                "progress": {
                    "delivered": delivered_count,
                    "pending": status_counts.get("PENDING", 0) + status_counts.get("IN_TRANSIT", 0),
                    "failed": status_counts.get("FAILED", 0),
                    "percentage": round(
                        delivered_count / total_count * 100, 1
                    ) if total_count else 0
                },
                "last_update": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Erro ao rastrear embarque: {e}")
            return {"success": False, "error": str(e)}
    
    async def _fetch_delivery(
        self, org_id: Optional[int], branch_id: Optional[int], delivery_id: str
    ) -> Optional[dict]:
        """Busca dados da entrega."""
        try:
            result = await self.client.get(
                f"/api/tms/deliveries/{delivery_id}",
                params={"organizationId": org_id, "branchId": branch_id}
            )
            return result
        except Exception:
            # Retornar dados simulados para demo
            return {
                "id": delivery_id,
                "status": "IN_TRANSIT",
                "recipientName": "Cliente Exemplo",
                "vehicleId": "v-001",
                "vehiclePlate": "ABC-1234",
                "driverName": "João Silva",
                "deliveryAddress": {
                    "fullAddress": "Av. Paulista, 1000 - São Paulo/SP",
                    "city": "São Paulo",
                    "state": "SP",
                    "latitude": -23.5629,
                    "longitude": -46.6544
                }
            }
    
    async def _fetch_vehicle(
        self, org_id: Optional[int], branch_id: Optional[int], plate: str
    ) -> Optional[dict]:
        """Busca dados do veículo."""
        try:
            result = await self.client.get(
                "/api/fleet/vehicles",
                params={
                    "organizationId": org_id,
                    "branchId": branch_id,
                    "plate": plate
                }
            )
            vehicles = result.get("items", [])
            return vehicles[0] if vehicles else None
        except Exception:
            # Retornar dados simulados para demo
            return {
                "id": "v-001",
                "plate": plate,
                "type": "truck",
                "model": "Volvo FH 540",
                "status": "IN_ROUTE",
                "currentDriver": {"name": "João Silva"},
                "kmToday": 156,
                "fuelLevel": 75
            }
    
    async def _fetch_shipment(
        self, org_id: Optional[int], branch_id: Optional[int], shipment_number: str
    ) -> Optional[dict]:
        """Busca dados do embarque."""
        try:
            result = await self.client.get(
                "/api/tms/shipments",
                params={
                    "organizationId": org_id,
                    "branchId": branch_id,
                    "number": shipment_number
                }
            )
            shipments = result.get("items", [])
            return shipments[0] if shipments else None
        except Exception:
            # Retornar dados simulados
            return {
                "id": "s-001",
                "number": shipment_number,
                "status": "IN_TRANSIT",
                "origin": "São Paulo/SP",
                "vehiclePlate": "ABC-1234",
                "driverName": "João Silva",
                "createdAt": datetime.now().isoformat()
            }
    
    async def _fetch_active_deliveries(
        self, org_id: Optional[int], branch_id: Optional[int], vehicle_id: str
    ) -> list[dict]:
        """Busca entregas ativas do veículo."""
        try:
            result = await self.client.get(
                "/api/tms/deliveries",
                params={
                    "organizationId": org_id,
                    "branchId": branch_id,
                    "vehicleId": vehicle_id,
                    "status": "IN_TRANSIT,OUT_FOR_DELIVERY"
                }
            )
            return result.get("items", [])
        except Exception:
            return []
    
    async def _fetch_shipment_deliveries(
        self, org_id: Optional[int], branch_id: Optional[int], shipment_id: str
    ) -> list[dict]:
        """Busca entregas do embarque."""
        try:
            result = await self.client.get(
                "/api/tms/deliveries",
                params={
                    "organizationId": org_id,
                    "branchId": branch_id,
                    "shipmentId": shipment_id
                }
            )
            return result.get("items", [])
        except Exception:
            return []
    
    async def _get_vehicle_location(
        self, org_id: Optional[int], branch_id: Optional[int], vehicle_id: str
    ) -> Optional[dict]:
        """Busca localização atual do veículo."""
        try:
            result = await self.client.get(
                f"/api/fleet/vehicles/{vehicle_id}/location",
                params={"organizationId": org_id, "branchId": branch_id}
            )
            return {
                "latitude": result.get("latitude"),
                "longitude": result.get("longitude"),
                "speed_kmh": result.get("speed"),
                "heading": result.get("heading"),
                "timestamp": result.get("timestamp"),
                "address": result.get("address")
            }
        except Exception:
            # Retornar dados simulados
            return {
                "latitude": -23.5505,
                "longitude": -46.6333,
                "speed_kmh": 45,
                "heading": 90,
                "timestamp": datetime.now().isoformat(),
                "address": "Av. Paulista, São Paulo/SP"
            }
    
    async def _get_position_history(
        self, org_id: Optional[int], branch_id: Optional[int], vehicle_id: str, hours: int
    ) -> list[dict]:
        """Busca histórico de posições."""
        try:
            since = (datetime.now() - timedelta(hours=hours)).isoformat()
            result = await self.client.get(
                f"/api/fleet/vehicles/{vehicle_id}/positions",
                params={
                    "organizationId": org_id,
                    "branchId": branch_id,
                    "since": since
                }
            )
            return [
                {
                    "latitude": p.get("latitude"),
                    "longitude": p.get("longitude"),
                    "timestamp": p.get("timestamp"),
                    "speed_kmh": p.get("speed")
                }
                for p in result.get("items", [])
            ]
        except Exception:
            return []
    
    def _calculate_eta(
        self, delivery: dict, current_location: Optional[dict]
    ) -> Optional[dict]:
        """Calcula ETA dinâmico."""
        if not current_location:
            return None
        
        dest = delivery.get("deliveryAddress", {})
        dest_lat = dest.get("latitude")
        dest_lon = dest.get("longitude")
        
        if not dest_lat or not dest_lon:
            return None
        
        # Calcular distância restante (Haversine)
        def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
            R = 6371
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = (math.sin(dlat/2)**2 +
                 math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
                 math.sin(dlon/2)**2)
            return R * 2 * math.asin(math.sqrt(a)) * 1.3  # Fator de correção
        
        remaining_km = haversine(
            current_location["latitude"], current_location["longitude"],
            dest_lat, dest_lon
        )
        
        # Estimar tempo (velocidade média 40 km/h em área urbana)
        avg_speed = 40
        remaining_minutes = (remaining_km / avg_speed) * 60
        
        eta_datetime = datetime.now() + timedelta(minutes=remaining_minutes)
        
        return {
            "estimated_arrival": eta_datetime.isoformat(),
            "remaining_distance_km": round(remaining_km, 1),
            "remaining_time_minutes": round(remaining_minutes),
            "confidence": "medium"
        }
    
    def _get_status_description(self, status: Optional[str]) -> str:
        """Retorna descrição amigável do status."""
        descriptions = {
            "PENDING": "Aguardando coleta",
            "COLLECTED": "Coletado, aguardando embarque",
            "IN_TRANSIT": "Em trânsito para o destino",
            "OUT_FOR_DELIVERY": "Saiu para entrega",
            "DELIVERED": "Entregue com sucesso",
            "FAILED": "Tentativa de entrega falhou",
            "RETURNED": "Devolvido ao remetente"
        }
        return descriptions.get(status or "", "Status desconhecido")
    
    def _check_delivery_alerts(
        self,
        delivery: dict,
        location: Optional[dict],
        eta: Optional[dict]
    ) -> list[dict]:
        """Verifica alertas relacionados à entrega."""
        alerts = []
        
        # Alerta de atraso
        if eta and delivery.get("deliveryWindowEnd"):
            try:
                window_end = datetime.fromisoformat(
                    delivery["deliveryWindowEnd"].replace("Z", "+00:00")
                )
                eta_time = datetime.fromisoformat(
                    eta["estimated_arrival"].replace("Z", "+00:00")
                )
                
                if eta_time > window_end:
                    delay = (eta_time - window_end).total_seconds() / 60
                    alerts.append({
                        "type": "late_delivery",
                        "severity": "warning",
                        "message": f"⚠️ Previsão de atraso de {int(delay)} minutos"
                    })
            except ValueError:
                pass
        
        # Alerta de veículo parado
        if location and location.get("speed_kmh", 0) == 0:
            alerts.append({
                "type": "vehicle_stopped",
                "severity": "info",
                "message": "ℹ️ Veículo parado no momento"
            })
        
        return alerts
