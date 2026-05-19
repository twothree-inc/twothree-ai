from datetime import datetime
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RequestLog


async def insert_log(db: AsyncSession, data: dict[str, Any]) -> RequestLog:
    row = RequestLog(**data)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


def _apply_range(stmt: Select, from_dt: datetime | None, to_dt: datetime | None) -> Select:
    if from_dt is not None:
        stmt = stmt.where(RequestLog.created_at >= from_dt)
    if to_dt is not None:
        stmt = stmt.where(RequestLog.created_at < to_dt)
    return stmt


async def get_logs(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 50,
    from_dt: datetime | None = None,
    to_dt: datetime | None = None,
) -> tuple[list[RequestLog], int]:
    page = max(page, 1)
    per_page = max(min(per_page, 200), 1)

    count_stmt = _apply_range(select(func.count()).select_from(RequestLog), from_dt, to_dt)
    total = (await db.execute(count_stmt)).scalar_one()

    rows_stmt = _apply_range(select(RequestLog), from_dt, to_dt)
    rows = (
        (
            await db.execute(
                rows_stmt.order_by(RequestLog.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        )
        .scalars()
        .all()
    )

    return list(rows), int(total)


async def get_total_cost_usd(
    db: AsyncSession,
    from_dt: datetime | None = None,
    to_dt: datetime | None = None,
) -> float:
    stmt = _apply_range(
        select(func.coalesce(func.sum(RequestLog.total_cost_usd), 0)),
        from_dt,
        to_dt,
    )
    return float((await db.execute(stmt)).scalar_one())
