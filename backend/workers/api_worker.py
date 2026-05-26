"""
API Worker — Celery tasks for HTTP API-based health checks.

Queued on: api_queue
Strict rule: NO SSH calls, NO paramiko, NO core.ssh_client imports here.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import redis

from celery_app import celery_app
from core.api_client import APIClient
from core.config import settings
from core.security import decrypt
from models.health_check import CheckStatus, CheckType
from models.server import ServerConfig
from services.api import events_service

logger = logging.getLogger(__name__)

_cache: redis.Redis = redis.from_url(settings.REDIS_URL, decode_responses=True)

API_CHECKS: Dict[str, Any] = {
    "events": events_service.run_check,
}


def _cache_key(server_ip: str, check_name: str) -> str:
    return f"hc:api:{server_ip}:{check_name}"


def _get_cached(server_ip: str, check_name: str) -> Optional[Dict[str, Any]]:
    raw = _cache.get(_cache_key(server_ip, check_name))
    return json.loads(raw) if raw else None


def _set_cached(server_ip: str, check_name: str, result: Dict[str, Any]) -> None:
    _cache.setex(_cache_key(server_ip, check_name), settings.CACHE_TTL, json.dumps(result))


def _unknown_result(server_ip: str, check_name: str, message: str) -> Dict[str, Any]:
    return {
        "server": server_ip,
        "check_type": CheckType.API,
        "service_name": check_name,
        "status": CheckStatus.UNKNOWN,
        "message": message,
        "details": {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@celery_app.task(
    bind=True,
    name="workers.api_worker.run_api_check",
    queue="api_queue",
    max_retries=2,
    default_retry_delay=5,
    time_limit=60,
    soft_time_limit=50,
)
def run_api_check(self, server_config: dict, check_name: str) -> Dict[str, Any]:
    """Run a single API health check."""
    server = ServerConfig(**server_config)

    cached = _get_cached(server.ip, check_name)
    if cached:
        logger.debug("Cache hit: %s:%s", server.ip, check_name)
        return cached

    if check_name not in API_CHECKS:
        return _unknown_result(server.ip, check_name, f"Unknown API check: {check_name}")

    if not server.api_base_url:
        return _unknown_result(server.ip, check_name, "api_base_url not configured for this server")

    try:
        token = decrypt(server.api_token) if server.api_token else None
        api_client = APIClient(base_url=server.api_base_url, token=token)

        result = asyncio.run(API_CHECKS[check_name](server.ip, api_client))

        result_dict = result.model_dump()
        _set_cached(server.ip, check_name, result_dict)
        return result_dict

    except Exception as exc:
        logger.exception("API worker error: %s:%s", server.ip, check_name)
        raise self.retry(exc=exc)


@celery_app.task(
    name="workers.api_worker.run_all_api_checks",
    queue="api_queue",
    time_limit=180,
    soft_time_limit=170,
)
def run_all_api_checks(
    server_config: dict,
    checks: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """Run all API checks for a server."""
    server = ServerConfig(**server_config)
    check_names = checks if checks is not None else list(API_CHECKS.keys())

    if not server.api_base_url:
        return [
            _unknown_result(server.ip, name, "api_base_url not configured")
            for name in check_names
        ]

    results: List[Dict[str, Any]] = []
    token = decrypt(server.api_token) if server.api_token else None
    api_client = APIClient(base_url=server.api_base_url, token=token)

    for name in check_names:
        cached = _get_cached(server.ip, name)
        if cached:
            results.append(cached)
            continue

        if name not in API_CHECKS:
            results.append(_unknown_result(server.ip, name, f"Unknown check: {name}"))
            continue

        try:
            result = asyncio.run(API_CHECKS[name](server.ip, api_client))
            r = result.model_dump()
            _set_cached(server.ip, name, r)
            results.append(r)
        except Exception as exc:
            logger.exception("API bulk check error: %s:%s", server.ip, name)
            results.append(_unknown_result(server.ip, name, str(exc)))

    return results
