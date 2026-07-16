"""add_rejection_provenance

Adds rejection_reason, rejected_by_id, and rejected_at columns to
analysis_bundles and output_sets for explicit rejection lifecycle
provenance.
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "9a8b7c6d5e4f"
down_revision: Union[str, None] = "94e35933519f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "analysis_bundles",
        sa.Column("rejection_reason", sa.Text(), nullable=True),
    )
    op.add_column(
        "analysis_bundles",
        sa.Column(
            "rejected_by_id",
            sa.UUID(),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
    )
    op.add_column(
        "analysis_bundles",
        sa.Column(
            "rejected_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "output_sets",
        sa.Column("rejection_reason", sa.Text(), nullable=True),
    )
    op.add_column(
        "output_sets",
        sa.Column(
            "rejected_by_id",
            sa.UUID(),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
    )
    op.add_column(
        "output_sets",
        sa.Column(
            "rejected_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("output_sets", "rejected_at")
    op.drop_column("output_sets", "rejected_by_id")
    op.drop_column("output_sets", "rejection_reason")
    op.drop_column("analysis_bundles", "rejected_at")
    op.drop_column("analysis_bundles", "rejected_by_id")
    op.drop_column("analysis_bundles", "rejection_reason")
