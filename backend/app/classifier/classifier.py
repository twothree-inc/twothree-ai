from dataclasses import dataclass

from anthropic import AsyncAnthropic

from app.config import get_settings

settings = get_settings()

_client = AsyncAnthropic(api_key=settings.anthropic_api_key, max_retries=5)

_VALID_LABELS = frozenset({"SIMPLE", "COMPLEX", "TOOL"})

_SYSTEM_PROMPT = (
    "Classify the user's message into exactly one of these labels:\n"
    "- SIMPLE: greetings, small talk, very short factual questions answerable in one line.\n"
    "- COMPLEX: anything that needs reasoning, explanation, comparison, or a longer answer.\n"
    "- TOOL: the user is asking about an attached image, document, or file.\n"
    "Respond with ONLY the single label word (SIMPLE, COMPLEX, or TOOL)."
)


@dataclass
class ClassifyResult:
    label: str
    input_tokens: int
    output_tokens: int
    model: str


async def classify(message: str, has_attachment: bool) -> ClassifyResult:
    # Attachment short-circuits straight to TOOL — no need to spend a classifier call.
    if has_attachment:
        return ClassifyResult("TOOL", 0, 0, "shortcut")

    # Short statements without a question mark are almost always small-talk;
    # save the classifier call and route them straight to Haiku.
    if len(message) < 15 and "?" not in message and "？" not in message:  # noqa: RUF001
        return ClassifyResult("SIMPLE", 0, 0, "shortcut")

    msg = await _client.messages.create(
        model=settings.claude_classifier_model,
        max_tokens=5,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": message}],
    )
    raw = "".join(b.text for b in msg.content if hasattr(b, "text")).strip().upper()
    # Unrecognized → COMPLEX fallback per spec routing table.
    label = raw if raw in _VALID_LABELS else "COMPLEX"
    return ClassifyResult(
        label=label,
        input_tokens=msg.usage.input_tokens,
        output_tokens=msg.usage.output_tokens,
        model=settings.claude_classifier_model,
    )
