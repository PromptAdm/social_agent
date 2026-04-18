from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ImageProject(Base):
    __tablename__ = "image_projects"

    id:              Mapped[int]       = mapped_column(primary_key=True)
    user_id:         Mapped[int]       = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    brand_id:        Mapped[int | None]  = mapped_column(ForeignKey("brands.id"), nullable=True)
    title:           Mapped[str | None]  = mapped_column(String(255), nullable=True)
    status:          Mapped[str]       = mapped_column(String(20), default="pending", nullable=False)
    # pending | processing | completed | failed
    input_type:      Mapped[str]       = mapped_column(String(20), nullable=False)   # text | image
    input_prompt:    Mapped[str | None]  = mapped_column(Text, nullable=True)
    input_file_path: Mapped[str | None]  = mapped_column(String(500), nullable=True)
    credits_cost:    Mapped[int]       = mapped_column(Integer, default=0, nullable=False)
    error_message:   Mapped[str | None]  = mapped_column(Text, nullable=True)
    created_at:      Mapped[datetime]  = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:      Mapped[datetime]  = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    results: Mapped[list["GenerationResult"]] = relationship(
        "GenerationResult",
        primaryjoin="and_(GenerationResult.project_id == ImageProject.id, "
                    "GenerationResult.project_type == 'image')",
        foreign_keys="[GenerationResult.project_id]",
        lazy="select",
        viewonly=True,
        order_by="GenerationResult.created_at",
    )


class VideoProject(Base):
    __tablename__ = "video_projects"

    id:              Mapped[int]       = mapped_column(primary_key=True)
    user_id:         Mapped[int]       = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    brand_id:        Mapped[int | None]  = mapped_column(ForeignKey("brands.id"), nullable=True)
    title:           Mapped[str | None]  = mapped_column(String(255), nullable=True)
    status:          Mapped[str]       = mapped_column(String(20), default="pending", nullable=False)
    input_file_path: Mapped[str | None]  = mapped_column(String(500), nullable=True)
    input_file_name: Mapped[str | None]  = mapped_column(String(255), nullable=True)
    input_file_size: Mapped[int | None]  = mapped_column(Integer, nullable=True)
    language:        Mapped[str]       = mapped_column(String(10), default="pt", nullable=False)
    credits_cost:    Mapped[int]       = mapped_column(Integer, default=0, nullable=False)
    error_message:   Mapped[str | None]  = mapped_column(Text, nullable=True)
    created_at:      Mapped[datetime]  = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:      Mapped[datetime]  = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    results: Mapped[list["GenerationResult"]] = relationship(
        "GenerationResult",
        primaryjoin="and_(GenerationResult.project_id == VideoProject.id, "
                    "GenerationResult.project_type == 'video')",
        foreign_keys="[GenerationResult.project_id]",
        lazy="select",
        viewonly=True,
        order_by="GenerationResult.created_at",
    )


class GenerationResult(Base):
    """Saída gerada de um projeto de imagem ou vídeo."""
    __tablename__ = "generation_results"

    id:           Mapped[int]       = mapped_column(primary_key=True)
    project_type: Mapped[str]       = mapped_column(String(20), nullable=False)   # image | video
    project_id:   Mapped[int]       = mapped_column(Integer,    nullable=False, index=True)
    result_type:  Mapped[str]       = mapped_column(String(30), nullable=False)
    # image | subtitle_srt | subtitle_vtt | thumbnail
    file_path:    Mapped[str | None]  = mapped_column(String(500), nullable=True)
    file_url:     Mapped[str | None]  = mapped_column(String(500), nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)        # JSON string
    created_at:   Mapped[datetime]  = mapped_column(DateTime(timezone=True), server_default=func.now())
