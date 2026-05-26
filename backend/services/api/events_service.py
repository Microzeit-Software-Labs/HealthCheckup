"""
API-ONLY service — face events health check.
Uses: GET /events/faces/ via HTTP
No SSH. No Paramiko. No imports from core.ssh_client or services/ssh/.

Normalization is delegated entirely to services.api.normalizers.events_normalizer —
this module only handles HTTP I/O, status classification, and result construction.
"""
import logging

import httpx

from core.api_client import APIClient
from models.health_check import CheckStatus, CheckType, HealthCheckResult
from services.api.normalizers import events_normalizer
from utils.response import build_result, error_result

logger = logging.getLogger(__name__)

SERVICE_NAME = "events"
CHECK_TYPE   = CheckType.API


def _classify(total_events: int, version: str) -> tuple:
    """Map normalized payload stats to a CheckStatus + human message."""
    if total_events == 0:
        return (
            CheckStatus.WARNING,
            "Events API reachable but no events returned",
        )
    version_tag = f" [FFS {version}]" if version != "unknown" else ""
    return (
        CheckStatus.HEALTHY,
        f"Events API healthy — {total_events} total events{version_tag}",
    )


async def run_check(
    server_ip: str,
    api_client: APIClient,
    page_size: int = 100,
) -> HealthCheckResult:
    try:
        response = await api_client.get(
            "/events/faces/",
            params={"page_size": page_size},
        )

        normalized = events_normalizer.normalize(response)
        status, message = _classify(
            normalized["total_events"],
            normalized["frs_version_detected"],
        )

        return build_result(
            server=server_ip,
            check_type=CHECK_TYPE,
            service_name=SERVICE_NAME,
            status=status,
            message=message,
            details=normalized,
        )

    except httpx.ConnectError as exc:
        logger.warning("Events API unreachable: %s — %s", server_ip, exc)
        return build_result(
            server=server_ip,
            check_type=CHECK_TYPE,
            service_name=SERVICE_NAME,
            status=CheckStatus.CRITICAL,
            message="API unreachable — connection refused or host down",
            details={"error": str(exc)},
        )

    except httpx.TimeoutException:
        logger.warning("Events API timeout: %s", server_ip)
        return error_result(server_ip, CHECK_TYPE, SERVICE_NAME, "Request timed out")

    except httpx.HTTPStatusError as exc:
        code = exc.response.status_code
        if code in (401, 403):
            return build_result(
                server=server_ip,
                check_type=CHECK_TYPE,
                service_name=SERVICE_NAME,
                status=CheckStatus.CRITICAL,
                message="Invalid or expired API token",
                details={"http_status": code},
            )
        snippet = exc.response.text[:300] if exc.response.text else ""
        return error_result(
            server_ip, CHECK_TYPE, SERVICE_NAME, f"HTTP {code}: {snippet}"
        )

    except Exception as exc:
        logger.exception("Events check failed: %s", server_ip)
        return error_result(server_ip, CHECK_TYPE, SERVICE_NAME, str(exc))
