"""
SSH-ONLY service — integration systemd service health check.
Uses: systemctl status integration + journalctl on failure
No HTTP. No API calls. No imports from core.api_client or services/api/.
"""
import logging
from typing import List

from core.ssh_client import SSHClient
from models.health_check import CheckStatus, CheckType, HealthCheckResult
from utils.response import build_result, error_result

logger = logging.getLogger(__name__)

SERVICE_NAME = "integration"
CHECK_TYPE = CheckType.SSH

_LOG_KEYWORDS = ("error", "critical", "fatal", "exception", "failed")


def _active_line(output: str) -> str:
    for line in output.splitlines():
        if "Active:" in line:
            return line.strip()
    return ""


def _filter_log_errors(journal: str) -> List[str]:
    lines = [
        ln.strip()
        for ln in journal.splitlines()
        if any(kw in ln.lower() for kw in _LOG_KEYWORDS)
    ]
    return lines[-10:]


def run_check(server_ip: str, ssh_client: SSHClient) -> HealthCheckResult:
    try:
        status_out, _, exit_code = ssh_client.execute(
            "systemctl status integration --no-pager 2>&1"
        )
        active = _active_line(status_out)
        active_lower = active.lower()

        is_running = "active (running)" in active_lower
        is_failed = "failed" in active_lower or exit_code not in (0, 3)

        error_logs: List[str] = []
        if is_failed:
            journal_out, _, _ = ssh_client.execute(
                "journalctl -u integration -n 50 --no-pager 2>&1"
            )
            error_logs = _filter_log_errors(journal_out)

        if is_running:
            status, message = CheckStatus.HEALTHY, "Integration service running"
        elif is_failed:
            status, message = CheckStatus.CRITICAL, "Integration service failed"
        else:
            status, message = CheckStatus.WARNING, "Integration service inactive"

        return build_result(
            server=server_ip,
            check_type=CHECK_TYPE,
            service_name=SERVICE_NAME,
            status=status,
            message=message,
            details={"active_line": active, "error_logs": error_logs},
        )
    except Exception as exc:
        logger.exception("Integration check failed: %s", server_ip)
        return error_result(server_ip, CHECK_TYPE, SERVICE_NAME, str(exc))
