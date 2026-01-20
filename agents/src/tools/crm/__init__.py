"""Tools do módulo CRM (Customer Relationship Management)."""

from src.tools.crm.lead_scorer import LeadScorerTool
from src.tools.crm.proposal_generator import ProposalGeneratorTool
from src.tools.crm.customer_health import CustomerHealthTool

__all__ = [
    "LeadScorerTool",
    "ProposalGeneratorTool",
    "CustomerHealthTool",
]
