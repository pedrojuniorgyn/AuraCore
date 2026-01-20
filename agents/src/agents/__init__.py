"""Agentes especializados do AuraCore."""

from src.agents.fiscal import FiscalAgent
from src.agents.financial import FinancialAgent
from src.agents.tms import TMSAgent
from src.agents.crm import CRMAgent
from src.agents.accounting import AccountingAgent
from src.agents.fleet import FleetAgent

__all__ = ["FiscalAgent", "FinancialAgent", "TMSAgent", "CRMAgent", "AccountingAgent", "FleetAgent"]

# TODO: Adicionar nas próximas fases
# from src.agents.strategic import StrategicAgent
