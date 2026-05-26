import uuid
from typing import Optional

from pydantic import BaseModel, Field


class ServerConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    ip: str
    ssh_port: int = 22
    ssh_username: Optional[str] = None
    ssh_password: Optional[str] = None   # Fernet-encrypted
    ssh_key_path: Optional[str] = None
    api_base_url: Optional[str] = None
    api_token: Optional[str] = None      # Fernet-encrypted

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Production Server 1",
                "ip": "192.168.1.100",
                "ssh_username": "admin",
                "ssh_password": "<encrypted>",
                "api_base_url": "http://192.168.1.100",
                "api_token": "<encrypted>",
            }
        }
    }
