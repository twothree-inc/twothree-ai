from dataclasses import dataclass

from anthropic import AsyncAnthropic

from app.config import get_settings

settings = get_settings()

_client = AsyncAnthropic(api_key=settings.anthropic_api_key, max_retries=5)

_SYSTEM_PROMPT = (
    "You are a helpful LINE chat assistant. Reply in plain text only — LINE does "
    "not render Markdown, so do not use **bold**, *italic*, # headings, bullet "
    "characters (-, *, •), tables, or emoji decorations. Use blank lines for "
    "paragraph breaks. Keep answers tight: at most 3 short paragraphs unless the "
    "user asks for detail. Reply in the same language the user wrote in.\n\n"
    "Exception: if the user explicitly asks for code, you MAY include a fenced "
    "```language ... ``` block — but never wrap prose in code fences."
)


@dataclass
class ComplexResult:
    text: str
    input_tokens: int
    output_tokens: int
    model: str


async def run_complex(message: str) -> ComplexResult:
    msg = await _client.messages.create(
        model=settings.claude_model,
        max_tokens=1024,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": message}],
    )
    text = "".join(b.text for b in msg.content if hasattr(b, "text")).strip()
    return ComplexResult(
        text=text,
        input_tokens=msg.usage.input_tokens,
        output_tokens=msg.usage.output_tokens,
        model=settings.claude_model,
    )
