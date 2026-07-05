from __future__ import annotations

import re
import threading
from functools import lru_cache
from typing import Any

import httpx

from app.config import get_settings


SERPAPI_SEARCH_URL = (
    "https://serpapi.com/search.json"
)


class SerpApiError(
    RuntimeError,
):
    """
    Raised when SerpApi cannot return
    a usable response.
    """


class SerpApiClient:
    def __init__(
        self,
        api_key: str,
        timeout_seconds: float,
    ) -> None:
        self.api_key = (
            api_key.strip()
        )

        self.timeout_seconds = (
            timeout_seconds
        )

        self._geocode_cache: dict[
            str,
            dict[str, Any],
        ] = {}

        self._geocode_cache_lock = (
            threading.Lock()
        )

    def _search(
        self,
        parameters: dict[
            str,
            Any,
        ],
    ) -> dict[str, Any]:
        if not self.api_key:
            raise SerpApiError(
                "SERPAPI_API_KEY is not configured."
            )

        request_parameters = {
            **parameters,
            "api_key": self.api_key,
        }

        try:
            response = httpx.get(
                SERPAPI_SEARCH_URL,
                params=(
                    request_parameters
                ),
                timeout=(
                    self.timeout_seconds
                ),
                follow_redirects=True,
            )
        except (
            httpx.TimeoutException
        ) as exc:
            raise SerpApiError(
                "SerpApi request timed out."
            ) from exc

        except httpx.HTTPError as exc:
            raise SerpApiError(
                "SerpApi could not be reached."
            ) from exc

        try:
            payload = response.json()
        except ValueError as exc:
            raise SerpApiError(
                "SerpApi returned a non-JSON response."
            ) from exc

        if response.status_code != 200:
            error_message = (
                payload.get("error")
                if isinstance(
                    payload,
                    dict,
                )
                else None
            )

            raise SerpApiError(
                error_message
                or (
                    "SerpApi request failed "
                    f"with HTTP {response.status_code}."
                )
            )

        if not isinstance(
            payload,
            dict,
        ):
            raise SerpApiError(
                "SerpApi returned an unexpected response format."
            )

        if payload.get("error"):
            raise SerpApiError(
                str(
                    payload["error"]
                )
            )

        return payload

    def search_flights(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        return_date: str,
    ) -> dict[str, Any]:
        return self._search(
            {
                "engine":
                    "google_flights",
                "departure_id":
                    origin,
                "arrival_id":
                    destination,
                "outbound_date":
                    departure_date,
                "return_date":
                    return_date,
                "type":
                    1,
                "travel_class":
                    1,
                "adults":
                    1,
                "currency":
                    "INR",
                "hl":
                    "en",
                "gl":
                    "in",
            }
        )

    def search_hotels(
        self,
        query: str,
        check_in_date: str,
        check_out_date: str,
    ) -> dict[str, Any]:
        return self._search(
            {
                "engine":
                    "google_hotels",
                "q":
                    query,
                "check_in_date":
                    check_in_date,
                "check_out_date":
                    check_out_date,
                "adults":
                    1,
                "children":
                    0,
                "currency":
                    "INR",
                "hl":
                    "en",
                "gl":
                    "in",
            }
        )

    def geocode_place(
        self,
        place_name: str,
        city: str,
    ) -> dict[str, Any]:
        query = ", ".join(
            part.strip()
            for part in (
                place_name,
                city,
            )
            if (
                part
                and part.strip()
            )
        )

        cache_key = (
            query.lower()
        )

        with (
            self._geocode_cache_lock
        ):
            cached_result = (
                self._geocode_cache
                .get(cache_key)
            )

        if cached_result is not None:
            return dict(
                cached_result
            )

        payload = self._search(
            {
                "engine":
                    "google_maps",
                "q":
                    query,
                "type":
                    "search",
                "hl":
                    "en",
                "gl":
                    "in",
            }
        )

        candidates: list[
            dict[str, Any]
        ] = []

        place_results = (
            payload.get(
                "place_results"
            )
        )

        if isinstance(
            place_results,
            dict,
        ):
            candidates.append(
                place_results
            )

        elif isinstance(
            place_results,
            list,
        ):
            candidates.extend(
                item
                for item in (
                    place_results
                )
                if isinstance(
                    item,
                    dict,
                )
            )

        local_results = (
            payload.get(
                "local_results",
                [],
            )
        )

        if isinstance(
            local_results,
            list,
        ):
            candidates.extend(
                item
                for item in (
                    local_results
                )
                if isinstance(
                    item,
                    dict,
                )
            )

        target_tokens = set(
            re.findall(
                r"[a-z0-9]+",
                place_name.lower(),
            )
        )

        def candidate_score(
            candidate: dict[
                str,
                Any,
            ],
        ) -> tuple[int, int]:
            title = str(
                candidate.get(
                    "title"
                )
                or candidate.get(
                    "name"
                )
                or ""
            ).lower()

            title_tokens = set(
                re.findall(
                    r"[a-z0-9]+",
                    title,
                )
            )

            coordinate_block = (
                candidate.get(
                    "gps_coordinates",
                    {},
                )
            )

            has_coordinates = int(
                isinstance(
                    coordinate_block,
                    dict,
                )
                and (
                    coordinate_block.get(
                        "latitude"
                    )
                    is not None
                )
                and (
                    coordinate_block.get(
                        "longitude"
                    )
                    is not None
                )
            )

            return (
                len(
                    target_tokens
                    & title_tokens
                ),
                has_coordinates,
            )

        candidates.sort(
            key=(
                candidate_score
            ),
            reverse=True,
        )

        for candidate in candidates:
            coordinate_block = (
                candidate.get(
                    "gps_coordinates",
                    {},
                )
            )

            if not isinstance(
                coordinate_block,
                dict,
            ):
                continue

            latitude = (
                coordinate_block.get(
                    "latitude"
                )
            )

            longitude = (
                coordinate_block.get(
                    "longitude"
                )
            )

            if (
                latitude is None
                or longitude is None
            ):
                continue

            result = {
                "latitude":
                    float(latitude),
                "longitude":
                    float(longitude),
                "label":
                    (
                        candidate.get(
                            "title"
                        )
                        or candidate.get(
                            "name"
                        )
                        or query
                    ),
                "address":
                    candidate.get(
                        "address"
                    ),
            }

            with (
                self
                ._geocode_cache_lock
            ):
                self._geocode_cache[
                    cache_key
                ] = dict(result)

            return result

        raise SerpApiError(
            "The work location could not be geocoded "
            "from Google Maps results."
        )


@lru_cache(
    maxsize=1,
)
def get_serpapi_client() -> (
    SerpApiClient
):
    settings = get_settings()

    return SerpApiClient(
        api_key=(
            settings
            .serpapi_api_key
        ),
        timeout_seconds=(
            settings
            .serpapi_request_timeout_seconds
        ),
    )