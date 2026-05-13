import logging
from datetime import date, datetime, time, timedelta, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from linebot.v3.webhooks import MessageEvent, TextMessageContent
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud, line_client
from app.config import get_settings
from app.database import get_db

# Date-range filters in /api/logs are interpreted in JST: the user picks
# calendar days in their local timezone, we convert to absolute datetimes.
JST = timezone(timedelta(hours=9))


def _parse_jst_day(value: str | None, *, end: bool = False) -> datetime | None:
    """Parse a YYYY-MM-DD string as a JST datetime.

    For start-of-day (end=False) returns 00:00 JST on that day.
    For end-of-day (end=True) returns 00:00 JST of the next day, so the
    caller can use a half-open range [from, to).
    """
    if not value:
        return None
    try:
        d = date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid date '{value}': {exc}") from exc
    if end:
        d = d + timedelta(days=1)
    return datetime.combine(d, time.min, tzinfo=JST)


logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(title="LINE Bot Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
async def health_db(db: AsyncSession = Depends(get_db)) -> dict[str, object]:
    try:
        result = await db.execute(text("SELECT 1"))
        value = result.scalar_one()
        return {"status": "ok", "select_1": value}
    except Exception as exc:
        return {"status": "error", "error": str(exc)}


class RequestLogOut(BaseModel):
    id: int
    created_at: datetime
    source: str
    user_id: str
    message_text: str | None
    attachment_type: str | None
    route_label: str
    classifier_model: str
    response_model: str
    classifier_input_tokens: int
    classifier_output_tokens: int
    response_input_tokens: int
    response_output_tokens: int
    total_cost_usd: float
    response_time_ms: int
    response_text: str | None
    error: str | None

    model_config = {"from_attributes": True}


class PaginatedLogs(BaseModel):
    logs: list[RequestLogOut]
    total: int
    page: int
    per_page: int
    total_cost_usd: float


@app.get("/api/logs", response_model=PaginatedLogs)
async def list_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    from_: str | None = Query(None, alias="from", description="YYYY-MM-DD (JST, inclusive)"),
    to: str | None = Query(None, description="YYYY-MM-DD (JST, inclusive)"),
    db: AsyncSession = Depends(get_db),
) -> PaginatedLogs:
    from_dt = _parse_jst_day(from_)
    to_dt = _parse_jst_day(to, end=True)
    if from_dt and to_dt and from_dt >= to_dt:
        raise HTTPException(status_code=400, detail="'from' must be on or before 'to'")

    rows, total = await crud.get_logs(
        db, page=page, per_page=per_page, from_dt=from_dt, to_dt=to_dt
    )
    total_cost = await crud.get_total_cost_usd(db, from_dt=from_dt, to_dt=to_dt)
    return PaginatedLogs(
        logs=[RequestLogOut.model_validate(r) for r in rows],
        total=total,
        page=page,
        per_page=per_page,
        total_cost_usd=total_cost,
    )


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    """Admin chat endpoint — same logic as the LINE handler.

    For now just echoes; will route through the classifier + handlers
    once those are built.
    """
    user_text = req.message.strip()
    if not user_text:
        return ChatResponse(response="(空のメッセージ)")
    return ChatResponse(response=f"Echo: {user_text}")


@app.post("/webhook")
async def webhook(
    request: Request,
    x_line_signature: str = Header(..., alias="X-Line-Signature"),
) -> dict[str, str]:
    """LINE Messaging API webhook.

    Always returns 200 so LINE does not retry on transient errors.
    For now this just echoes the user's text back — LLM routing will
    replace this echo later.
    """
    body_bytes = await request.body()
    body = body_bytes.decode("utf-8")

    try:
        events = line_client.parse_events(body, x_line_signature)
    except line_client.InvalidSignatureError:
        logger.warning("LINE webhook signature mismatch")
        return {"status": "invalid_signature"}

    for event in events:
        try:
            await _handle_event(event)
        except Exception:
            logger.exception("Failed to handle LINE event")

    return {"status": "ok"}


async def _handle_event(event: object) -> None:
    if not isinstance(event, MessageEvent):
        return

    reply_token = event.reply_token

    if isinstance(event.message, TextMessageContent):
        user_text = event.message.text
        await line_client.reply_text(reply_token, f"Echo: {user_text}")
        return

    await line_client.reply_text(
        reply_token,
        "I can only handle text messages for now.",
    )
