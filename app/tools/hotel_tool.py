from __future__ import annotations

import hashlib
import json
import math
import re
from datetime import datetime
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
        f"SERP-HT-{digest}"
    )


def _parse_price(
    value: Any,
) -> float | None:
    if isinstance(
        value,
        dict,
    ):
        for key in (
            "extracted_lowest",
            "extracted_before_taxes_fees",
            "lowest",
            "before_taxes_fees",
        ):
            parsed_value = (
                _parse_price(
                    value.get(
                        key
                    )
                )
            )

            if (
                parsed_value
                is not None
            ):
                return (
                    parsed_value
                )

        return None

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


def _haversine_distance_km(
    latitude_one: float,
    longitude_one: float,
    latitude_two: float,
    longitude_two: float,
) -> float:
    earth_radius_km = (
        6371.0088
    )

    latitude_one_radians = (
        math.radians(
            latitude_one
        )
    )

    latitude_two_radians = (
        math.radians(
            latitude_two
        )
    )

    latitude_delta = (
        math.radians(
            latitude_two
            - latitude_one
        )
    )

    longitude_delta = (
        math.radians(
            longitude_two
            - longitude_one
        )
    )

    haversine_value = (
        math.sin(
            latitude_delta / 2
        )
        ** 2
        + math.cos(
            latitude_one_radians
        )
        * math.cos(
            latitude_two_radians
        )
        * math.sin(
            longitude_delta / 2
        )
        ** 2
    )

    angular_distance = (
        2
        * math.atan2(
            math.sqrt(
                haversine_value
            ),
            math.sqrt(
                1
                - haversine_value
            ),
        )
    )

    return (
        earth_radius_km
        * angular_distance
    )


def _load_local_hotels(
    city: str,
) -> list[dict[str, Any]]:
    hotels_path = (
        DATA_DIR
        / "hotels.json"
    )

    if not hotels_path.exists():
        raise FileNotFoundError(
            "Hotel inventory was not found at "
            f"{hotels_path}"
        )

    with hotels_path.open(
        "r",
        encoding="utf-8",
    ) as file:
        hotels = json.load(
            file
        )

    normalized_city = (
        city.strip().lower()
    )

    matching_hotels: list[
        dict[str, Any]
    ] = []

    for hotel in hotels:
        hotel_city = str(
            hotel.get(
                "city",
                "",
            )
        ).strip().lower()

        if (
            hotel_city
            != normalized_city
        ):
            continue

        normalized_hotel = (
            dict(hotel)
        )

        normalized_hotel.setdefault(
            "provider",
            (
                "TripGuard curated "
                "inventory"
            ),
        )

        normalized_hotel.setdefault(
            "data_source",
            "local",
        )

        matching_hotels.append(
            normalized_hotel
        )

    return matching_hotels


def _normalize_live_hotels(
    payload: dict[str, Any],
    city: str,
    check_in_date: str,
    check_out_date: str,
    maximum_results: int,
    work_coordinates: (
        dict[str, Any]
        | None
    ),
) -> list[dict[str, Any]]:
    properties = payload.get(
        "properties",
        [],
    )

    if not isinstance(
        properties,
        list,
    ):
        return []

    number_of_nights = max(
        (
            datetime.strptime(
                check_out_date,
                "%Y-%m-%d",
            ).date()
            - datetime.strptime(
                check_in_date,
                "%Y-%m-%d",
            ).date()
        ).days,
        1,
    )

    normalized_hotels: list[
        dict[str, Any]
    ] = []

    seen_signatures: set[
        str
    ] = set()

    for property_item in (
        properties
    ):
        if not isinstance(
            property_item,
            dict,
        ):
            continue

        name = str(
            property_item.get(
                "name"
            )
            or ""
        ).strip()

        if not name:
            continue

        nightly_price = (
            _parse_price(
                property_item.get(
                    "rate_per_night"
                )
            )
        )

        if nightly_price is None:
            total_price = (
                _parse_price(
                    property_item.get(
                        "total_rate"
                    )
                )
            )

            if total_price is not None:
                nightly_price = (
                    total_price
                    / number_of_nights
                )

        if (
            nightly_price is None
            or nightly_price <= 0
        ):
            continue

        coordinate_block = (
            property_item.get(
                "gps_coordinates",
                {},
            )
        )

        latitude: (
            float | None
        ) = None

        longitude: (
            float | None
        ) = None

        if isinstance(
            coordinate_block,
            dict,
        ):
            raw_latitude = (
                coordinate_block
                .get("latitude")
            )

            raw_longitude = (
                coordinate_block
                .get("longitude")
            )

            if (
                raw_latitude
                is not None
                and raw_longitude
                is not None
            ):
                latitude = float(
                    raw_latitude
                )

                longitude = float(
                    raw_longitude
                )

        distance_from_work_location_km: (
            float | None
        ) = None

        if (
            work_coordinates
            and latitude
            is not None
            and longitude
            is not None
        ):
            distance_from_work_location_km = (
                round(
                    _haversine_distance_km(
                        float(
                            work_coordinates[
                                "latitude"
                            ]
                        ),
                        float(
                            work_coordinates[
                                "longitude"
                            ]
                        ),
                        latitude,
                        longitude,
                    ),
                    2,
                )
            )

        address = (
            property_item.get(
                "address"
            )
        )

        property_type = (
            property_item.get(
                "type"
            )
        )

        signature = "|".join(
            [
                name,
                str(latitude),
                str(longitude),
                str(
                    round(
                        nightly_price,
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

        rating_value = (
            property_item.get(
                "overall_rating"
            )
        )

        try:
            rating = float(
                rating_value
            )
        except (
            TypeError,
            ValueError,
        ):
            rating = 0.0

        normalized_hotels.append(
            {
                "id":
                    _stable_identifier(
                        signature
                    ),
                "name":
                    name,
                "city":
                    city,
                "area":
                    (
                        address
                        or property_type
                        or city
                    ),
                "price_per_night":
                    int(
                        round(
                            nightly_price
                        )
                    ),
                "distance_from_work_location_km":
                    (
                        distance_from_work_location_km
                    ),
                "rating":
                    rating,
                "reviews":
                    property_item.get(
                        "reviews"
                    ),
                "latitude":
                    latitude,
                "longitude":
                    longitude,
                "provider":
                    (
                        "Google Hotels "
                        "via SerpApi"
                    ),
                "data_source":
                    "live",
                "property_token":
                    (
                        property_item.get(
                            "property_token"
                        )
                    ),
            }
        )

        if (
            len(
                normalized_hotels
            )
            >= maximum_results
        ):
            break

    return normalized_hotels


def _local_result(
    city: str,
    fallback_used: bool,
    live_error: (
        str | None
    ) = None,
) -> dict[str, Any]:
    hotels = (
        _load_local_hotels(
            city=city,
        )
    )

    message = (
        "Using TripGuard curated "
        "hotel inventory."
    )

    if fallback_used:
        message = (
            "Live hotel search was unavailable, "
            "so TripGuard used curated local "
            "hotel inventory."
        )

    return {
        "items":
            hotels,
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
        "distance_verification":
            "local_inventory",
        "message":
            message,
        "error":
            live_error,
    }


def search_hotels(
    city: str,
    work_location: (
        str | None
    ),
    check_in_date: str,
    check_out_date: str,
) -> dict[str, Any]:
    """
    Search Google Hotels through
    SerpApi when enabled.

    A Google Maps lookup obtains the
    work-location coordinates so hotel
    distance remains part of compliance.

    When distance cannot be verified,
    the graph requires human review.
    """
    normalized_city = (
        city.strip()
    )

    settings = get_settings()

    if not settings.use_serpapi:
        return _local_result(
            city=(
                normalized_city
            ),
            fallback_used=False,
        )

    query = (
        (
            f"Hotels near "
            f"{work_location}, "
            f"{normalized_city}"
        )
        if (
            work_location
            and work_location.strip()
        )
        else (
            f"Hotels in "
            f"{normalized_city}"
        )
    )

    try:
        client = (
            get_serpapi_client()
        )

        hotel_payload = (
            client.search_hotels(
                query=query,
                check_in_date=(
                    check_in_date
                ),
                check_out_date=(
                    check_out_date
                ),
            )
        )

        raw_properties = (
            hotel_payload.get(
                "properties",
                [],
            )
        )

        if not raw_properties:
            live_error = (
                "SerpApi returned no usable hotel "
                "properties for the requested city "
                "and dates."
            )

        else:
            work_coordinates: (
                dict[str, Any]
                | None
            ) = None

            geocoding_error: (
                str | None
            ) = None

            if (
                work_location
                and work_location.strip()
            ):
                try:
                    work_coordinates = (
                        client.geocode_place(
                            place_name=(
                                work_location
                            ),
                            city=(
                                normalized_city
                            ),
                        )
                    )

                except SerpApiError as exc:
                    geocoding_error = (
                        str(exc)
                    )

            hotels = (
                _normalize_live_hotels(
                    payload=(
                        hotel_payload
                    ),
                    city=(
                        normalized_city
                    ),
                    check_in_date=(
                        check_in_date
                    ),
                    check_out_date=(
                        check_out_date
                    ),
                    maximum_results=(
                        settings
                        .serpapi_max_hotel_results
                    ),
                    work_coordinates=(
                        work_coordinates
                    ),
                )
            )

            if hotels:
                distance_verification = (
                    "google_maps"
                    if work_coordinates
                    else "unavailable"
                )

                message = (
                    "Retrieved current hotel pricing "
                    "from Google Hotels through "
                    "SerpApi."
                )

                if geocoding_error:
                    message += (
                        " Work-location distance "
                        "could not be verified "
                        "automatically."
                    )

                return {
                    "items":
                        hotels,
                    "provider":
                        (
                            "Google Hotels "
                            "via SerpApi"
                        ),
                    "source":
                        "live",
                    "live":
                        True,
                    "fallback_used":
                        False,
                    "distance_verification":
                        (
                            distance_verification
                        ),
                    "work_location_coordinates":
                        (
                            work_coordinates
                        ),
                    "message":
                        message,
                    "error":
                        geocoding_error,
                }

            live_error = (
                "SerpApi returned hotel properties, "
                "but none had a usable nightly price."
            )

    except SerpApiError as exc:
        live_error = str(exc)

    if (
        settings
        .travel_fallback_to_local
    ):
        return _local_result(
            city=(
                normalized_city
            ),
            fallback_used=True,
            live_error=(
                live_error
            ),
        )

    raise RuntimeError(
        live_error
    )