"""
SSH health check routes.
Delegates to ssh_worker (ssh_queue). No SSH logic here.
"""
from typing import List, Optional

from celery.result import AsyncResult
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from celery_app import celery_app
from models.server import ServerConfig
from workers.ssh_worker import SSH_CHECKS, run_all_ssh_checks, run_ssh_check

router = APIRouter(prefix="/ssh", tags=["SSH Health Checks"])

VALID_CHECKS = list(SSH_CHECKS.keys()) + ["ping"]


class SSHCheckRequest(BaseModel):
    server: ServerConfig
    checks: Optional[List[str]] = None


@router.post("/check/{check_name}", summary="Trigger a specific SSH health check")
async def trigger_ssh_check(check_name: str, request: SSHCheckRequest):
    if check_name not in VALID_CHECKS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown check '{check_name}'. Valid: {VALID_CHECKS}",
        )
    task = run_ssh_check.apply_async(
        args=[request.server.model_dump(), check_name],
        queue="ssh_queue",
    )
    return {"task_id": task.id, "status": "queued", "check": check_name, "server": request.server.ip}


@router.post("/check/all/run", summary="Trigger all SSH health checks for a server")
async def trigger_all_ssh_checks(request: SSHCheckRequest):
    invalid = [c for c in (request.checks or []) if c not in VALID_CHECKS]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unknown checks: {invalid}")

    task = run_all_ssh_checks.apply_async(
        args=[request.server.model_dump(), request.checks],
        queue="ssh_queue",
    )
    return {"task_id": task.id, "status": "queued", "server": request.server.ip}


@router.get("/result/{task_id}", summary="Poll SSH check task result")
async def get_ssh_result(task_id: str):
    result = AsyncResult(task_id, app=celery_app)

    if result.state == "PENDING":
        return {"task_id": task_id, "status": "pending"}
    if result.state == "STARTED":
        return {"task_id": task_id, "status": "running"}
    if result.state == "FAILURE":
        return {"task_id": task_id, "status": "failed", "error": str(result.result)}
    if result.state == "SUCCESS":
        return {"task_id": task_id, "status": "completed", "result": result.result}

    return {"task_id": task_id, "status": result.state.lower()}
