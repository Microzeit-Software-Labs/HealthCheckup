"""
SSH Worker — Celery tasks for SSH-based health checks.

Queued on: ssh_queue
Strict rule: NO API calls, NO httpx, NO core.api_client imports here.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import redis

from celery_app import celery_app
from core.config import settings
from core.security import decrypt
from core.ssh_client import SSHClient
from models.health_check import CheckStatus, CheckType
from models.server import ServerConfig
from services.ssh import (
    camera_service,
    frs_service,
    integration_service,
    license_service,
    ping_service,
    storage_service,
)

logger = logging.getLogger(__name__)

_cache: redis.Redis = redis.from_url(settings.REDIS_URL, decode_responses=True)

SSH_CHECKS: Dict[str, Any] = {
    "storage": storage_service.run_check,
    "frs": frs_service.run_check,
    "integration": integration_service.run_check,
    "camera": camera_service.run_check,
    "license": license_service.run_check,
}


def _cache_key(server_ip: str, check_name: str) -> str:
    return f"hc:ssh:{server_ip}:{check_name}"


def _get_cached(server_ip: str, check_name: str) -> Optional[Dict[str, Any]]:
    raw = _cache.get(_cache_key(server_ip, check_name))
    return json.loads(raw) if raw else None


def _set_cached(server_ip: str, check_name: str, result: Dict[str, Any]) -> None:
    _cache.setex(_cache_key(server_ip, check_name), settings.CACHE_TTL, json.dumps(result))


def _unknown_result(server_ip: str, check_name: str, message: str) -> Dict[str, Any]:
    return {
        "server": server_ip,
        "check_type": CheckType.SSH,
        "service_name": check_name,
        "status": CheckStatus.UNKNOWN,
        "message": message,
        "details": {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@celery_app.task(
    bind=True,
    name="workers.ssh_worker.run_ssh_check",
    queue="ssh_queue",
    max_retries=2,
    default_retry_delay=5,
    time_limit=60,
    soft_time_limit=50,
)
def run_ssh_check(self, server_config: dict, check_name: str) -> Dict[str, Any]:
    """Run a single SSH health check. Opens its own SSH connection."""
    server = ServerConfig(**server_config)

    cached = _get_cached(server.ip, check_name)
    if cached:
        logger.debug("Cache hit: %s:%s", server.ip, check_name)
        return cached

    if check_name not in SSH_CHECKS and check_name != "ping":
        return _unknown_result(server.ip, check_name, f"Unknown SSH check: {check_name}")

    try:
        password = decrypt(server.ssh_password) if server.ssh_password else None

        with SSHClient(
            host=server.ip,
            username=server.ssh_username,
            password=password,
            key_path=server.ssh_key_path,
            port=server.ssh_port,
        ) as ssh:
            if check_name == "ping":
                result = ping_service.run_check(server.ip, server.ip, ssh)
            else:
                result = SSH_CHECKS[check_name](server.ip, ssh)

        result_dict = result.model_dump()
        _set_cached(server.ip, check_name, result_dict)
        return result_dict

    except Exception as exc:
        logger.exception("SSH worker error: %s:%s", server.ip, check_name)
        raise self.retry(exc=exc)


@celery_app.task(
    name="workers.ssh_worker.run_all_ssh_checks",
    queue="ssh_queue",
    time_limit=180,
    soft_time_limit=170,
)
def run_all_ssh_checks(
    server_config: dict,
    checks: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Run all SSH checks in a single SSH session for efficiency.
    Opens one connection, executes all checks, closes connection.
    """
    server = ServerConfig(**server_config)
    check_names = checks if checks is not None else (list(SSH_CHECKS.keys()) + ["ping"])
    results: List[Dict[str, Any]] = []

    try:
        password = decrypt(server.ssh_password) if server.ssh_password else None

        with SSHClient(
            host=server.ip,
            username=server.ssh_username,
            password=password,
            key_path=server.ssh_key_path,
            port=server.ssh_port,
        ) as ssh:
            for name in check_names:
                cached = _get_cached(server.ip, name)
                if cached:
                    results.append(cached)
                    continue

                if name == "ping":
                    result = ping_service.run_check(server.ip, server.ip, ssh)
                elif name in SSH_CHECKS:
                    result = SSH_CHECKS[name](server.ip, ssh)
                else:
                    results.append(_unknown_result(server.ip, name, f"Unknown check: {name}"))
                    continue

                r = result.model_dump()
                _set_cached(server.ip, name, r)
                results.append(r)

    except Exception as exc:
        logger.warning("SSH bulk check connection failed: %s — %s", server.ip, exc)
        checked = {r["service_name"] for r in results}
        for name in check_names:
            if name not in checked:
                results.append(
                    _unknown_result(server.ip, name, f"Connection failed: {exc}")
                )

    return results
