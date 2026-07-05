from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

from app.config import (
    get_settings,
)

from app.integrations.serpapi_client import (
    SerpApiError,
    get_serpapi_client,
)


DATA_DIR = (
    Path(__file__)
    .resolve()
    .parents[2]
    / "data"
)


def _stable_identifier(
    *parts: Any,
) -> str:
    raw_value = "|".join(
        str(part)
        for part in parts
    )

    digest = hashlib.sha1(
        raw_value.encode(
            "utf-8"
        )
    ).hexdigest()[
        :10
    ].upper()

    return (
        f"SERP-FL-{digest}"
    )


def _parse_price(
    value: Any,
) -> float | None:
    if isinstance(
        value,
        (int, float),
    ):
        return float(value)

    if value is None:
        return None

    match = re.search(
        r"-?[\d,]+(?:\.\d+)?",
        str(value),
    )

    if not match:
        return None

    try:
        return float(
            match
            .group(0)
            .replace(
                ",",
                "",
            )
        )
    except ValueError:
        return None


def _extract_clock_time(
    value: Any,
) -> str | None:
    if value is None:
        return None

    full_match = re.search(
        (
            r"\b(?:[01]\d|2[0-3])"
            r":[0-5]\d\b"
        ),
        str(value),
    )

    if not full_match:
        return None

    return full_match.group(0)


def _load_local_flights(
    origin: str,
    destination: str,
) -> list[dict[str, Any]]:
    flights_path = (
        DATA_DIR
        / "flights.json"
    )

    if not flights_path.exists():
        raise FileNotFoundError(
            "Flight inventory was not found at "
            f"{flights_path}"
        )

    with flights_path.open(
        "r",
        encoding="utf-8",
    ) as file:
        flights = json.load(
            file
        )

    normalized_origin = (
        origin.strip().upper()
    )

    normalized_destination = (
        destination
        .strip()
        .upper()
    )

    matching_flights: list[
        dict[str, Any]
    ] = []

    for flight in flights:
        flight_origin = str(
            flight.get(
                "origin",
                "",
            )
        ).upper()

        flight_destination = str(
            flight.get(
                "destination",
                "",
            )
        ).upper()

        if (
            flight_origin
            != normalized_origin
            or flight_destination
            != normalized_destination
        ):
            continue

        normalized_flight = (
            dict(flight)
        )

        normalized_flight.setdefault(
            "provider",
            (
                "TripGuard curated "
                "inventory"
            ),
        )

        normalized_flight.setdefault(
            "data_source",
            "local",
        )

        matching_flights.append(
            normalized_flight
        )

    return matching_flights


def _normalize_live_flights(
    payload: dict[str, Any],
    origin: str,
    destination: str,
    maximum_results: int,
) -> list[dict[str, Any]]:
    raw_groups = [
        *payload.get(
            "best_flights",
            [],
        ),
        *payload.get(
            "other_flights",
            [],
        ),
    ]

    normalized_flights: list[
        dict[str, Any]
    ] = []

    seen_signatures: set[
        str
    ] = set()

    for group in raw_groups:
        if not isinstance(
            group,
            dict,
        ):
            continue

        segments = group.get(
            "flights",
            [],
        )

        if (
            not isinstance(
                segments,
                list,
            )
            or not segments
        ):
            continue

        price = _parse_price(
            group.get(
                "price"
            )
        )

        if (
            price is None
            or price <= 0
        ):
            continue

        first_segment = (
            segments[0]
        )

        last_segment = (
            segments[-1]
        )

        departure_airport = (
            first_segment.get(
                "departure_airport",
                {},
            )
            if isinstance(
                first_segment,
                dict,
            )
            else {}
        )

        arrival_airport = (
            last_segment.get(
                "arrival_airport",
                {},
            )
            if isinstance(
                last_segment,
                dict,
            )
            else {}
        )

        departure_time = (
            _extract_clock_time(
                departure_airport.get(
                    "time"
                )
            )
        )

        arrival_time = (
            _extract_clock_time(
                arrival_airport.get(
                    "time"
                )
            )
        )

        if (
            not departure_time
            or not arrival_time
        ):
            continue

        airlines: list[
            str
        ] = []

        flight_numbers: list[
            str
        ] = []

        for segment in segments:
            if not isinstance(
                segment,
                dict,
            ):
                continue

            airline = str(
                segment.get(
                    "airline"
                )
                or ""
            ).strip()

            if (
                airline
                and airline
                not in airlines
            ):
                airlines.append(
                    airline
                )

            flight_number = str(
                segment.get(
                    "flight_number"
                )
                or ""
            ).strip()

            if flight_number:
                flight_numbers.append(
                    flight_number
                )

        airline_label = (
            " + ".join(
                airlines
            )
            if airlines
            else "Live airline"
        )

        travel_class = str(
            first_segment.get(
                "travel_class",
                "economy",
            )
        ).strip().lower()

        signature = "|".join(
            [
                origin,
                destination,
                departure_time,
                arrival_time,
                ",".join(
                    flight_numbers
                ),
                str(
                    round(
                        price,
                        2,
                    )
                ),
            ]
        )

        if (
            signature
            in seen_signatures
        ):
            continue

        seen_signatures.add(
            signature
        )

        normalized_flights.append(
            {
                "id":
                    _stable_identifier(
                        signature
                    ),
                "airline":
                    airline_label,
                "flight_number":
                    (
                        " / ".join(
                            flight_numbers
                        )
                        or None
                    ),
                "origin":
                    origin,
                "destination":
                    destination,
                "departure_time":
                    departure_time,
                "arrival_time":
                    arrival_time,
                "travel_class":
                    travel_class,
                "stops":
                    max(
                        len(
                            segments
                        )
                        - 1,
                        0,
                    ),
                "round_trip_price":
                    int(
                        round(price)
                    ),
                "total_duration_minutes":
                    group.get(
                        "total_duration"
                    ),
                "departure_token":
                    group.get(
                        "departure_token"
                    ),
                "provider":
                    (
                        "Google Flights "
                        "via SerpApi"
                    ),
                "data_source":
                    "live",
            }
        )

        if (
            len(
                normalized_flights
            )
            >= maximum_results
        ):
            break

    return normalized_flights


def _local_result(
    origin: str,
    destination: str,
    fallback_used: bool,
    live_error: (
        str | None
    ) = None,
) -> dict[str, Any]:
    flights = (
        _load_local_flights(
            origin=origin,
            destination=(
                destination
            ),
        )
    )

    message = (
        "Using TripGuard curated "
        "flight inventory."
    )

    if fallback_used:
        message = (
            "Live flight search was unavailable, "
            "so TripGuard used curated local "
            "flight inventory."
        )

    return {
        "items":
            flights,
        "provider":
            (
                "TripGuard curated "
                "inventory"
            ),
        "source":
            "local",
        "live":
            False,
        "fallback_used":
            fallback_used,
        "message":
            message,
        "error":
            live_error,
    }


def search_flights(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: str,
) -> dict[str, Any]:
    """
    Search Google Flights through SerpApi
    when enabled.

    The returned price is used as the
    round-trip fare shown by Google Flights.

    If live search fails, TripGuard can
    automatically use local inventory.
    """
    normalized_origin = (
        origin.strip().upper()
    )

    normalized_destination = (
        destination
        .strip()
        .upper()
    )

    settings = get_settings()

    if not settings.use_serpapi:
        return _local_result(
            origin=(
                normalized_origin
            ),
            destination=(
                normalized_destination
            ),
            fallback_used=False,
        )

    try:
        client = (
            get_serpapi_client()
        )

        payload = (
            client.search_flights(
                origin=(
                    normalized_origin
                ),
                destination=(
                    normalized_destination
                ),
                departure_date=(
                    departure_date
                ),
                return_date=(
                    return_date
                ),
            )
        )

        flights = (
            _normalize_live_flights(
                payload=payload,
                origin=(
                    normalized_origin
                ),
                destination=(
                    normalized_destination
                ),
                maximum_results=(
                    settings
                    .serpapi_max_flight_results
                ),
            )
        )

        if flights:
            return {
                "items":
                    flights,
                "provider":
                    (
                        "Google Flights "
                        "via SerpApi"
                    ),
                "source":
                    "live",
                "live":
                    True,
                "fallback_used":
                    False,
                "message":
                    (
                        "Retrieved current "
                        "round-trip flight "
                        "options from Google "
                        "Flights through "
                        "SerpApi."
                    ),
                "error":
                    None,
            }

        live_error = (
            "SerpApi returned no usable "
            "flight offers for the requested "
            "route and dates."
        )

    except SerpApiError as exc:
        live_error = str(exc)

    if (
        settings
        .travel_fallback_to_local
    ):
        return _local_result(
            origin=(
                normalized_origin
            ),
            destination=(
                normalized_destination
            ),
            fallback_used=True,
            live_error=(
                live_error
            ),
        )

    raise RuntimeError(
        live_error
    )