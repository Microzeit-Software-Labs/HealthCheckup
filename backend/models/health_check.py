from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class CheckStatus(str, Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


class CheckType(str, Enum):
    SSH = "ssh"
    API = "api"


class HealthCheckResult(BaseModel):
    server: str
    check_type: CheckType
    service_name: str
    status: CheckStatus
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class HealthCheckRequest(BaseModel):
    server_id: str
    checks: List[str] = Field(default_factory=list)


class BulkHealthCheckRequest(BaseModel):
    server_ids: List[str]
    checks: List[str] = Field(default_factory=list)
