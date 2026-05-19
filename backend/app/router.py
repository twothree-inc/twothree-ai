from dataclasses import dataclass

from app.classifier.classifier import classify
from app.config import calculate_cost
from app.handlers.complex_handler import run_complex
from app.handlers.simple_handler import run_simple


@dataclass
class RouteResult:
    response_text: str
    route_label: str
    classifier_model: str
    response_model: str
    classifier_input_tokens: int
    classifier_output_tokens: int
    response_input_tokens: int
    response_output_tokens: int
    total_cost_usd: float


async def route(message: str, has_attachment: bool = False) -> RouteResult:
    cls = await classify(message, has_attachment=has_attachment)

    # Tool handler is not implemented yet (text-only iteration). A TOOL classification
    # on a text message falls back to the Sonnet COMPLEX path so the user still gets
    # a useful answer instead of an error.
    if cls.label == "SIMPLE":
        result = await run_simple(message)
        route_label = "SIMPLE"
    else:
        result = await run_complex(message)
        route_label = "COMPLEX"

    text, in_tok, out_tok, model = (
        result.text,
        result.input_tokens,
        result.output_tokens,
        result.model,
    )

    cost = calculate_cost(
        cls.input_tokens,
        cls.output_tokens,
        in_tok,
        out_tok,
        model,
    )

    return RouteResult(
        response_text=text,
        route_label=route_label,
        classifier_model=cls.model,
        response_model=model,
        classifier_input_tokens=cls.input_tokens,
        classifier_output_tokens=cls.output_tokens,
        response_input_tokens=in_tok,
        response_output_tokens=out_tok,
        total_cost_usd=cost,
    )
