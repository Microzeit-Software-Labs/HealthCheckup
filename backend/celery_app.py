from celery import Celery

from core.config import settings

celery_app = Celery(
    "health_check",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "workers.ssh_worker",
        "workers.api_worker",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=300,
    task_routes={
        "workers.ssh_worker.*": {"queue": "ssh_queue"},
        "workers.api_worker.*": {"queue": "api_queue"},
    },
    task_default_queue="default",
    broker_connection_retry_on_startup=True,
    worker_send_task_events=True,
    task_send_sent_event=True,
)
