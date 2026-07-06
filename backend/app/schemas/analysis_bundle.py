import uuid
from datetime import datetime

from pydantic import BaseModel


class AnalysisBundleCreate(BaseModel):
    name: str
    runtime: str
    version: str
    entrypoint: str
    description: str = ""
    resource_identifiers: list[str] = []
    outputs: list[str] = []
    parameters: dict = {}


class AnalysisBundleRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    created_by_id: uuid.UUID
    name: str
    runtime: str
    version: str
    entrypoint: str
    description: str
    resource_identifiers: list[str] = []
    outputs: list[str] = []
    parameters: dict = {}
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
