from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[1]

load_dotenv(
    PROJECT_ROOT / ".env",
    override=False,
)


def _read_bool(
    name: str,
    default: bool,
) -> bool:
    raw_value = os.getenv(name)

    if raw_value is None:
        return default

    return raw_value.strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _read_int(
    name: str,
    default: int,
    minimum: int,
    maximum: int,
) -> int:
    raw_value = os.getenv(name)

    try:
        parsed_value = (
            int(raw_value)
            if raw_value is not None
            else default
        )
    except ValueError:
        return default

    return max(
        minimum,
        min(
            parsed_value,
            maximum,
        ),
    )


def _read_float(
    name: str,
    default: float,
    minimum: float,
    maximum: float,
) -> float:
    raw_value = os.getenv(name)

    try:
        parsed_value = (
            float(raw_value)
            if raw_value is not None
            else default
        )
    except ValueError:
        return default

    return max(
        minimum,
        min(
            parsed_value,
            maximum,
        ),
    )


@dataclass(
    frozen=True,
)
class Settings:
    travel_provider_mode: str
    travel_fallback_to_local: bool
    serpapi_api_key: str
    serpapi_request_timeout_seconds: float
    serpapi_max_flight_results: int
    serpapi_max_hotel_results: int

    @property
    def use_serpapi(
        self,
    ) -> bool:
        return (
            self.travel_provider_mode
            == "serpapi"
        )


@lru_cache(
    maxsize=1,
)
def get_settings() -> Settings:
    provider_mode = os.getenv(
        "TRAVEL_PROVIDER_MODE",
        "local",
    ).strip().lower()

    if provider_mode not in {
        "local",
        "serpapi",
    }:
        provider_mode = "local"

    return Settings(
        travel_provider_mode=(
            provider_mode
        ),
        travel_fallback_to_local=(
            _read_bool(
                "TRAVEL_FALLBACK_TO_LOCAL",
                True,
            )
        ),
        serpapi_api_key=os.getenv(
            "SERPAPI_API_KEY",
            "",
        ).strip(),
        serpapi_request_timeout_seconds=(
            _read_float(
                "SERPAPI_REQUEST_TIMEOUT_SECONDS",
                30.0,
                5.0,
                90.0,
            )
        ),
        serpapi_max_flight_results=(
            _read_int(
                "SERPAPI_MAX_FLIGHT_RESULTS",
                8,
                1,
                20,
            )
        ),
        serpapi_max_hotel_results=(
            _read_int(
                "SERPAPI_MAX_HOTEL_RESULTS",
                8,
                1,
                20,
            )
        ),
    )