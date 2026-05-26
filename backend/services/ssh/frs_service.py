"""
SSH-ONLY service — FindFace (FRS) health check.
Supports both deployment modes:
  - Legacy (FindFace Security 1.2): findface-status CLI
  - Docker  (FindFace Security 2.1+): docker ps

No HTTP. No API calls. No imports from core.api_client or services/api/.
"""
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from core.ssh_client import SSHClient
from models.health_check import CheckStatus, CheckType, HealthCheckResult
from utils.response import build_result, error_result

logger = logging.getLogger(__name__)

SERVICE_NAME = "frs"
CHECK_TYPE   = CheckType.SSH

# Container name fragments that identify FindFace-related workloads
_FF_CONTAINER_PATTERNS = (
    "findface", "ffsecurity", "ffserver",
    "postgres", "rabbitmq", "redis", "nginx",
    "extraction", "upload", "video-worker",
)

# findface-status line states
_LEGACY_FAILED_STATES = ("stopped", "failed", "inactive", "degraded", "error")

# Log keywords worth surfacing
_LOG_KEYWORDS = ("error", "critical", "fatal", "exception", "panic", "failed to")


# ─── Version detection ────────────────────────────────────────────────────────

def _detect_deployment(ssh: SSHClient) -> Tuple[str, str]:
    """
    Returns (deployment_mode, detected_version).
    deployment_mode: "legacy" | "docker" | "unknown"
    detected_version: "1.2"   | "2.1+"   | "unknown"
    """
    out, _, rc = ssh.execute("command -v findface-status 2>/dev/null; echo $?")
    lines = out.strip().splitlines()
    exit_code = lines[-1].strip() if lines else "1"

    if exit_code == "0":
        return "legacy", "1.2"

    out, _, _ = ssh.execute("docker ps --format '{{.Names}}' 2>/dev/null")
    containers = out.lower()
    if any(pat in containers for pat in _FF_CONTAINER_PATTERNS):
        return "docker", "2.1+"

    return "unknown", "unknown"


# ─── Legacy mode (1.2) ───────────────────────────────────────────────────────

def _parse_legacy_status(output: str) -> List[Dict[str, Any]]:
    """
    Parse `findface-status` output into a list of service dicts.
    Handles variable indentation and prefix-less lines.
    """
    services: List[Dict[str, Any]] = []

    for line in output.splitlines():
        line = line.strip()
        if not line:
            continue

        # Each output line is expected to be:  <service-name>: <state> [detail]
        match = re.match(r"^([\w\-]+)\s*:\s*(.+)$", line)
        if not match:
            continue

        name, rest = match.group(1).strip(), match.group(2).strip()
        state_lower = rest.lower()
        failed = any(s in state_lower for s in _LEGACY_FAILED_STATES)

        services.append({
            "name":    name,
            "state":   rest,
            "healthy": not failed,
            "failed":  failed,
        })

    return services


def _run_legacy_check(server_ip: str, ssh: SSHClient) -> HealthCheckResult:
    status_out, _, _ = ssh.execute("findface-status 2>&1")
    services = _parse_legacy_status(status_out)

    failed = [s for s in services if s["failed"]]
    healthy = [s for s in services if s["healthy"]]
    warnings: List[str] = []

    # Pull last journal errors only when something is wrong
    error_logs: List[str] = []
    if failed:
        j_out, _, _ = ssh.execute(
            "journalctl -u 'findface-*' -n 50 --no-pager 2>&1"
        )
        error_logs = [
            ln.strip()
            for ln in j_out.splitlines()
            if any(kw in ln.lower() for kw in _LOG_KEYWORDS)
        ][-10:]

    total = len(services)

    if total == 0:
        check_status = CheckStatus.CRITICAL
        message = "findface-status returned no services"
    elif not failed:
        check_status = CheckStatus.HEALTHY
        message = f"All {total} FRS services running"
    elif len(failed) < total:
        check_status = CheckStatus.WARNING
        message = f"{len(failed)}/{total} FRS services degraded"
        warnings = [f"{s['name']}: {s['state']}" for s in failed]
    else:
        check_status = CheckStatus.CRITICAL
        message = "All FRS services failed"

    return build_result(
        server=server_ip,
        check_type=CHECK_TYPE,
        service_name=SERVICE_NAME,
        status=check_status,
        message=message,
        details={
            "deployment_mode":  "legacy",
            "detected_version": "1.2",
            "parsed_services":  services,
            "healthy_count":    len(healthy),
            "failed_count":     len(failed),
            "warnings":         warnings,
            "error_logs":       error_logs,
        },
    )


# ─── Docker mode (2.1+) ──────────────────────────────────────────────────────

def _is_findface_container(name: str) -> bool:
    name_lower = name.lower()
    return any(pat in name_lower for pat in _FF_CONTAINER_PATTERNS)


def _parse_container_status(raw_status: str) -> Tuple[str, bool, Optional[str]]:
    """
    Returns (normalised_state, is_healthy, problem_detail).
    raw_status is docker ps .Status field, e.g. "Up 2 hours (healthy)".
    """
    s = raw_status.lower().strip()

    if s.startswith("up"):
        if "(unhealthy)" in s:
            return "unhealthy", False, "container unhealthy"
        if "restarting" in s:
            return "restarting", False, "container in restart loop"
        return "running", True, None

    if s.startswith("restarting"):
        return "restarting", False, "container in restart loop"

    if s.startswith("exited") or s.startswith("dead"):
        code_match = re.search(r"exited\s*\((\d+)\)", s)
        code = code_match.group(1) if code_match else "?"
        return "exited", False, f"exited with code {code}"

    if s.startswith("created"):
        return "created", False, "container created but never started"

    if s.startswith("paused"):
        return "paused", False, "container paused"

    return s or "unknown", False, "unknown state"


def _parse_docker_containers(docker_out: str) -> List[Dict[str, Any]]:
    containers: List[Dict[str, Any]] = []

    for line in docker_out.splitlines():
        line = line.strip()
        if not line or "|" not in line:
            continue

        parts = line.split("|", 1)
        if len(parts) != 2:
            continue

        name, raw_status = parts[0].strip(), parts[1].strip()
        if not _is_findface_container(name):
            continue

        state, healthy, problem = _parse_container_status(raw_status)
        containers.append({
            "name":       name,
            "state":      state,
            "raw_status": raw_status,
            "healthy":    healthy,
            "problem":    problem,
        })

    return containers


def _run_docker_check(server_ip: str, ssh: SSHClient) -> HealthCheckResult:
    docker_out, _, _ = ssh.execute(
        "docker ps --format '{{.Names}}|{{.Status}}' 2>&1"
    )
    containers = _parse_docker_containers(docker_out)

    unhealthy = [c for c in containers if not c["healthy"]]
    healthy   = [c for c in containers if c["healthy"]]
    warnings  = [f"{c['name']}: {c['problem']}" for c in unhealthy if c["problem"]]
    total     = len(containers)

    # Classify severity
    exited      = [c for c in unhealthy if c["state"] == "exited"]
    restarting  = [c for c in unhealthy if c["state"] == "restarting"]
    unhealthy_h = [c for c in unhealthy if c["state"] == "unhealthy"]

    if total == 0:
        check_status = CheckStatus.CRITICAL
        message = "No FindFace containers found on this host"
    elif not unhealthy:
        check_status = CheckStatus.HEALTHY
        message = f"All {total} FindFace containers running"
    elif exited:
        check_status = CheckStatus.CRITICAL
        message = (
            f"{len(exited)} container(s) exited"
            + (f", {len(restarting)} restarting" if restarting else "")
        )
    elif restarting or unhealthy_h:
        check_status = CheckStatus.WARNING
        message = f"{len(unhealthy)}/{total} containers degraded"
    else:
        check_status = CheckStatus.WARNING
        message = f"{len(unhealthy)}/{total} containers not fully healthy"

    return build_result(
        server=server_ip,
        check_type=CHECK_TYPE,
        service_name=SERVICE_NAME,
        status=check_status,
        message=message,
        details={
            "deployment_mode":  "docker",
            "detected_version": "2.1+",
            "parsed_services":  containers,
            "healthy_count":    len(healthy),
            "failed_count":     len(unhealthy),
            "warnings":         warnings,
        },
    )


# ─── Entry point ─────────────────────────────────────────────────────────────

def run_check(server_ip: str, ssh_client: SSHClient) -> HealthCheckResult:
    try:
        mode, version = _detect_deployment(ssh_client)
        logger.debug("FRS detection: %s → mode=%s version=%s", server_ip, mode, version)

        if mode == "legacy":
            return _run_legacy_check(server_ip, ssh_client)

        if mode == "docker":
            return _run_docker_check(server_ip, ssh_client)

        return build_result(
            server=server_ip,
            check_type=CHECK_TYPE,
            service_name=SERVICE_NAME,
            status=CheckStatus.UNKNOWN,
            message="Could not detect FindFace deployment (neither legacy nor Docker found)",
            details={
                "deployment_mode":  "unknown",
                "detected_version": "unknown",
                "parsed_services":  [],
                "healthy_count":    0,
                "failed_count":     0,
                "warnings":         ["findface-status not found; no FindFace Docker containers detected"],
            },
        )

    except Exception as exc:
        logger.exception("FRS check failed: %s", server_ip)
        return error_result(server_ip, CHECK_TYPE, SERVICE_NAME, str(exc))
