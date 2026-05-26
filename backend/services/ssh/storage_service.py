"""
SSH-ONLY service — disk storage health check.
Uses: df -P -B1
No HTTP. No API calls. No imports from core.api_client or services/api/.
"""
import logging
from typing import Any, Dict, List, Tuple

from core.ssh_client import SSHClient
from models.health_check import CheckStatus, CheckType, HealthCheckResult
from utils.response import build_result, error_result

logger = logging.getLogger(__name__)

SERVICE_NAME = "storage"
CHECK_TYPE = CheckType.SSH

_SKIP_FS = frozenset(("tmpfs", "devtmpfs", "udev", "none", "overlay", "squashfs"))


def _parse_df(output: str) -> Dict[str, Any]:
    total = used = available = 0
    filesystems: List[Dict[str, Any]] = []

    for line in output.strip().splitlines()[1:]:  # skip header row
        parts = line.split()
        if len(parts) < 6:
            continue
        fs, size_b, used_b, avail_b, use_pct, mount = parts[:6]

        if any(fs.startswith(skip) for skip in _SKIP_FS):
            continue

        try:
            s, u, a = int(size_b), int(used_b), int(avail_b)
            total += s
            used += u
            available += a
            filesystems.append({
                "filesystem": fs,
                "mount": mount,
                "total_bytes": s,
                "used_bytes": u,
                "available_bytes": a,
                "use_percent": float(use_pct.strip("%")),
            })
        except (ValueError, IndexError):
            continue

    usage_pct = round((used / total * 100), 2) if total > 0 else 0.0
    return {
        "total_bytes": total,
        "used_bytes": used,
        "available_bytes": available,
        "usage_percent": usage_pct,
        "filesystems": filesystems,
    }


def _classify(usage_pct: float) -> Tuple[CheckStatus, str]:
    if usage_pct >= 90:
        return CheckStatus.CRITICAL, "Storage is full"
    if usage_pct >= 80:
        return CheckStatus.WARNING, "Storage nearing capacity"
    return CheckStatus.HEALTHY, "Storage is healthy"


def run_check(server_ip: str, ssh_client: SSHClient) -> HealthCheckResult:
    try:
        stdout, stderr, exit_code = ssh_client.execute("df -P -B1")

        if exit_code != 0 and not stdout.strip():
            return error_result(server_ip, CHECK_TYPE, SERVICE_NAME, stderr.strip() or "df failed")

        stats = _parse_df(stdout)
        status, message = _classify(stats["usage_percent"])

        return build_result(
            server=server_ip,
            check_type=CHECK_TYPE,
            service_name=SERVICE_NAME,
            status=status,
            message=message,
            details=stats,
        )
    except Exception as exc:
        logger.exception("Storage check failed: %s", server_ip)
        return error_result(server_ip, CHECK_TYPE, SERVICE_NAME, str(exc))
