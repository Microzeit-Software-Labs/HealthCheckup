from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api_gateway.routes import api_routes, bulk_routes, ssh_routes
from core.config import settings
from utils.logger import setup_logging

setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Modular health check system — SSH and API layers strictly separated.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ssh_routes.router, prefix="/v1")
app.include_router(api_routes.router, prefix="/v1")
app.include_router(bulk_routes.router, prefix="/v1")


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "service": settings.APP_NAME}


@app.get("/v1/checks/registry", tags=["System"])
async def checks_registry():
    """List all registered health checks per layer."""
    from workers.ssh_worker import SSH_CHECKS
    from workers.api_worker import API_CHECKS

    return {
        "ssh_checks": list(SSH_CHECKS.keys()) + ["ping"],
        "api_checks": list(API_CHECKS.keys()),
    }
