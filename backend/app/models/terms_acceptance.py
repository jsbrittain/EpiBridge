import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.terms_of_service import TermsOfService


class TermsAcceptance(Base):
    __tablename__ = "terms_acceptance"

    __table_args__ = (
        UniqueConstraint(
            "user_id", "terms_of_service_id", name="uq_user_terms_acceptance"
        ),
        Index("ix_terms_acceptance_terms_of_service_id", "terms_of_service_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    terms_of_service_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("terms_of_service.id", ondelete="CASCADE"),
        nullable=False,
    )
    accepted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    terms_of_service: Mapped["TermsOfService"] = relationship(
        back_populates="acceptances",
    )
