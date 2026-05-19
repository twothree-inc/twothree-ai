from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    line_channel_access_token: str = Field(default="", alias="LINE_CHANNEL_ACCESS_TOKEN")
    line_channel_secret: str = Field(default="", alias="LINE_CHANNEL_SECRET")

    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    claude_classifier_model: str = Field(
        default="claude-haiku-4-5-20251001", alias="CLAUDE_CLASSIFIER_MODEL"
    )
    claude_simple_model: str = Field(
        default="claude-haiku-4-5-20251001", alias="CLAUDE_SIMPLE_MODEL"
    )
    claude_model: str = Field(default="claude-sonnet-4-6", alias="CLAUDE_MODEL")

    database_url: str = Field(default="", alias="DATABASE_URL")

    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


SIMPLE_INPUT_PRICE = 1.00 / 1_000_000
SIMPLE_OUTPUT_PRICE = 5.00 / 1_000_000
COMPLEX_INPUT_PRICE = 3.00 / 1_000_000
COMPLEX_OUTPUT_PRICE = 15.00 / 1_000_000


def calculate_cost(
    classifier_in: int,
    classifier_out: int,
    response_in: int,
    response_out: int,
    response_model: str,
) -> float:
    classifier_cost = classifier_in * SIMPLE_INPUT_PRICE + classifier_out * SIMPLE_OUTPUT_PRICE
    if "haiku" in response_model.lower():
        response_cost = response_in * SIMPLE_INPUT_PRICE + response_out * SIMPLE_OUTPUT_PRICE
    else:
        response_cost = response_in * COMPLEX_INPUT_PRICE + response_out * COMPLEX_OUTPUT_PRICE
    return classifier_cost + response_cost


@lru_cache
def get_settings() -> Settings:
    return Settings()
