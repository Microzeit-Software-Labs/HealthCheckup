"""
API client abstraction. ONLY used by API service layer and API workers.
Never import this in ssh/ services or ssh_worker.
"""
import logging
from typing import Any, Dict, Optional

import httpx

from core.config import settings

logger = logging.getLogger(__name__)


class APIClient:
    def __init__(
        self,
        base_url: str,
        token: Optional[str] = None,
        timeout: Optional[int] = None,
        retry_count: Optional[int] = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout = timeout or settings.API_TIMEOUT
        self.retry_count = retry_count or settings.API_RETRY_COUNT

    def _headers(self) -> Dict[str, str]:
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Token {self.token}"
        return headers

    async def get(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Any:
        url = f"{self.base_url}/{path.lstrip('/')}"
        last_error: Exception = RuntimeError("No attempts made")

        for attempt in range(1, self.retry_count + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(url, headers=self._headers(), params=params)
                    response.raise_for_status()
                    return response.json()
            except httpx.TimeoutException as exc:
                last_error = exc
                logger.warning("API timeout attempt %d/%d: %s", attempt, self.retry_count, url)
            except httpx.HTTPStatusError:
                raise
            except Exception as exc:
                last_error = exc
                logger.warning("API error attempt %d/%d: %s", attempt, self.retry_count, exc)

        raise last_error
