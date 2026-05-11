from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RequestLog(Base):
    __tablename__ = "request_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    source: Mapped[str] = mapped_column(String(20), nullable=False)
    user_id: Mapped[str] = mapped_column(String(100), nullable=False)
    message_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_type: Mapped[str | None] = mapped_column(String(20), nullable=True)

    route_label: Mapped[str] = mapped_column(String(20), nullable=False)
    classifier_model: Mapped[str] = mapped_column(String(60), nullable=False)
    response_model: Mapped[str] = mapped_column(String(60), nullable=False)

    classifier_input_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    classifier_output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    response_input_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    response_output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    total_cost_usd: Mapped[Decimal] = mapped_column(Numeric(10, 8), nullable=False, default=0)
    response_time_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    response_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
