"""
Tool: PDCA Tracker
Gerenciamento de ciclos PDCA (Plan-Do-Check-Act).

Risk Level: MEDIUM (cria/atualiza ciclos)

Ciclo Deming:
- Plan: Identificar problema, analisar causas, definir plano
- Do: Executar o plano
- Check: Verificar resultados vs. esperado
- Act: Padronizar ou corrigir
"""

from typing import Any, Optional
from datetime import date, datetime

from src.integrations.auracore_client import AuracoreClient
from src.core.guardrails import GuardrailLevel
from src.core.observability import get_logger

logger = get_logger(__name__)


class PDCATrackerTool:
    """Gerenciamento de ciclos PDCA."""
    
    name = "pdca_tracker"
    description = """
    Gerencia ciclos PDCA (Plan-Do-Check-Act) para melhoria contínua.
    
    Fases do PDCA:
    - PLAN: Planejar ações (definir problema, causas, metas)
    - DO: Executar plano de ação
    - CHECK: Verificar resultados
    - ACT: Padronizar ou corrigir
    
    Ações:
    - create: Criar novo ciclo PDCA
    - update: Atualizar fase do ciclo
    - list: Listar ciclos ativos
    - detail: Detalhes de um ciclo
    - advance: Avançar para próxima fase
    
    Parâmetros:
    - action: create, update, list, detail, advance
    - pdca_id: ID do ciclo (para update, detail, advance)
    - title: Título do ciclo (para create)
    - problem: Descrição do problema (para create)
    - target: Meta a atingir (para create)
    - actions: Lista de ações (para create/update)
    - status: Status da fase (para update)
    
    Retorna:
    - ID do ciclo criado
    - Status e progresso de cada fase
    - Métricas de resultado
    """
    guardrail_level = GuardrailLevel.MEDIUM
    
    def __init__(self):
        self.client = AuracoreClient()
    
    async def run(
        self,
        action: str,
        pdca_id: Optional[str] = None,
        title: Optional[str] = None,
        problem: Optional[str] = None,
        target: Optional[str] = None,
        root_cause: Optional[str] = None,
        actions: Optional[list[dict]] = None,
        phase: Optional[str] = None,
        phase_status: Optional[str] = None,
        notes: Optional[str] = None,
        organization_id: Optional[int] = None,
        branch_id: Optional[int] = None,
        **kwargs
    ) -> dict[str, Any]:
        """
        Gerencia ciclos PDCA.
        
        Args:
            action: create, update, list, detail, advance
            pdca_id: ID do ciclo
            title: Título do ciclo
            problem: Descrição do problema
            target: Meta a atingir
            actions: Lista de ações
            
        Returns:
            Resultado da operação
        """
        logger.info(
            "Iniciando pdca_tracker",
            extra={
                "org_id": organization_id,
                "branch_id": branch_id,
                "action": action
            }
        )
        
        valid_actions = ["create", "update", "list", "detail", "advance"]
        if action not in valid_actions:
            return {"success": False, "error": f"Ação inválida. Use: {', '.join(valid_actions)}"}
        
        if action == "create":
            return await self._create_cycle(title, problem, target, root_cause, actions)
        elif action == "update":
            return await self._update_cycle(pdca_id, phase, phase_status, notes)
        elif action == "list":
            return await self._list_cycles()
        elif action == "detail":
            return await self._get_cycle_detail(pdca_id)
        elif action == "advance":
            return await self._advance_phase(pdca_id, notes)
        
        return {"success": False, "error": "Ação não implementada"}
    
    async def _create_cycle(
        self,
        title: Optional[str],
        problem: Optional[str],
        target: Optional[str],
        root_cause: Optional[str],
        actions: Optional[list[dict]]
    ) -> dict[str, Any]:
        """Cria novo ciclo PDCA."""
        if not title:
            return {"success": False, "error": "title é obrigatório"}
        if not problem:
            return {"success": False, "error": "problem é obrigatório"}
        if not target:
            return {"success": False, "error": "target é obrigatório"}
        
        pdca_id = f"PDCA-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        cycle = {
            "id": pdca_id,
            "title": title,
            "problem": problem,
            "target": target,
            "root_cause": root_cause,
            "actions": actions or [],
            "current_phase": "PLAN",
            "status": "active",
            "created_at": datetime.now().isoformat(),
            "phases": {
                "PLAN": {"status": "in_progress", "started_at": datetime.now().isoformat()},
                "DO": {"status": "pending"},
                "CHECK": {"status": "pending"},
                "ACT": {"status": "pending"},
            }
        }
        
        logger.info("pdca_created", pdca_id=pdca_id, title=title)
        
        return {
            "success": True,
            "action": "create",
            "pdca_id": pdca_id,
            "cycle": cycle,
            "message": f"Ciclo PDCA '{title}' criado. Fase atual: PLAN"
        }
    
    async def _update_cycle(
        self,
        pdca_id: Optional[str],
        phase: Optional[str],
        phase_status: Optional[str],
        notes: Optional[str]
    ) -> dict[str, Any]:
        """Atualiza fase do ciclo."""
        if not pdca_id:
            return {"success": False, "error": "pdca_id é obrigatório"}
        
        valid_phases = ["PLAN", "DO", "CHECK", "ACT"]
        if phase and phase.upper() not in valid_phases:
            return {"success": False, "error": f"Fase inválida. Use: {', '.join(valid_phases)}"}
        
        valid_status = ["pending", "in_progress", "completed", "blocked"]
        if phase_status and phase_status not in valid_status:
            return {"success": False, "error": f"Status inválido. Use: {', '.join(valid_status)}"}
        
        logger.info("pdca_updated", pdca_id=pdca_id, phase=phase, status=phase_status)
        
        return {
            "success": True,
            "action": "update",
            "pdca_id": pdca_id,
            "phase": phase,
            "phase_status": phase_status,
            "notes": notes,
            "message": f"Ciclo {pdca_id} atualizado"
        }
    
    async def _list_cycles(self) -> dict[str, Any]:
        """Lista ciclos PDCA ativos."""
        # Simulação de dados
        cycles = [
            {
                "id": "PDCA-20250115001",
                "title": "Reduzir tempo de entrega",
                "problem": "Tempo médio de entrega acima da meta",
                "target": "Reduzir de 48h para 36h",
                "current_phase": "DO",
                "status": "active",
                "progress": 50,
                "owner": "Gerente Operações",
                "started_at": "2025-01-15"
            },
            {
                "id": "PDCA-20250110002",
                "title": "Melhorar NPS",
                "problem": "NPS estagnado em 42 pontos",
                "target": "Atingir NPS 50",
                "current_phase": "CHECK",
                "status": "active",
                "progress": 75,
                "owner": "Gerente CX",
                "started_at": "2025-01-10"
            },
            {
                "id": "PDCA-20250105003",
                "title": "Reduzir custos de combustível",
                "problem": "Custo por km acima do orçamento",
                "target": "Reduzir em 10%",
                "current_phase": "ACT",
                "status": "active",
                "progress": 90,
                "owner": "Gerente Frota",
                "started_at": "2025-01-05"
            },
        ]
        
        by_phase = {
            "PLAN": len([c for c in cycles if c["current_phase"] == "PLAN"]),
            "DO": len([c for c in cycles if c["current_phase"] == "DO"]),
            "CHECK": len([c for c in cycles if c["current_phase"] == "CHECK"]),
            "ACT": len([c for c in cycles if c["current_phase"] == "ACT"]),
        }
        
        return {
            "success": True,
            "action": "list",
            "cycles": cycles,
            "total": len(cycles),
            "by_phase": by_phase,
            "message": f"Encontrados {len(cycles)} ciclos PDCA ativos"
        }
    
    async def _get_cycle_detail(self, pdca_id: Optional[str]) -> dict[str, Any]:
        """Detalhes de um ciclo PDCA."""
        if not pdca_id:
            return {"success": False, "error": "pdca_id é obrigatório"}
        
        # Simulação
        cycle = {
            "id": pdca_id,
            "title": "Reduzir tempo de entrega",
            "problem": "Tempo médio de entrega está em 48h, acima da meta de 36h",
            "target": "Reduzir tempo médio de entrega de 48h para 36h",
            "root_cause": "Roteirização ineficiente e atrasos na separação",
            "current_phase": "DO",
            "status": "active",
            "owner": "João Silva - Gerente de Operações",
            "started_at": "2025-01-15",
            "phases": {
                "PLAN": {
                    "status": "completed",
                    "started_at": "2025-01-15",
                    "completed_at": "2025-01-17",
                    "deliverables": [
                        "Análise 5 Porquês realizada",
                        "Diagrama de Ishikawa elaborado",
                        "Plano de ação definido",
                    ]
                },
                "DO": {
                    "status": "in_progress",
                    "started_at": "2025-01-18",
                    "actions": [
                        {"task": "Implementar novo algoritmo de roteirização", "status": "completed", "owner": "TI"},
                        {"task": "Treinar equipe de separação", "status": "in_progress", "owner": "RH"},
                        {"task": "Ajustar horários de corte", "status": "pending", "owner": "Operações"},
                    ],
                    "progress": 50
                },
                "CHECK": {
                    "status": "pending",
                    "metrics": [
                        {"name": "Tempo médio entrega", "baseline": 48, "target": 36, "unit": "horas"},
                        {"name": "Entregas no prazo", "baseline": 82, "target": 95, "unit": "%"},
                    ]
                },
                "ACT": {
                    "status": "pending",
                    "notes": "Aguardando resultados do CHECK"
                }
            }
        }
        
        return {
            "success": True,
            "action": "detail",
            "cycle": cycle,
            "message": f"Ciclo {pdca_id}: Fase {cycle['current_phase']}"
        }
    
    async def _advance_phase(self, pdca_id: Optional[str], notes: Optional[str]) -> dict[str, Any]:
        """Avança para próxima fase do PDCA."""
        if not pdca_id:
            return {"success": False, "error": "pdca_id é obrigatório"}
        
        # Simulação - assumindo que está em DO e avança para CHECK
        current_phase = "DO"
        next_phase = "CHECK"
        
        phase_sequence = ["PLAN", "DO", "CHECK", "ACT"]
        current_idx = phase_sequence.index(current_phase)
        
        if current_idx == len(phase_sequence) - 1:
            return {
                "success": True,
                "action": "advance",
                "pdca_id": pdca_id,
                "current_phase": "ACT",
                "status": "completed",
                "message": f"Ciclo {pdca_id} CONCLUÍDO! Todas as fases completadas."
            }
        
        logger.info("pdca_advanced", pdca_id=pdca_id, from_phase=current_phase, to_phase=next_phase)
        
        return {
            "success": True,
            "action": "advance",
            "pdca_id": pdca_id,
            "previous_phase": current_phase,
            "current_phase": next_phase,
            "notes": notes,
            "message": f"Ciclo {pdca_id} avançou de {current_phase} para {next_phase}"
        }
