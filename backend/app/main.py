import logging
import time as time_module
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from anthropic import APIStatusError
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from linebot.v3.webhooks import MessageEvent, TextMessageContent
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud, line_client
from app import router as router_module
from app.config import get_settings
from app.database import SessionLocal, get_db

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
    route_label: str
    cost_usd: float
    response_time_ms: int


_FRIENDLY_ERROR = "申し訳ありません。エラーが発生しました。少し時間をおいて再度お試しください。"
_OVERLOADED_ERROR = "AI サービスが現在混み合っています。少し時間をおいて再度お試しください。"


def _user_message_for_exception(exc: BaseException) -> str:
    """Map an exception to the message we show the end user."""
    if isinstance(exc, APIStatusError) and exc.status_code == 529:
        return _OVERLOADED_ERROR
    return _FRIENDLY_ERROR


def _build_log_row(
    *,
    source: str,
    user_id: str,
    message_text: str,
    response_text: str,
    response_time_ms: int,
    error: str | None,
    result: router_module.RouteResult | None,
) -> dict[str, Any]:
    return {
        "source": source,
        "user_id": user_id,
        "message_text": message_text[:1000] if message_text else None,
        "attachment_type": None,
        "route_label": result.route_label if result else "ERROR",
        "classifier_model": result.classifier_model if result else "",
        "response_model": result.response_model if result else "",
        "classifier_input_tokens": result.classifier_input_tokens if result else 0,
        "classifier_output_tokens": result.classifier_output_tokens if result else 0,
        "response_input_tokens": result.response_input_tokens if result else 0,
        "response_output_tokens": result.response_output_tokens if result else 0,
        "total_cost_usd": result.total_cost_usd if result else 0.0,
        "response_time_ms": response_time_ms,
        "response_text": response_text[:2000] if response_text else None,
        "error": error,
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db)) -> ChatResponse:
    """Admin chat endpoint — runs the two-stage router and logs to DB."""
    user_text = req.message.strip()
    if not user_text:
        return ChatResponse(
            response="(空のメッセージ)", route_label="SKIP", cost_usd=0.0, response_time_ms=0
        )

    started = time_module.perf_counter()
    error_msg: str | None = None
    result: router_module.RouteResult | None = None
    try:
        result = await router_module.route(user_text, has_attachment=False)
        response_text = result.response_text or "(no response)"
    except Exception as exc:
        logger.exception("Router failed for /api/chat")
        error_msg = str(exc)[:500]
        response_text = _user_message_for_exception(exc)

    elapsed_ms = int((time_module.perf_counter() - started) * 1000)

    try:
        await crud.insert_log(
            db,
            _build_log_row(
                source="simulation",
                user_id="simulation",
                message_text=user_text,
                response_text=response_text,
                response_time_ms=elapsed_ms,
                error=error_msg,
                result=result,
            ),
        )
    except Exception:
        logger.exception("Failed to insert request log for /api/chat")

    return ChatResponse(
        response=response_text,
        route_label=result.route_label if result else "ERROR",
        cost_usd=result.total_cost_usd if result else 0.0,
        response_time_ms=elapsed_ms,
    )


@app.post("/webhook")
async def webhook(
    request: Request,
    x_line_signature: str = Header(..., alias="X-Line-Signature"),
) -> dict[str, str]:
    """LINE Messaging API webhook.

    Always returns 200 so LINE does not retry on transient errors.
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

    if not isinstance(event.message, TextMessageContent):
        await line_client.reply_text(
            reply_token,
            "I can only handle text messages for now.",
        )
        return

    user_text = event.message.text
    user_id = getattr(event.source, "user_id", None) or "unknown"

    started = time_module.perf_counter()
    error_msg: str | None = None
    result: router_module.RouteResult | None = None
    try:
        result = await router_module.route(user_text, has_attachment=False)
        response_text = result.response_text or "(no response)"
    except Exception as exc:
        logger.exception("Router failed for LINE event")
        error_msg = str(exc)[:500]
        response_text = _user_message_for_exception(exc)

    elapsed_ms = int((time_module.perf_counter() - started) * 1000)

    # Reply first, log second — if the DB write fails we still answered the user.
    try:
        await line_client.reply_text(reply_token, response_text)
    except Exception:
        logger.exception("LINE reply failed")

    try:
        async with SessionLocal() as session:
            await crud.insert_log(
                session,
                _build_log_row(
                    source="line",
                    user_id=user_id,
                    message_text=user_text,
                    response_text=response_text,
                    response_time_ms=elapsed_ms,
                    error=error_msg,
                    result=result,
                ),
            )
    except Exception:
        logger.exception("Failed to insert request log for LINE event")
