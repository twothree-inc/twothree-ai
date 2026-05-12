from linebot.v3 import WebhookParser
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import (
    AsyncApiClient,
    AsyncMessagingApi,
    Configuration,
    ReplyMessageRequest,
    TextMessage,
)
from linebot.v3.webhooks import Event

from app.config import get_settings

settings = get_settings()

_parser = WebhookParser(settings.line_channel_secret)
_messaging_config = Configuration(access_token=settings.line_channel_access_token)

# LINE caps a single reply at 5000 chars per message.
_REPLY_MAX_CHARS = 5000


def parse_events(body: str, signature: str) -> list[Event]:
    """Verify the LINE signature and return the parsed event list.

    Raises InvalidSignatureError when the signature does not match the body.
    """
    return _parser.parse(body, signature)


async def reply_text(reply_token: str, text: str) -> None:
    """Send a single text reply. Truncates to LINE's 5000-char limit."""
    safe_text = text[:_REPLY_MAX_CHARS] if text else "(no response)"
    async with AsyncApiClient(_messaging_config) as client:
        api = AsyncMessagingApi(client)
        await api.reply_message(
            ReplyMessageRequest(
                reply_token=reply_token,
                messages=[TextMessage(text=safe_text)],
            )
        )


__all__ = ["InvalidSignatureError", "parse_events", "reply_text"]
