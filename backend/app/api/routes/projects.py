import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.schemas.analysis_bundle import AnalysisBundleCreate, AnalysisBundleRead
from app.schemas.project import ProjectCreate, ProjectRead
from app.services.analysis_bundle_service import (
    create_bundle,
    get_resource_identifiers,
)
from app.services.project_service import create_project, list_projects

router = APIRouter()


@router.get("/projects", response_model=List[ProjectRead])
def get_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_projects(db, owner_id=current_user.id)


@router.post("/projects", response_model=ProjectRead, status_code=201)
def post_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_project(db, data, owner_id=current_user.id)


@router.post(
    "/projects/{project_id}/bundles",
    response_model=AnalysisBundleRead,
    status_code=201,
)
def post_project_bundle(
    project_id: uuid.UUID,
    data: AnalysisBundleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    bundle = create_bundle(db, data.model_dump(), project_id, current_user.id)
    return AnalysisBundleRead(
        id=bundle.id,
        project_id=bundle.project_id,
        created_by_id=bundle.created_by_id,
        name=bundle.name,
        runtime=bundle.runtime,
        version=bundle.version,
        entrypoint=bundle.entrypoint,
        description=bundle.description,
        resource_identifiers=get_resource_identifiers(bundle),
        outputs=bundle.outputs,
        parameters=bundle.parameters,
        created_at=bundle.created_at,
        updated_at=bundle.updated_at,
    )
