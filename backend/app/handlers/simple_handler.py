from dataclasses import dataclass

from anthropic import AsyncAnthropic

from app.config import get_settings

settings = get_settings()

_client = AsyncAnthropic(api_key=settings.anthropic_api_key, max_retries=5)

_SYSTEM_PROMPT = (
    "You are a friendly LINE chat assistant. Reply in plain text only — LINE does "
    "not render Markdown, so do not use **bold**, *italic*, # headings, bullet "
    "characters (-, *, •), tables, or emoji decorations. Use blank lines for "
    "paragraph breaks. Keep replies short: 1-2 sentences for greetings or simple "
    "questions. Reply in the same language the user wrote in.\n\n"
    "Exception: if the user explicitly asks for code, you MAY include a fenced "
    "```language ... ``` block — but never wrap prose in code fences."
)


@dataclass
class SimpleResult:
    text: str
    input_tokens: int
    output_tokens: int
    model: str


async def run_simple(message: str) -> SimpleResult:
    msg = await _client.messages.create(
        model=settings.claude_simple_model,
        max_tokens=256,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": message}],
    )
    text = "".join(b.text for b in msg.content if hasattr(b, "text")).strip()
    return SimpleResult(
        text=text,
        input_tokens=msg.usage.input_tokens,
        output_tokens=msg.usage.output_tokens,
        model=settings.claude_simple_model,
    )
