"""Integrações com sistemas externos do AuraCore."""
from src.integrations.mcp_bridge import MCPBridge
from src.integrations.auracore_client import AuracoreClient

__all__ = ["MCPBridge", "AuracoreClient"]
