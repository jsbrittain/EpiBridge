import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.terms_acceptance import TermsAcceptance


class TermsOfService(Base):
    __tablename__ = "terms_of_service"

    __table_args__ = (
        UniqueConstraint(
            "terms_type", "data_resource_id", "version", name="uq_terms_version"
        ),
        Index("ix_terms_of_service_terms_type", "terms_type"),
        Index("ix_terms_of_service_data_resource_id", "data_resource_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    terms_type: Mapped[str] = mapped_column(String(50), nullable=False)
    data_resource_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_resources.id"), nullable=True
    )
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    published_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    acceptances: Mapped[list["TermsAcceptance"]] = relationship(
        back_populates="terms_of_service",
    )
