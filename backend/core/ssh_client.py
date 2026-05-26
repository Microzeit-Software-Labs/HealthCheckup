"""
SSH client abstraction. ONLY used by SSH service layer and SSH workers.
Never import this in api/ services or api_worker.
"""
import logging
from typing import Optional, Tuple

import paramiko

from core.config import settings

logger = logging.getLogger(__name__)


class SSHClient:
    def __init__(
        self,
        host: str,
        username: str,
        password: Optional[str] = None,
        key_path: Optional[str] = None,
        port: int = 22,
        timeout: Optional[int] = None,
    ) -> None:
        self.host = host
        self.username = username
        self.password = password
        self.key_path = key_path
        self.port = port
        self.timeout = timeout or settings.SSH_TIMEOUT
        self._client: Optional[paramiko.SSHClient] = None

    def connect(self) -> None:
        self._client = paramiko.SSHClient()
        self._client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        kwargs: dict = {
            "hostname": self.host,
            "port": self.port,
            "username": self.username,
            "timeout": self.timeout,
            "banner_timeout": settings.SSH_CONNECT_TIMEOUT,
            "allow_agent": False,
            "look_for_keys": False,
        }

        if self.key_path:
            kwargs["key_filename"] = self.key_path
        elif self.password:
            kwargs["password"] = self.password

        self._client.connect(**kwargs)
        logger.info("SSH connected: %s", self.host)

    def disconnect(self) -> None:
        if self._client:
            self._client.close()
            self._client = None
            logger.info("SSH disconnected: %s", self.host)

    def execute(self, command: str) -> Tuple[str, str, int]:
        if not self._client:
            raise RuntimeError("SSH client not connected")

        _, stdout, stderr = self._client.exec_command(command, timeout=self.timeout)
        exit_code = stdout.channel.recv_exit_status()
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")

        return out, err, exit_code

    def __enter__(self) -> "SSHClient":
        self.connect()
        return self

    def __exit__(self, *_) -> None:
        self.disconnect()
