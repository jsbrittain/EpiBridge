import uuid
from datetime import datetime

from pydantic import BaseModel


class TermsOfServiceRead(BaseModel):
    id: uuid.UUID
    terms_type: str
    data_resource_id: uuid.UUID | None
    version: str
    title: str
    content: str
    published_by_id: uuid.UUID
    published_at: datetime

    model_config = {"from_attributes": True}


class TermsOfServicePublish(BaseModel):
    version: str
    title: str
    content: str
