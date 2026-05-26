"""
SSH-ONLY service — camera (ffmpeg) stream health check.
Uses: systemctl status ffmpeg-* + journalctl on failure
No HTTP. No API calls. No imports from core.api_client or services/api/.
"""
import logging
import re
from typing import Any, Dict, List

from core.ssh_client import SSHClient
from models.health_check import CheckStatus, CheckType, HealthCheckResult
from utils.response import build_result, error_result

logger = logging.getLogger(__name__)

SERVICE_NAME = "camera"
CHECK_TYPE = CheckType.SSH

_STREAM_ERROR_KEYWORDS = (
    "connection refused",
    "stream error",
    "no such file",
    "timeout",
    "error",
    "failed",
    "crash",
    "segfault",
    "broken pipe",
    "end of file",
    "no route to host",
)


def _parse_ffmpeg_services(output: str) -> List[Dict[str, Any]]:
    services: List[Dict[str, Any]] = []
    current: Dict[str, Any] = {}

    for line in output.splitlines():
        is_header = line.startswith("●") or (
            not line.startswith(" ") and "ffmpeg-" in line
        )
        if is_header:
            if current:
                services.append(current)
            name_match = re.search(r"(ffmpeg-\S+?)(?:\.service)?(?:\s|$)", line)
            current = {
                "name": name_match.group(1) if name_match else "unknown",
                "active": "unknown",
                "failed": "failed" in line.lower(),
            }
        elif "Active:" in line and current:
            current["active"] = line.strip()
            current["failed"] = (
                "failed" in line.lower() or "inactive" in line.lower()
            )

    if current:
        services.append(current)

    return services


def _detect_stream_errors(journal: str) -> List[str]:
    lines = [
        ln.strip()
        for ln in journal.splitlines()
        if any(kw in ln.lower() for kw in _STREAM_ERROR_KEYWORDS)
    ]
    return lines[-10:]


def run_check(server_ip: str, ssh_client: SSHClient) -> HealthCheckResult:
    try:
        status_out, _, _ = ssh_client.execute(
            "systemctl status 'ffmpeg-*' --no-pager 2>&1"
        )
        services = _parse_ffmpeg_services(status_out)

        stream_errors: List[str] = []
        failed_names = [s["name"] for s in services if s.get("failed")]

        if failed_names:
            journal_out, _, _ = ssh_client.execute(
                "journalctl -u 'ffmpeg-*' -n 50 --no-pager 2>&1"
            )
            stream_errors = _detect_stream_errors(journal_out)

        total = len(services)
        failed_count = len(failed_names)

        if total == 0:
            status, message = CheckStatus.WARNING, "No ffmpeg camera services found"
        elif failed_count == 0:
            status, message = CheckStatus.HEALTHY, f"All {total} camera streams running"
        elif failed_count < total:
            status = CheckStatus.WARNING
            message = f"{failed_count}/{total} camera streams failed"
        else:
            status, message = CheckStatus.CRITICAL, "All camera streams failed"

        return build_result(
            server=server_ip,
            check_type=CHECK_TYPE,
            service_name=SERVICE_NAME,
            status=status,
            message=message,
            details={
                "total_count": total,
                "failed_count": failed_count,
                "failed_services": failed_names,
                "services": services,
                "stream_errors": stream_errors,
            },
        )
    except Exception as exc:
        logger.exception("Camera check failed: %s", server_ip)
        return error_result(server_ip, CHECK_TYPE, SERVICE_NAME, str(exc))
