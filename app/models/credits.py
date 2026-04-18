from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserCredit(Base):
    __tablename__ = "user_credits"

    id:              Mapped[int]      = mapped_column(primary_key=True)
    user_id:         Mapped[int]      = mapped_column(ForeignKey("users.id"), unique=True, nullable=False, index=True)
    balance:         Mapped[int]      = mapped_column(Integer, default=0, nullable=False)
    lifetime_earned: Mapped[int]      = mapped_column(Integer, default=0, nullable=False)
    updated_at:      Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="credits")  # type: ignore[name-defined]


class CreditLog(Base):
    __tablename__ = "credit_logs"

    id:             Mapped[int]       = mapped_column(primary_key=True)
    user_id:        Mapped[int]       = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    amount:         Mapped[int]       = mapped_column(Integer, nullable=False)           # + earn / − spend
    operation_type: Mapped[str]       = mapped_column(String(50),  nullable=False)
    reference_id:   Mapped[int | None]  = mapped_column(Integer,     nullable=True)
    reference_type: Mapped[str | None]  = mapped_column(String(20),  nullable=True)
    description:    Mapped[str | None]  = mapped_column(String(255), nullable=True)
    created_at:     Mapped[datetime]  = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="credit_logs")  # type: ignore[name-defined]
