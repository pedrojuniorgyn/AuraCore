"""
Tool: Document Tracker
Controle de documentos de veículos e motoristas.

Risk Level: LOW (consulta e alertas)

Documentos controlados:
- CRLV (Certificado de Registro e Licenciamento de Veículo)
- Seguro obrigatório (DPVAT) e facultativo
- Tacógrafo (aferição)
- ANTT/RNTRC (Registro Nacional de Transportadores Rodoviários de Cargas)
- CNH dos motoristas
"""

from typing import Any, Optional
from datetime import date
from dataclasses import dataclass

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


@dataclass
class DocumentInfo:
    """Informações de um documento."""
    document_type: str
    document_number: Optional[str]
    issue_date: Optional[date]
    expiry_date: Optional[date]
    status: str  # VALID, EXPIRING_SOON, EXPIRED, MISSING
    days_until_expiry: Optional[int]
    renewal_cost: Optional[float]
    notes: Optional[str]


class DocumentTrackerTool:
    """Controle de documentos de veículos e motoristas."""
    
    name = "document_tracker"
    description = """
    Consulta e monitora documentos de veículos e motoristas.
    
    Tipos de consulta:
    - vehicle: Documentos de um veículo específico
    - driver: Documentos de um motorista específico
    - expiring: Documentos próximos do vencimento
    - summary: Resumo geral da frota
    
    Documentos monitorados:
    - CRLV: Licenciamento anual
    - INSURANCE: Seguro obrigatório e facultativo
    - TACHOGRAPH: Aferição do tacógrafo (anual)
    - ANTT: Registro RNTRC
    - CNH: Carteira de motorista
    - MOPP: Produtos perigosos
    
    Parâmetros:
    - query_type: vehicle, driver, expiring, summary
    - vehicle_id: ID do veículo (para query vehicle)
    - driver_id: ID do motorista (para query driver)
    - days_ahead: Dias à frente para buscar vencimentos
    - document_types: Filtrar por tipos específicos
    
    Retorna:
    - Documentos com status e vencimentos
    - Alertas urgentes
    - Taxa de conformidade
    """
    guardrail_level = GuardrailLevel.LOW
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        query_type: str,
        vehicle_id: Optional[int] = None,
        driver_id: Optional[int] = None,
        days_ahead: int = 30,
        document_types: Optional[list[str]] = None,
        include_expired: bool = True,
        include_missing: bool = True,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Consulta documentos de veículos e motoristas.
        
        Args:
            query_type: vehicle, driver, expiring, summary
            vehicle_id: ID do veículo
            driver_id: ID do motorista
            days_ahead: Dias à frente para buscar
            document_types: Filtrar por tipos
            
        Returns:
            Documentos com status e alertas
        """
        logger.info(
            "Iniciando document_tracker",
            extra={
                "org_id": organization_id,
                "branch_id": branch_id,
                "query_type": query_type
            }
        )
        
        valid_types = ["vehicle", "driver", "expiring", "summary"]
        if query_type not in valid_types:
            return {"success": False, "error": f"Tipo de consulta inválido. Use: {', '.join(valid_types)}"}
        
        if query_type == "vehicle":
            return await self._get_vehicle_documents(vehicle_id)
        elif query_type == "driver":
            return await self._get_driver_documents(driver_id)
        elif query_type == "expiring":
            return await self._get_expiring_documents(days_ahead, document_types)
        elif query_type == "summary":
            return await self._get_documents_summary()
        
        return {"success": False, "error": "Tipo de consulta não implementado"}
    
    async def _get_vehicle_documents(self, vehicle_id: Optional[int]) -> dict[str, Any]:
        """Busca documentos de um veículo específico."""
        if not vehicle_id:
            return {"success": False, "error": "vehicle_id é obrigatório"}
        
        # Simulação de dados
        documents = [
            {
                "document_type": "CRLV",
                "document_number": "123456789",
                "issue_date": "2024-03-15",
                "expiry_date": "2025-03-15",
                "status": "VALID",
                "days_until_expiry": 54,
                "renewal_cost": 150.00
            },
            {
                "document_type": "INSURANCE",
                "document_number": "POL-2024-001",
                "issue_date": "2024-06-01",
                "expiry_date": "2025-06-01",
                "status": "VALID",
                "days_until_expiry": 132,
                "renewal_cost": 3500.00
            },
            {
                "document_type": "TACHOGRAPH",
                "document_number": "TAC-001",
                "issue_date": "2024-01-10",
                "expiry_date": "2025-01-10",
                "status": "EXPIRED",
                "days_until_expiry": -10,
                "renewal_cost": 250.00,
                "notes": "URGENTE: Aferição vencida"
            },
            {
                "document_type": "ANTT",
                "document_number": "RNTRC-123456",
                "issue_date": "2023-07-01",
                "expiry_date": "2025-07-01",
                "status": "VALID",
                "days_until_expiry": 162
            },
        ]
        
        valid = [d for d in documents if d["status"] == "VALID"]
        expiring = [d for d in documents if d["status"] == "EXPIRING_SOON"]
        expired = [d for d in documents if d["status"] == "EXPIRED"]
        missing = [d for d in documents if d["status"] == "MISSING"]
        
        compliance = len(valid) / len(documents) * 100 if documents else 0
        
        urgent_alerts = []
        if expired:
            for doc in expired:
                urgent_alerts.append(f"⚠️ {doc['document_type']} VENCIDO: {doc.get('notes', 'Renovar imediatamente')}")
        
        return {
            "success": True,
            "query_type": "vehicle",
            "vehicle_id": vehicle_id,
            "vehicle_plate": "ABC-1234",
            "vehicle_model": "Volvo FH 540",
            "documents": documents,
            "total_documents": len(documents),
            "valid_documents": len(valid),
            "expiring_documents": len(expiring),
            "expired_documents": len(expired),
            "missing_documents": len(missing),
            "compliance_rate": round(compliance, 1),
            "urgent_alerts": urgent_alerts,
            "message": f"Veículo ABC-1234: {compliance:.0f}% em conformidade"
        }
    
    async def _get_driver_documents(self, driver_id: Optional[int]) -> dict[str, Any]:
        """Busca documentos de um motorista específico."""
        if not driver_id:
            return {"success": False, "error": "driver_id é obrigatório"}
        
        # Simulação
        documents = [
            {
                "document_type": "CNH",
                "document_number": "12345678900",
                "issue_date": "2020-05-10",
                "expiry_date": "2025-05-10",
                "status": "VALID",
                "days_until_expiry": 110,
                "cnh_category": "E"
            },
            {
                "document_type": "MOPP",
                "document_number": "MOPP-001",
                "issue_date": "2023-08-01",
                "expiry_date": "2025-08-01",
                "status": "VALID",
                "days_until_expiry": 193,
                "notes": "Movimentação de Produtos Perigosos"
            },
            {
                "document_type": "ASO",
                "document_number": "ASO-2024-001",
                "issue_date": "2024-06-15",
                "expiry_date": "2025-06-15",
                "status": "VALID",
                "days_until_expiry": 146,
                "notes": "Atestado de Saúde Ocupacional"
            },
        ]
        
        valid = [d for d in documents if d["status"] == "VALID"]
        compliance = len(valid) / len(documents) * 100 if documents else 0
        
        return {
            "success": True,
            "query_type": "driver",
            "driver_id": driver_id,
            "driver_name": "João da Silva",
            "driver_cpf": "123.456.789-00",
            "cnh_category": "E",
            "cnh_expiry": "2025-05-10",
            "documents": documents,
            "total_documents": len(documents),
            "valid_documents": len(valid),
            "compliance_rate": round(compliance, 1),
            "message": f"Motorista João da Silva: {compliance:.0f}% em conformidade"
        }
    
    async def _get_expiring_documents(
        self, days_ahead: int, document_types: Optional[list[str]]
    ) -> dict[str, Any]:
        """Lista documentos próximos do vencimento."""
        # Simulação
        expiring = [
            {
                "entity_type": "VEHICLE",
                "entity_id": 3,
                "entity_name": "GHI-9012 (Scania R450)",
                "document_type": "CRLV",
                "expiry_date": "2025-02-01",
                "days_until_expiry": 12,
                "priority": "HIGH",
                "renewal_cost": 150.00
            },
            {
                "entity_type": "VEHICLE",
                "entity_id": 1,
                "entity_name": "ABC-1234 (Volvo FH 540)",
                "document_type": "INSURANCE",
                "expiry_date": "2025-02-15",
                "days_until_expiry": 26,
                "priority": "NORMAL",
                "renewal_cost": 3500.00
            },
            {
                "entity_type": "DRIVER",
                "entity_id": 5,
                "entity_name": "Carlos Souza",
                "document_type": "CNH",
                "expiry_date": "2025-01-30",
                "days_until_expiry": 10,
                "priority": "HIGH",
                "renewal_cost": 200.00
            },
            {
                "entity_type": "VEHICLE",
                "entity_id": 2,
                "entity_name": "DEF-5678 (Mercedes Actros)",
                "document_type": "TACHOGRAPH",
                "expiry_date": "2025-01-25",
                "days_until_expiry": 5,
                "priority": "URGENT",
                "renewal_cost": 250.00
            },
        ]
        
        # Filtrar por tipos se especificado
        if document_types:
            expiring = [e for e in expiring if e["document_type"] in document_types]
        
        # Filtrar por dias
        expiring = [e for e in expiring if e["days_until_expiry"] <= days_ahead]
        
        urgent = [e for e in expiring if e["priority"] in ["HIGH", "URGENT"]]
        total_renewal_cost = sum(e.get("renewal_cost", 0) for e in expiring)
        
        return {
            "success": True,
            "query_type": "expiring",
            "days_ahead": days_ahead,
            "expiring_documents": expiring,
            "total_expiring": len(expiring),
            "urgent_count": len(urgent),
            "total_renewal_cost": total_renewal_cost,
            "urgent_alerts": [
                f"⚠️ {e['entity_name']}: {e['document_type']} vence em {e['days_until_expiry']} dias"
                for e in urgent
            ],
            "message": f"Encontrados {len(expiring)} documentos vencendo nos próximos {days_ahead} dias"
        }
    
    async def _get_documents_summary(self) -> dict[str, Any]:
        """Retorna resumo geral de documentação da frota."""
        # Simulação de summary
        return {
            "success": True,
            "query_type": "summary",
            "total_vehicles": 25,
            "total_drivers": 30,
            "documents_summary": {
                "total_documents": 175,
                "valid": 158,
                "expiring_soon": 8,
                "expired": 3,
                "missing": 6
            },
            "compliance_rate": 88.5,
            "urgent_alerts": [
                "🚨 3 documentos vencidos requerem ação imediata",
                "⚠️ 2 tacógrafos com aferição vencida",
                "⚠️ 1 CNH de motorista vencendo esta semana"
            ],
            "next_expirations": [
                {"document": "Tacógrafo - DEF-5678", "days": 5},
                {"document": "CNH - Carlos Souza", "days": 10},
                {"document": "CRLV - GHI-9012", "days": 12}
            ],
            "message": "Frota com 88.5% de conformidade documental"
        }
