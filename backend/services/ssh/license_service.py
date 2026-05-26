"""
SSH-ONLY service — FindFace license health check.
Uses: systemctl status findface-license
No HTTP. No API calls. No imports from core.api_client or services/api/.
"""
import logging
from typing import Tuple

from core.ssh_client import SSHClient
from models.health_check import CheckStatus, CheckType, HealthCheckResult
from utils.response import build_result, error_result

logger = logging.getLogger(__name__)

SERVICE_NAME = "license"
CHECK_TYPE = CheckType.SSH

_EXPIRY_KEYWORDS = ("expired", "expir", "invalid license", "not valid", "license error")


def _detect_state(output: str) -> Tuple[str, str]:
    lower = output.lower()

    if "active (running)" in lower:
        return "active", "License service running"

    if "failed" in lower:
        if any(kw in lower for kw in _EXPIRY_KEYWORDS):
            return "expired", "License expired or invalid"
        return "failed", "License service failed"

    if "inactive" in lower:
        return "inactive", "License service inactive"

    return "unknown", "License state could not be determined"


def _extract_active_line(output: str) -> str:
    for line in output.splitlines():
        if "Active:" in line:
            return line.strip()
    return ""


def run_check(server_ip: str, ssh_client: SSHClient) -> HealthCheckResult:
    try:
        status_out, _, _ = ssh_client.execute(
            "systemctl status findface-license --no-pager 2>&1"
        )

        state, detail = _detect_state(status_out)
        active_line = _extract_active_line(status_out)

        if state == "active":
            status, message = CheckStatus.HEALTHY, "License is active"
        elif state == "expired":
            status, message = CheckStatus.CRITICAL, "License expired"
        elif state == "failed":
            status, message = CheckStatus.CRITICAL, "License service failed"
        else:
            status, message = CheckStatus.WARNING, detail

        return build_result(
            server=server_ip,
            check_type=CHECK_TYPE,
            service_name=SERVICE_NAME,
            status=status,
            message=message,
            details={"state": state, "active_line": active_line, "detail": detail},
        )
    except Exception as exc:
        logger.exception("License check failed: %s", server_ip)
        return error_result(server_ip, CHECK_TYPE, SERVICE_NAME, str(exc))
