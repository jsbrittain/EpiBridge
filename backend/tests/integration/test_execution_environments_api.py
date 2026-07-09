import tempfile
from pathlib import Path

import pytest

from app.core.config import settings
from app.models.execution_environment import ExecutionEnvironment


@pytest.fixture
def seeded_environments(db_session):
    environments = [
        ExecutionEnvironment(
            identifier="python-3.13-scientific",
            name="Python 3.13 Scientific",
            runtime="python-3.13",
            description="NumPy, SciPy, Pandas",
            status="active",
        ),
        ExecutionEnvironment(
            identifier="r-4.5-tidyverse",
            name="R 4.5 Tidyverse",
            runtime="r-4.5",
            description="tidyverse, dplyr, ggplot2",
            status="active",
        ),
        ExecutionEnvironment(
            identifier="deprecated-env",
            name="Deprecated Env",
            runtime="python-3.10",
            description="Old environment",
            status="deprecated",
        ),
    ]
    for e in environments:
        db_session.add(e)
    db_session.commit()
    for e in environments:
        db_session.refresh(e)
    return environments


@pytest.fixture
def artefact_env_with_dir(db_session):
    with tempfile.TemporaryDirectory() as tmpdir:
        artefact_dir = Path(tmpdir) / "test-artefact-env"
        artefact_dir.mkdir()
        (artefact_dir / "Dockerfile").write_text("FROM python:3.13-slim\n")
        (artefact_dir / "manifest.yaml").write_text("identifier: test-artefact-env\n")

        original_dir = settings.environment_manifest_dir
        settings.environment_manifest_dir = tmpdir
        try:
            env = ExecutionEnvironment(
                identifier="test-artefact-env",
                name="Test Artefact Env",
                runtime="python-3.13",
                description="Has artefacts",
                status="active",
                definition_path="test-artefact-env",
            )
            db_session.add(env)
            db_session.commit()
            db_session.refresh(env)
            yield env
        finally:
            settings.environment_manifest_dir = original_dir


class TestExecutionEnvironmentsAPI:
    def test_list_active_only(self, client, admin_user, seeded_environments):
        response = client.get("/api/execution-environments")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        names = {e["name"] for e in data}
        assert "Python 3.13 Scientific" in names
        assert "R 4.5 Tidyverse" in names
        assert "Deprecated Env" not in names

    def test_returns_fields(self, client, admin_user, seeded_environments):
        response = client.get("/api/execution-environments")
        assert response.status_code == 200
        env = response.json()[0]
        assert "id" in env
        assert "identifier" in env
        assert "name" in env
        assert "runtime" in env
        assert "description" in env
        assert "status" in env
        assert "image_reference" in env
        assert "created_at" in env
        assert "updated_at" in env
        assert "definition_path" not in env

    def test_ordered_by_name(self, client, admin_user, seeded_environments):
        response = client.get("/api/execution-environments")
        data = response.json()
        names = [e["name"] for e in data]
        assert names == sorted(names)

    def test_get_by_identifier(self, client, admin_user, seeded_environments):
        response = client.get("/api/execution-environments/python-3.13-scientific")
        assert response.status_code == 200
        data = response.json()
        assert data["identifier"] == "python-3.13-scientific"
        assert data["name"] == "Python 3.13 Scientific"
        assert data["runtime"] == "python-3.13"
        assert "definition_path" not in data

    def test_get_by_identifier_not_found(self, client, admin_user, seeded_environments):
        response = client.get("/api/execution-environments/nonexistent")
        assert response.status_code == 404

    def test_get_by_identifier_deprecated(
        self, client, admin_user, seeded_environments
    ):
        response = client.get("/api/execution-environments/deprecated-env")
        assert response.status_code == 404

    def test_list_artefacts_no_definition_path(
        self, client, admin_user, seeded_environments
    ):
        response = client.get(
            "/api/execution-environments/python-3.13-scientific/artefacts"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["artefacts"] == []

    def test_list_artefacts_with_dir(self, client, admin_user, artefact_env_with_dir):
        response = client.get(
            f"/api/execution-environments/{artefact_env_with_dir.identifier}/artefacts"
        )
        assert response.status_code == 200
        data = response.json()
        assert "Dockerfile" in data["artefacts"]
        assert "manifest.yaml" in data["artefacts"]

    def test_get_artefact_file(self, client, admin_user, artefact_env_with_dir):
        response = client.get(
            f"/api/execution-environments/{artefact_env_with_dir.identifier}/artefacts/Dockerfile"
        )
        assert response.status_code == 200
        assert response.text == "FROM python:3.13-slim\n"

    def test_get_artefact_nonexistent_file(
        self, client, admin_user, artefact_env_with_dir
    ):
        response = client.get(
            f"/api/execution-environments/{artefact_env_with_dir.identifier}/artefacts/README.md"
        )
        assert response.status_code == 404

    def test_artefact_path_traversal_blocked(
        self, client, admin_user, artefact_env_with_dir
    ):
        root = Path(settings.environment_manifest_dir)
        trap = root / "secret.txt"
        trap.write_text("should not be served")
        try:
            response = client.get(
                f"/api/execution-environments/{artefact_env_with_dir.identifier}/artefacts/%2e%2e%2fsecret.txt"
            )
            assert response.status_code == 403
        finally:
            trap.unlink()

    def test_artefact_nonexistent_environment(
        self, client, admin_user, seeded_environments
    ):
        response = client.get("/api/execution-environments/nonexistent/artefacts")
        assert response.status_code == 404
