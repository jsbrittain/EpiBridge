import mimetypes
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.schemas.execution_environment import ExecutionEnvironmentRead
from app.services.execution_environment_service import (
    get_artefact_root,
    get_environment_by_identifier,
    list_artefact_files,
    list_environments,
)

router = APIRouter(dependencies=[Depends(get_current_user)])


class ArtefactList(BaseModel):
    artefacts: list[str]


@router.get(
    "/execution-environments",
    response_model=List[ExecutionEnvironmentRead],
)
def get_execution_environments(
    db: Session = Depends(get_db),
):
    return list_environments(db, status="active")


@router.get(
    "/execution-environments/{identifier}",
    response_model=ExecutionEnvironmentRead,
)
def get_execution_environment(
    identifier: str,
    db: Session = Depends(get_db),
):
    env = get_environment_by_identifier(db, identifier)
    if env is None or env.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution environment not found",
        )
    return env


@router.get(
    "/execution-environments/{identifier}/artefacts",
    response_model=ArtefactList,
)
def list_environment_artefacts(
    identifier: str,
    db: Session = Depends(get_db),
):
    env = get_environment_by_identifier(db, identifier)
    if env is None or env.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution environment not found",
        )
    files = list_artefact_files(env)
    return ArtefactList(artefacts=files)


@router.get(
    "/execution-environments/{identifier}/artefacts/{path:path}",
    response_class=FileResponse,
)
def get_environment_artefact(
    identifier: str,
    path: str,
    db: Session = Depends(get_db),
):
    env = get_environment_by_identifier(db, identifier)
    if env is None or env.status != "active":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution environment not found",
        )

    artefact_root = get_artefact_root(env)
    if artefact_root is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artefact directory not available",
        )

    artefact_root = artefact_root.resolve()
    requested = (artefact_root / path).resolve()

    try:
        requested.relative_to(artefact_root)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Path traversal blocked",
        )

    if not requested.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artefact not found",
        )

    media_type, _ = mimetypes.guess_type(str(requested))
    if media_type is None:
        media_type = "application/octet-stream"

    return FileResponse(requested, media_type=media_type)
