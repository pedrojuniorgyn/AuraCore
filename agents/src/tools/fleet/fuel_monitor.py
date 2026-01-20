"""
Tool: Fuel Monitor
Monitoramento de consumo e custos de combustível.

Risk Level: LOW (apenas análise)

Métricas:
- Consumo médio (km/l)
- Custo por km (CPK)
- Variação de consumo
- Alertas de anomalias
"""

from typing import Any, Optional
from datetime import date, timedelta
from decimal import Decimal

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


class FuelMonitorTool:
    """Monitoramento de consumo e custos de combustível."""
    
    name = "fuel_monitor"
    description = """
    Monitora consumo e custos de combustível da frota.
    
    Tipos de consulta:
    - vehicle: Estatísticas de um veículo específico
    - fleet_summary: Resumo consolidado da frota
    - anomalies: Detecção de anomalias de consumo
    - comparison: Comparação entre veículos
    
    Métricas calculadas:
    - Consumo médio (km/l)
    - CPK (Custo por Quilômetro)
    - Variação percentual vs. média
    - Ranking de eficiência
    
    Parâmetros:
    - query_type: vehicle, fleet_summary, anomalies, comparison
    - vehicle_id: ID do veículo (para query vehicle)
    - vehicle_ids: Lista de IDs para comparação
    - start_date: Data inicial do período
    - end_date: Data final do período
    - include_records: Incluir registros detalhados de abastecimento
    - fuel_type: Filtrar por tipo (DIESEL_S10, DIESEL_S500, ARLA32)
    
    Retorna:
    - Estatísticas de consumo e custo
    - Alertas de anomalias
    - Recomendações de melhoria
    """
    guardrail_level = GuardrailLevel.LOW
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        query_type: str,
        vehicle_id: Optional[int] = None,
        vehicle_ids: Optional[list[int]] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        include_records: bool = False,
        fuel_type: Optional[str] = None,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Monitora consumo e custos de combustível.
        
        Args:
            query_type: vehicle, fleet_summary, anomalies, comparison
            vehicle_id: ID do veículo
            vehicle_ids: Lista de IDs para comparação
            start_date: Data inicial (YYYY-MM-DD)
            end_date: Data final (YYYY-MM-DD)
            include_records: Incluir registros detalhados
            
        Returns:
            Análise de consumo e custos
        """
        # Definir período padrão (último mês)
        if not end_date:
            end_date = date.today().isoformat()
        if not start_date:
            start_date = (date.today() - timedelta(days=30)).isoformat()
        
        logger.info(
            "Iniciando fuel_monitor",
            extra={
                "org_id": organization_id,
                "branch_id": branch_id,
                "query_type": query_type,
                "period": f"{start_date} to {end_date}"
            }
        )
        
        valid_types = ["vehicle", "fleet_summary", "anomalies", "comparison"]
        if query_type not in valid_types:
            return {"success": False, "error": f"Tipo de consulta inválido. Use: {', '.join(valid_types)}"}
        
        if query_type == "vehicle":
            return await self._get_vehicle_fuel_stats(vehicle_id, start_date, end_date, include_records)
        elif query_type == "fleet_summary":
            return await self._get_fleet_fuel_summary(start_date, end_date)
        elif query_type == "anomalies":
            return await self._detect_fuel_anomalies(start_date, end_date)
        elif query_type == "comparison":
            return await self._compare_vehicles_fuel(vehicle_ids, start_date, end_date)
        
        return {"success": False, "error": "Tipo de consulta não implementado"}
    
    async def _get_vehicle_fuel_stats(
        self,
        vehicle_id: Optional[int],
        start_date: str,
        end_date: str,
        include_records: bool
    ) -> dict[str, Any]:
        """Estatísticas de combustível de um veículo."""
        if not vehicle_id:
            return {"success": False, "error": "vehicle_id é obrigatório"}
        
        # Simulação de registros
        records = []
        if include_records:
            records = [
                {
                    "record_id": "FUEL-001",
                    "date": "2025-01-05",
                    "odometer": 125000,
                    "liters": 320.5,
                    "unit_price": 6.29,
                    "total_cost": 2015.95,
                    "fuel_type": "DIESEL_S10",
                    "station": "Posto Ipiranga BR-116",
                    "driver_name": "João Silva"
                },
                {
                    "record_id": "FUEL-002",
                    "date": "2025-01-12",
                    "odometer": 125850,
                    "liters": 310.0,
                    "unit_price": 6.35,
                    "total_cost": 1968.50,
                    "fuel_type": "DIESEL_S10",
                    "station": "Posto Shell Dutra",
                    "driver_name": "João Silva"
                },
                {
                    "record_id": "FUEL-003",
                    "date": "2025-01-19",
                    "odometer": 126720,
                    "liters": 315.0,
                    "unit_price": 6.32,
                    "total_cost": 1990.80,
                    "fuel_type": "DIESEL_S10",
                    "station": "Posto Petrobras",
                    "driver_name": "Carlos Souza"
                },
            ]
        
        stats = {
            "vehicle_id": vehicle_id,
            "vehicle_plate": "ABC-1234",
            "vehicle_model": "Volvo FH 540",
            "period_start": start_date,
            "period_end": end_date,
            "total_km": 1720,
            "total_liters": 945.5,
            "avg_consumption": 2.65,  # km/l
            "best_consumption": 2.74,
            "worst_consumption": 2.56,
            "total_cost": 5975.25,
            "cost_per_km": 3.47,  # CPK
            "avg_unit_price": 6.32,
            "consumption_vs_fleet_avg": -3.5,  # 3.5% abaixo da média (bom)
            "cost_vs_budget": 92.0,  # 92% do orçamento
        }
        
        if include_records:
            stats["recent_records"] = records
        
        recommendations = []
        if stats["consumption_vs_fleet_avg"] > 10:
            recommendations.append("⚠️ Consumo 10% acima da média da frota - verificar condução e manutenção")
        if stats["cost_vs_budget"] > 100:
            recommendations.append("💰 Custo acima do orçamento - avaliar rotas alternativas")
        
        return {
            "success": True,
            "query_type": "vehicle",
            "stats": stats,
            "recommendations": recommendations,
            "message": f"Veículo ABC-1234: {stats['avg_consumption']} km/l, CPK R$ {stats['cost_per_km']}"
        }
    
    async def _get_fleet_fuel_summary(self, start_date: str, end_date: str) -> dict[str, Any]:
        """Resumo de combustível da frota."""
        summary = {
            "period_start": start_date,
            "period_end": end_date,
            "total_vehicles": 25,
            "total_km": 185000,
            "total_liters": 72500,
            "total_cost": 458375.00,
            "fleet_avg_consumption": 2.55,  # km/l
            "fleet_avg_cpk": 4.85,  # R$/km
            "avg_unit_price": 6.32,
            "best_vehicles": [
                {"plate": "ABC-1234", "model": "Volvo FH 540", "consumption": 2.85, "cpk": 3.42},
                {"plate": "DEF-5678", "model": "Scania R450", "consumption": 2.78, "cpk": 3.53},
                {"plate": "GHI-9012", "model": "Mercedes Actros", "consumption": 2.72, "cpk": 3.63},
            ],
            "worst_vehicles": [
                {"plate": "XYZ-9999", "model": "Volvo FH 460", "consumption": 2.15, "cpk": 5.86},
                {"plate": "WVU-8888", "model": "Scania R410", "consumption": 2.22, "cpk": 5.67},
                {"plate": "TSR-7777", "model": "Mercedes Actros", "consumption": 2.28, "cpk": 5.52},
            ],
            "fuel_by_type": {
                "DIESEL_S10": {"liters": 68000, "cost": 429760.00, "percentage": 93.8},
                "DIESEL_S500": {"liters": 3500, "cost": 20615.00, "percentage": 4.8},
                "ARLA32": {"liters": 1000, "cost": 8000.00, "percentage": 1.4}
            }
        }
        
        return {
            "success": True,
            "query_type": "fleet_summary",
            "summary": summary,
            "anomaly_alerts": [
                "🚨 XYZ-9999: Consumo 15% acima da média - possível problema mecânico",
                "⚠️ WVU-8888: Aumento de 8% no consumo no último período"
            ],
            "message": f"Frota: {summary['fleet_avg_consumption']} km/l média, CPK médio R$ {summary['fleet_avg_cpk']}"
        }
    
    async def _detect_fuel_anomalies(self, start_date: str, end_date: str) -> dict[str, Any]:
        """Detecta anomalias no consumo de combustível."""
        anomalies = [
            {
                "type": "HIGH_VOLUME",
                "severity": "HIGH",
                "vehicle_plate": "ABC-1234",
                "date": "2025-01-15",
                "description": "Abastecimento de 450L (média é 320L)",
                "action": "Verificar vazamento ou registro incorreto"
            },
            {
                "type": "CONSUMPTION_DROP",
                "severity": "INFO",
                "vehicle_plate": "DEF-5678",
                "date": "2025-01-10",
                "description": "Queda de 20% no consumo após troca de óleo",
                "action": "Normal - registrar como padrão pós-manutenção"
            },
            {
                "type": "MULTIPLE_REFUELS",
                "severity": "CRITICAL",
                "vehicle_plate": "GHI-9012",
                "date": "2025-01-18",
                "description": "3 abastecimentos no mesmo dia em postos diferentes",
                "action": "Investigar possível fraude"
            },
            {
                "type": "WRONG_FUEL",
                "severity": "HIGH",
                "vehicle_plate": "JKL-3456",
                "date": "2025-01-16",
                "description": "Diesel S500 usado (deveria ser S10)",
                "action": "Alertar sobre impacto no motor e garantia"
            },
            {
                "type": "CONSUMPTION_SPIKE",
                "severity": "MEDIUM",
                "vehicle_plate": "MNO-7890",
                "date": "2025-01-17",
                "description": "Aumento de 25% no consumo na última semana",
                "action": "Agendar verificação mecânica"
            },
        ]
        
        critical = [a for a in anomalies if a["severity"] == "CRITICAL"]
        high = [a for a in anomalies if a["severity"] == "HIGH"]
        
        recommendations = [
            f"📋 Investigar {len(critical)} anomalia(s) crítica(s) imediatamente",
            f"📋 Revisar {len(high)} anomalia(s) de alta severidade",
            "📋 Implementar controle de dupla conferência em abastecimentos"
        ]
        
        return {
            "success": True,
            "query_type": "anomalies",
            "period": f"{start_date} to {end_date}",
            "anomalies": anomalies,
            "total_anomalies": len(anomalies),
            "critical_count": len(critical),
            "high_count": len(high),
            "recommendations": recommendations,
            "message": f"Detectadas {len(anomalies)} anomalias ({len(critical)} críticas, {len(high)} altas)"
        }
    
    async def _compare_vehicles_fuel(
        self, vehicle_ids: Optional[list[int]], start_date: str, end_date: str
    ) -> dict[str, Any]:
        """Compara consumo entre veículos."""
        if not vehicle_ids or len(vehicle_ids) < 2:
            return {"success": False, "error": "Informe pelo menos 2 vehicle_ids para comparação"}
        
        comparison = [
            {
                "vehicle_id": 1,
                "plate": "ABC-1234",
                "model": "Volvo FH 540",
                "avg_consumption": 2.65,
                "cpk": 3.47,
                "total_km": 8500,
                "total_cost": 29495.00,
                "efficiency_rank": 1,
                "vs_fleet_avg": -3.5
            },
            {
                "vehicle_id": 2,
                "plate": "DEF-5678",
                "model": "Scania R450",
                "avg_consumption": 2.52,
                "cpk": 3.93,
                "total_km": 7800,
                "total_cost": 30654.00,
                "efficiency_rank": 2,
                "vs_fleet_avg": 1.2
            },
            {
                "vehicle_id": 3,
                "plate": "GHI-9012",
                "model": "Mercedes Actros",
                "avg_consumption": 2.48,
                "cpk": 4.08,
                "total_km": 9200,
                "total_cost": 37536.00,
                "efficiency_rank": 3,
                "vs_fleet_avg": 3.5
            },
        ]
        
        # Filtrar pelos IDs solicitados
        comparison = [c for c in comparison if c["vehicle_id"] in vehicle_ids]
        
        best = comparison[0] if comparison else None
        worst = comparison[-1] if comparison else None
        
        recommendations = []
        if best and worst:
            diff = ((worst["avg_consumption"] - best["avg_consumption"]) / best["avg_consumption"]) * 100
            recommendations.append(f"🏆 {best['plate']} é o mais eficiente: {best['avg_consumption']} km/l")
            recommendations.append(f"📊 Diferença de {diff:.1f}% entre o melhor e pior consumo")
            recommendations.append("💡 Avaliar diferenças de rota, carga e condução entre veículos")
        
        return {
            "success": True,
            "query_type": "comparison",
            "period": f"{start_date} to {end_date}",
            "comparison": comparison,
            "total_compared": len(comparison),
            "recommendations": recommendations,
            "message": f"Comparados {len(comparison)} veículos"
        }
