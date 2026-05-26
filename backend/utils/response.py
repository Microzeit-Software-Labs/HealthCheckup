from datetime import datetime, timezone
from typing import Any, Dict, Optional

from models.health_check import CheckStatus, CheckType, HealthCheckResult


def build_result(
    server: str,
    check_type: CheckType,
    service_name: str,
    status: CheckStatus,
    message: str,
    details: Optional[Dict[str, Any]] = None,
) -> HealthCheckResult:
    return HealthCheckResult(
        server=server,
        check_type=check_type,
        service_name=service_name,
        status=status,
        message=message,
        details=details or {},
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


def error_result(
    server: str,
    check_type: CheckType,
    service_name: str,
    error: str,
) -> HealthCheckResult:
    return build_result(
        server=server,
        check_type=check_type,
        service_name=service_name,
        status=CheckStatus.UNKNOWN,
        message=f"Check failed: {error}",
        details={"error": error},
    )
