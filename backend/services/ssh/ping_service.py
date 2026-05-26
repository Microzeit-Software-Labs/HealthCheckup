"""
SSH-ONLY service — host reachability check via ping.
Uses: ping -c 3 <target_ip> (executed on the remote server via SSH)
No HTTP. No API calls. No imports from core.api_client or services/api/.
"""
import logging
import re
from typing import Any, Dict

from core.ssh_client import SSHClient
from models.health_check import CheckStatus, CheckType, HealthCheckResult
from utils.response import build_result, error_result

logger = logging.getLogger(__name__)

SERVICE_NAME = "ping"
CHECK_TYPE = CheckType.SSH


def _parse_ping(output: str) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "online": False,
        "latency_ms": None,
        "packet_loss_pct": None,
        "packets_transmitted": None,
        "packets_received": None,
    }

    loss_match = re.search(r"(\d+)\s+packets transmitted,\s+(\d+)\s+received.*?(\d+)%\s+packet loss", output)
    if loss_match:
        result["packets_transmitted"] = int(loss_match.group(1))
        result["packets_received"] = int(loss_match.group(2))
        result["packet_loss_pct"] = int(loss_match.group(3))
        result["online"] = result["packet_loss_pct"] < 100

    rtt_match = re.search(r"rtt\s+\S+\s+=\s+([\d.]+)/([\d.]+)/([\d.]+)", output)
    if rtt_match:
        result["latency_ms"] = float(rtt_match.group(2))  # avg

    return result


def run_check(
    server_ip: str,
    target_ip: str,
    ssh_client: SSHClient,
) -> HealthCheckResult:
    """
    Executes ping from the remote server (via SSH) to target_ip.
    target_ip is typically server_ip itself (self-ping / reachability test)
    or another downstream host.
    """
    try:
        stdout, _, _ = ssh_client.execute(f"ping -c 3 -W 2 {target_ip} 2>&1")
        parsed = _parse_ping(stdout)

        if parsed["online"]:
            lat = parsed["latency_ms"]
            message = f"Host online, avg latency {lat:.2f}ms" if lat else "Host online"
            status = CheckStatus.HEALTHY
        else:
            message = "Host offline or unreachable"
            status = CheckStatus.CRITICAL

        return build_result(
            server=server_ip,
            check_type=CHECK_TYPE,
            service_name=SERVICE_NAME,
            status=status,
            message=message,
            details={"target": target_ip, **parsed},
        )
    except Exception as exc:
        logger.exception("Ping check failed: %s -> %s", server_ip, target_ip)
        return error_result(server_ip, CHECK_TYPE, SERVICE_NAME, str(exc))
