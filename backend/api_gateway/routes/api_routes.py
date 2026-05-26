"""
API health check routes.
Delegates to api_worker (api_queue). No HTTP client logic here.
"""
from typing import List, Optional

from celery.result import AsyncResult
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from celery_app import celery_app
from models.server import ServerConfig
from workers.api_worker import API_CHECKS, run_all_api_checks, run_api_check

router = APIRouter(prefix="/api-checks", tags=["API Health Checks"])

VALID_CHECKS = list(API_CHECKS.keys())


class APICheckRequest(BaseModel):
    server: ServerConfig
    checks: Optional[List[str]] = None


@router.post("/check/{check_name}", summary="Trigger a specific API health check")
async def trigger_api_check(check_name: str, request: APICheckRequest):
    if check_name not in VALID_CHECKS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown check '{check_name}'. Valid: {VALID_CHECKS}",
        )
    if not request.server.api_base_url:
        raise HTTPException(status_code=400, detail="api_base_url is required for API checks")

    task = run_api_check.apply_async(
        args=[request.server.model_dump(), check_name],
        queue="api_queue",
    )
    return {"task_id": task.id, "status": "queued", "check": check_name, "server": request.server.ip}


@router.post("/check/all/run", summary="Trigger all API health checks for a server")
async def trigger_all_api_checks(request: APICheckRequest):
    if not request.server.api_base_url:
        raise HTTPException(status_code=400, detail="api_base_url is required for API checks")

    invalid = [c for c in (request.checks or []) if c not in VALID_CHECKS]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unknown checks: {invalid}")

    task = run_all_api_checks.apply_async(
        args=[request.server.model_dump(), request.checks],
        queue="api_queue",
    )
    return {"task_id": task.id, "status": "queued", "server": request.server.ip}


@router.get("/result/{task_id}", summary="Poll API check task result")
async def get_api_result(task_id: str):
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
