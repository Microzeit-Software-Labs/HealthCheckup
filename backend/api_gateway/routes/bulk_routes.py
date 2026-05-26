"""
Bulk health check routes — dispatch checks across multiple servers in parallel.
Each server gets its own Celery tasks on the correct queue.
"""
from typing import Any, Dict, List, Optional

from celery.result import AsyncResult
from fastapi import APIRouter
from pydantic import BaseModel

from celery_app import celery_app
from models.server import ServerConfig
from workers.api_worker import run_all_api_checks
from workers.ssh_worker import run_all_ssh_checks

router = APIRouter(prefix="/bulk", tags=["Bulk Health Checks"])


class BulkCheckRequest(BaseModel):
    servers: List[ServerConfig]
    ssh_checks: Optional[List[str]] = None   # None = run all SSH checks
    api_checks: Optional[List[str]] = None   # None = run all API checks
    include_ssh: bool = True
    include_api: bool = True


class TaskRef(BaseModel):
    server_name: str
    server_ip: str
    check_layer: str
    task_id: str


@router.post("/check", summary="Dispatch health checks across multiple servers")
async def bulk_health_check(request: BulkCheckRequest):
    dispatched: List[Dict[str, Any]] = []

    for server in request.servers:
        server_dict = server.model_dump()

        if request.include_ssh:
            task = run_all_ssh_checks.apply_async(
                args=[server_dict, request.ssh_checks],
                queue="ssh_queue",
            )
            dispatched.append({
                "server_name": server.name,
                "server_ip": server.ip,
                "check_layer": "ssh",
                "task_id": task.id,
            })

        if request.include_api and server.api_base_url:
            task = run_all_api_checks.apply_async(
                args=[server_dict, request.api_checks],
                queue="api_queue",
            )
            dispatched.append({
                "server_name": server.name,
                "server_ip": server.ip,
                "check_layer": "api",
                "task_id": task.id,
            })

    return {
        "status": "queued",
        "total_tasks": len(dispatched),
        "tasks": dispatched,
    }


@router.post("/results", summary="Collect results for a list of task IDs")
async def bulk_results(task_ids: List[str]):
    results = []
    for task_id in task_ids:
        result = AsyncResult(task_id, app=celery_app)
        entry: Dict[str, Any] = {"task_id": task_id, "status": result.state.lower()}

        if result.state == "SUCCESS":
            entry["result"] = result.result
        elif result.state == "FAILURE":
            entry["error"] = str(result.result)

        results.append(entry)

    completed = sum(1 for r in results if r["status"] == "success")
    pending = sum(1 for r in results if r["status"] in ("pending", "started"))

    return {
        "total": len(results),
        "completed": completed,
        "pending": pending,
        "tasks": results,
    }
