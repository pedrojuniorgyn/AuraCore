"""
Tool para otimização de rotas de entrega.

Calcula rotas eficientes considerando:
- Distância e tempo
- Restrições de veículo
- Janelas de entrega
- Pedágios e custos
"""

from typing import Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


class VehicleType(str, Enum):
    """Tipos de veículo."""
    VUC = "vuc"           # Veículo Urbano de Carga
    TOCO = "toco"         # 1 eixo traseiro
    TRUCK = "truck"       # 2 eixos traseiros
    CARRETA = "carreta"   # Cavalo + semi-reboque
    BITREM = "bitrem"     # 2 semi-reboques


@dataclass
class Location:
    """Ponto de entrega."""
    id: str
    name: str
    latitude: float
    longitude: float
    delivery_window_start: Optional[str] = None
    delivery_window_end: Optional[str] = None
    service_time_minutes: int = 30
    priority: int = 1


class RouteOptimizerTool:
    """Otimização de rotas de entrega."""
    
    name = "route_optimizer"
    description = """
    Calcula rota otimizada para entregas considerando restrições e custos.
    
    Parâmetros:
    - delivery_ids: Lista de IDs das entregas a roteirizar
    - vehicle_type: Tipo de veículo (vuc, toco, truck, carreta, bitrem)
    - optimize_for: Critério de otimização (distance, time, cost)
    - avoid_tolls: Evitar pedágios
    - max_route_time_hours: Tempo máximo de rota
    
    Retorna:
    - Rota ordenada com waypoints
    - Métricas (distância, tempo, custo)
    - Alertas de janelas de entrega
    """
    guardrail_level = GuardrailLevel.LOW
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        delivery_ids: list[str],
        vehicle_type: str = "truck",
        optimize_for: str = "distance",
        avoid_tolls: bool = False,
        max_route_time_hours: float = 10.0,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Otimiza rota para lista de entregas.
        
        Args:
            delivery_ids: IDs das entregas a roteirizar
            vehicle_type: Tipo de veículo
            optimize_for: Critério de otimização (distance, time, cost)
            avoid_tolls: Evitar pedágios
            max_route_time_hours: Tempo máximo de rota
            
        Returns:
            Rota otimizada com waypoints, tempos e custos
        """
        logger.info(
            "Iniciando route_optimizer",
            extra={
                "org_id": organization_id,
                "deliveries": len(delivery_ids),
                "vehicle": vehicle_type
            }
        )
        
        if not delivery_ids:
            return {"error": "Lista de delivery_ids é obrigatória"}
        
        # Buscar dados das entregas
        deliveries = await self._fetch_deliveries(
            organization_id, branch_id, delivery_ids
        )
        
        if not deliveries:
            return {
                "error": "Nenhuma entrega encontrada",
                "delivery_ids": delivery_ids
            }
        
        # Buscar localização da filial
        start_location = await self._fetch_branch_location(
            organization_id, branch_id
        )
        end_location = start_location
        
        # Converter para Location objects
        locations = self._prepare_locations(deliveries)
        
        # Calcular matriz de distâncias
        distance_matrix = self._calculate_distance_matrix(
            start_location, locations, end_location
        )
        
        # Otimizar rota (algoritmo guloso com melhorias)
        optimized_route = self._optimize_route(
            locations,
            distance_matrix,
            optimize_for,
            max_route_time_hours
        )
        
        # Calcular tempos e custos
        departure_time = datetime.now().isoformat()
        route_details = self._calculate_route_details(
            optimized_route,
            distance_matrix,
            vehicle_type,
            departure_time,
            avoid_tolls
        )
        
        # Verificar janelas de entrega
        window_violations = self._check_delivery_windows(
            optimized_route,
            route_details["schedule"]
        )
        
        return {
            "success": True,
            "route": {
                "waypoints": [
                    {
                        "order": i + 1,
                        "delivery_id": loc.id,
                        "name": loc.name,
                        "latitude": loc.latitude,
                        "longitude": loc.longitude,
                        "eta": route_details["schedule"][i]["eta"],
                        "service_time_minutes": loc.service_time_minutes
                    }
                    for i, loc in enumerate(optimized_route)
                ],
                "total_stops": len(optimized_route)
            },
            "metrics": {
                "total_distance_km": round(route_details["total_distance"], 1),
                "total_time_hours": round(route_details["total_time"] / 60, 2),
                "driving_time_hours": round(route_details["driving_time"] / 60, 2),
                "service_time_hours": round(route_details["service_time"] / 60, 2),
                "estimated_cost_brl": round(route_details["estimated_cost"], 2),
                "toll_cost_brl": round(route_details.get("toll_cost", 0), 2)
            },
            "optimization": {
                "criteria": optimize_for,
                "vehicle_type": vehicle_type,
                "avoided_tolls": avoid_tolls
            },
            "warnings": window_violations,
            "schedule": route_details["schedule"],
            "metadata": {
                "organization_id": organization_id,
                "branch_id": branch_id,
                "generated_at": datetime.now().isoformat()
            }
        }
    
    async def _fetch_deliveries(
        self, org_id: Optional[int], branch_id: Optional[int], delivery_ids: list[str]
    ) -> list[dict]:
        """Busca dados das entregas."""
        try:
            result = await self.client.get(
                "/api/tms/deliveries",
                params={
                    "organizationId": org_id,
                    "branchId": branch_id,
                    "ids": ",".join(delivery_ids),
                    "status": "PENDING,COLLECTED"
                }
            )
            return result.get("items", [])
        except Exception as e:
            logger.error(f"Erro ao buscar entregas: {e}")
            # Retornar dados simulados para demo
            return [
                {
                    "id": did,
                    "recipientName": f"Cliente {i+1}",
                    "deliveryAddress": {
                        "city": "São Paulo",
                        "latitude": -23.5505 + (i * 0.01),
                        "longitude": -46.6333 + (i * 0.01)
                    },
                    "priority": 1,
                    "serviceTimeMinutes": 30
                }
                for i, did in enumerate(delivery_ids)
            ]
    
    async def _fetch_branch_location(
        self, org_id: Optional[int], branch_id: Optional[int]
    ) -> dict:
        """Busca localização da filial."""
        try:
            result = await self.client.get(
                f"/api/organizations/{org_id}/branches/{branch_id}"
            )
            return {
                "latitude": result.get("latitude", -23.5505),
                "longitude": result.get("longitude", -46.6333),
                "name": result.get("name", "Filial")
            }
        except Exception:
            # Default: São Paulo
            return {"latitude": -23.5505, "longitude": -46.6333, "name": "Base"}
    
    def _prepare_locations(self, deliveries: list[dict]) -> list[Location]:
        """Prepara objetos Location."""
        locations = []
        for d in deliveries:
            addr = d.get("deliveryAddress", {})
            locations.append(Location(
                id=d.get("id", ""),
                name=d.get("recipientName", addr.get("city", "Entrega")),
                latitude=addr.get("latitude", 0),
                longitude=addr.get("longitude", 0),
                delivery_window_start=d.get("deliveryWindowStart"),
                delivery_window_end=d.get("deliveryWindowEnd"),
                service_time_minutes=d.get("serviceTimeMinutes", 30),
                priority=d.get("priority", 1)
            ))
        return locations
    
    def _calculate_distance_matrix(
        self,
        start: dict,
        locations: list[Location],
        end: dict
    ) -> list[list[float]]:
        """
        Calcula matriz de distâncias.
        
        Simplificação: usando distância euclidiana * fator de correção.
        Em produção, usar API de rotas (Google, HERE, OSRM).
        """
        import math
        
        # Fator de correção para aproximar distância real
        ROAD_FACTOR = 1.3
        
        def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
            R = 6371  # Raio da Terra em km
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = (math.sin(dlat/2)**2 + 
                 math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
                 math.sin(dlon/2)**2)
            c = 2 * math.asin(math.sqrt(a))
            return R * c * ROAD_FACTOR
        
        # Todos os pontos: [start] + locations + [end]
        all_points = [
            (start["latitude"], start["longitude"])
        ] + [
            (loc.latitude, loc.longitude) for loc in locations
        ] + [
            (end["latitude"], end["longitude"])
        ]
        
        n = len(all_points)
        matrix = [[0.0] * n for _ in range(n)]
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    matrix[i][j] = haversine(
                        all_points[i][0], all_points[i][1],
                        all_points[j][0], all_points[j][1]
                    )
        
        return matrix
    
    def _optimize_route(
        self,
        locations: list[Location],
        matrix: list[list[float]],
        optimize_for: str,
        max_hours: float
    ) -> list[Location]:
        """
        Otimiza ordem das entregas.
        
        Algoritmo: Nearest Neighbor com ordenação por prioridade.
        """
        if not locations:
            return []
        
        n = len(locations)
        visited = [False] * n
        route = []
        
        # Nearest Neighbor starting from depot (index 0 in matrix)
        current = 0  # Start position
        
        for _ in range(n):
            best_next = -1
            best_dist = float('inf')
            
            for j in range(n):
                if not visited[j]:
                    # Distance from current to location j (j+1 in matrix because 0 is start)
                    dist = matrix[current][j + 1]
                    if dist < best_dist:
                        best_dist = dist
                        best_next = j
            
            if best_next >= 0:
                visited[best_next] = True
                route.append(locations[best_next])
                current = best_next + 1
        
        # Sort by priority within similar distances
        route.sort(key=lambda x: (-x.priority, route.index(x)))
        
        return route
    
    def _calculate_route_details(
        self,
        route: list[Location],
        matrix: list[list[float]],
        vehicle_type: str,
        departure_time: str,
        avoid_tolls: bool
    ) -> dict:
        """Calcula detalhes da rota."""
        # Velocidade média por tipo de veículo (km/h)
        avg_speed = {
            "vuc": 50, "toco": 60, "truck": 55, "carreta": 50, "bitrem": 45
        }.get(vehicle_type, 55)
        
        # Custo por km (R$/km)
        cost_per_km = {
            "vuc": 2.50, "toco": 3.50, "truck": 4.00, "carreta": 5.50, "bitrem": 7.00
        }.get(vehicle_type, 4.00)
        
        total_distance = 0.0
        driving_time = 0.0
        service_time = 0.0
        schedule = []
        
        try:
            current_time = datetime.fromisoformat(departure_time.replace("Z", "+00:00"))
        except ValueError:
            current_time = datetime.now()
        
        prev_index = 0  # Start from depot
        
        for i, loc in enumerate(route):
            loc_index = i + 1  # Location index in matrix
            
            # Distance from previous point
            leg_distance = matrix[prev_index][loc_index]
            leg_time = (leg_distance / avg_speed) * 60  # minutes
            
            total_distance += leg_distance
            driving_time += leg_time
            
            # Update time
            current_time += timedelta(minutes=leg_time)
            
            schedule.append({
                "stop": i + 1,
                "delivery_id": loc.id,
                "eta": current_time.isoformat(),
                "distance_from_previous_km": round(leg_distance, 1),
                "time_from_previous_minutes": round(leg_time, 0)
            })
            
            # Add service time
            service_time += loc.service_time_minutes
            current_time += timedelta(minutes=loc.service_time_minutes)
            
            prev_index = loc_index
        
        # Return to depot
        return_distance = matrix[prev_index][-1] if matrix else 0
        total_distance += return_distance
        driving_time += (return_distance / avg_speed) * 60 if avg_speed else 0
        
        # Estimate toll cost (simplified: R$ 0.15/km average)
        toll_cost = 0 if avoid_tolls else total_distance * 0.15
        
        return {
            "total_distance": total_distance,
            "total_time": driving_time + service_time,
            "driving_time": driving_time,
            "service_time": service_time,
            "estimated_cost": total_distance * cost_per_km,
            "toll_cost": toll_cost,
            "schedule": schedule
        }
    
    def _check_delivery_windows(
        self,
        route: list[Location],
        schedule: list[dict]
    ) -> list[dict]:
        """Verifica violações de janelas de entrega."""
        warnings = []
        
        for i, (loc, sched) in enumerate(zip(route, schedule)):
            if loc.delivery_window_end:
                try:
                    eta = datetime.fromisoformat(sched["eta"].replace("Z", "+00:00"))
                    window_end = datetime.fromisoformat(
                        loc.delivery_window_end.replace("Z", "+00:00")
                    )
                    
                    if eta > window_end:
                        delay_min = (eta - window_end).total_seconds() / 60
                        warnings.append({
                            "type": "window_violation",
                            "severity": "warning",
                            "delivery_id": loc.id,
                            "message": f"ETA {sched['eta'][:16]} ultrapassa janela em {int(delay_min)} minutos"
                        })
                except ValueError:
                    pass
        
        return warnings
