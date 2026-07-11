"""Add terms_of_service and terms_acceptance tables

Revision ID: 4a9e8f3c7b5f
Revises: 3a9e8f3c7b5e
Create Date: 2026-07-10 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "4a9e8f3c7b5f"
down_revision: Union[str, None] = "3a9e8f3c7b5e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "terms_of_service",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("terms_type", sa.String(length=50), nullable=False),
        sa.Column("data_resource_id", sa.UUID(), nullable=True),
        sa.Column("version", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("published_by_id", sa.UUID(), nullable=False),
        sa.Column(
            "published_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["data_resource_id"],
            ["data_resources.id"],
        ),
        sa.ForeignKeyConstraint(
            ["published_by_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "terms_type", "data_resource_id", "version", name="uq_terms_version"
        ),
    )
    op.create_index(
        op.f("ix_terms_of_service_terms_type"),
        "terms_of_service",
        ["terms_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_terms_of_service_data_resource_id"),
        "terms_of_service",
        ["data_resource_id"],
        unique=False,
    )
    op.create_table(
        "terms_acceptance",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("terms_of_service_id", sa.UUID(), nullable=False),
        sa.Column(
            "accepted_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["terms_of_service_id"],
            ["terms_of_service.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id", "terms_of_service_id", name="uq_user_terms_acceptance"
        ),
    )
    op.create_index(
        op.f("ix_terms_acceptance_user_id"),
        "terms_acceptance",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_terms_acceptance_terms_of_service_id"),
        "terms_acceptance",
        ["terms_of_service_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_terms_acceptance_terms_of_service_id"),
        table_name="terms_acceptance",
    )
    op.drop_index(op.f("ix_terms_acceptance_user_id"), table_name="terms_acceptance")
    op.drop_table("terms_acceptance")
    op.drop_index(
        op.f("ix_terms_of_service_data_resource_id"),
        table_name="terms_of_service",
    )
    op.drop_index(
        op.f("ix_terms_of_service_terms_type"),
        table_name="terms_of_service",
    )
    op.drop_table("terms_of_service")
