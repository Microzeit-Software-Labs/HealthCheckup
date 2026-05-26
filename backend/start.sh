#!/bin/bash
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  echo "Run ./setup.sh first."
  exit 1
fi

export $(grep -v '^#' .env.local | xargs)

# Start Redis (Docker, no venv needed)
echo "==> Starting Redis..."
docker run --rm -d --name hc-redis-local --runtime runc -p 6379:6379 redis:7-alpine > /dev/null
trap 'echo "Stopping..."; docker stop hc-redis-local 2>/dev/null; kill 0' EXIT INT TERM

echo "==> Waiting for Redis..."
for i in $(seq 1 15); do
  docker exec hc-redis-local redis-cli ping 2>/dev/null | grep -q PONG && break
  sleep 1
done

echo "==> Starting FastAPI, SSH worker, API worker..."
echo "    Logs below. Ctrl+C to stop all."
echo ""

.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8077 --reload 2>&1 | sed 's/^/[api]     /' &
.venv/bin/celery -A celery_app worker --queues=ssh_queue --concurrency=4 --loglevel=warning --hostname=ssh@%h 2>&1 | sed 's/^/[ssh]     /' &
.venv/bin/celery -A celery_app worker --queues=api_queue --concurrency=8 --loglevel=warning --hostname=api@%h 2>&1 | sed 's/^/[api-wrk] /' &

wait
