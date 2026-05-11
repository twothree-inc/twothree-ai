"""create request_logs

Revision ID: 001
Revises:
Create Date: 2026-05-08 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "request_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("user_id", sa.String(length=100), nullable=False),
        sa.Column("message_text", sa.Text(), nullable=True),
        sa.Column("attachment_type", sa.String(length=20), nullable=True),
        sa.Column("route_label", sa.String(length=20), nullable=False),
        sa.Column("classifier_model", sa.String(length=60), nullable=False),
        sa.Column("response_model", sa.String(length=60), nullable=False),
        sa.Column("classifier_input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("classifier_output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("response_input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("response_output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "total_cost_usd",
            sa.Numeric(precision=10, scale=8),
            nullable=False,
            server_default="0",
        ),
        sa.Column("response_time_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("response_text", sa.Text(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_request_logs_created_at",
        "request_logs",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_request_logs_created_at", table_name="request_logs")
    op.drop_table("request_logs")
