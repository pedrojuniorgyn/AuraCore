"""Tools do módulo Fleet (Gestão de Frota)."""

from src.tools.fleet.maintenance_scheduler import MaintenanceSchedulerTool
from src.tools.fleet.document_tracker import DocumentTrackerTool
from src.tools.fleet.fuel_monitor import FuelMonitorTool

__all__ = [
    "MaintenanceSchedulerTool",
    "DocumentTrackerTool",
    "FuelMonitorTool",
]
