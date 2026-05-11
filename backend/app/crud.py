from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RequestLog


async def get_logs(
    db: AsyncSession, page: int = 1, per_page: int = 50
) -> tuple[list[RequestLog], int]:
    page = max(page, 1)
    per_page = max(min(per_page, 200), 1)

    total = (await db.execute(select(func.count()).select_from(RequestLog))).scalar_one()

    rows = (
        (
            await db.execute(
                select(RequestLog)
                .order_by(RequestLog.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        )
        .scalars()
        .all()
    )

    return list(rows), int(total)
