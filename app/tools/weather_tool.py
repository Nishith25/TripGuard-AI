from __future__ import annotations

from datetime import datetime
from typing import Any

import httpx


GEOCODING_URL = (
    "https://geocoding-api.open-meteo.com/v1/search"
)

FORECAST_URL = (
    "https://api.open-meteo.com/v1/forecast"
)


WEATHER_CODE_LABELS = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Freezing fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snowfall",
    73: "Moderate snowfall",
    75: "Heavy snowfall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


SEVERE_WEATHER_CODES = {
    65,
    67,
    75,
    82,
    86,
    95,
    96,
    99,
}


RAIN_WEATHER_CODES = {
    51,
    53,
    55,
    56,
    57,
    61,
    63,
    65,
    66,
    67,
    80,
    81,
    82,
    95,
    96,
    99,
}


def weather_code_label(
    weather_code: int | None,
) -> str:
    if weather_code is None:
        return "Unknown conditions"

    return WEATHER_CODE_LABELS.get(
        weather_code,
        f"Weather code {weather_code}",
    )


def safe_list_value(
    values: list[Any] | None,
    index: int,
    default: Any = None,
) -> Any:
    if not values:
        return default

    if index >= len(values):
        return default

    return values[index]


def calculate_weather_risk(
    weather_codes: list[int],
    precipitation_probabilities: list[float],
    wind_speeds: list[float],
) -> str:
    maximum_rain_probability = max(
        precipitation_probabilities,
        default=0,
    )

    maximum_wind_speed = max(
        wind_speeds,
        default=0,
    )

    has_severe_weather = any(
        code in SEVERE_WEATHER_CODES
        for code in weather_codes
    )

    has_rain = any(
        code in RAIN_WEATHER_CODES
        for code in weather_codes
    )

    if (
        has_severe_weather
        or maximum_rain_probability >= 70
        or maximum_wind_speed >= 45
    ):
        return "high"

    if (
        has_rain
        or maximum_rain_probability >= 40
        or maximum_wind_speed >= 30
    ):
        return "moderate"

    return "low"


def build_weather_advice(
    risk_level: str,
    maximum_rain_probability: float,
    maximum_wind_speed: float,
) -> str:
    if risk_level == "high":
        return (
            "Potentially disruptive weather is forecast. "
            "Allow extra airport transfer time and review "
            "flexible booking or rebooking options."
        )

    if risk_level == "moderate":
        return (
            "Some weather disruption is possible. Carry rain "
            "protection and keep additional transfer time."
        )

    if maximum_wind_speed >= 20:
        return (
            "Conditions appear manageable, although moderately "
            "windy periods may occur."
        )

    if maximum_rain_probability >= 20:
        return (
            "Conditions appear manageable with a small chance "
            "of rain."
        )

    return (
        "Weather conditions appear favourable for the planned trip."
    )


async def geocode_city(
    city: str,
) -> dict[str, Any]:
    """
    Resolve a destination city into latitude and longitude.
    """
    async with httpx.AsyncClient(
        timeout=12.0,
    ) as client:
        response = await client.get(
            GEOCODING_URL,
            params={
                "name": city,
                "count": 1,
                "language": "en",
                "format": "json",
            },
        )

        response.raise_for_status()
        payload = response.json()

    results = payload.get("results") or []

    if not results:
        raise ValueError(
            f"No geographic result was found for {city}."
        )

    location = results[0]

    return {
        "name": location.get("name", city),
        "country": location.get("country"),
        "admin1": location.get("admin1"),
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "timezone": location.get("timezone"),
    }


async def fetch_weather_forecast(
    city: str,
    start_date: str,
    end_date: str,
) -> dict[str, Any]:
    """
    Retrieve live daily weather forecast data from Open-Meteo.

    Weather failure does not stop the travel agent. Instead, the
    result returns available=False so the rest of the workflow can
    continue.
    """
    try:
        datetime.strptime(
            start_date,
            "%Y-%m-%d",
        )

        datetime.strptime(
            end_date,
            "%Y-%m-%d",
        )
    except ValueError:
        return {
            "available": False,
            "source": "Open-Meteo",
            "message": (
                "Weather forecast could not be requested because "
                "the travel dates are invalid."
            ),
        }

    try:
        location = await geocode_city(city)

        async with httpx.AsyncClient(
            timeout=15.0,
        ) as client:
            response = await client.get(
                FORECAST_URL,
                params={
                    "latitude": location["latitude"],
                    "longitude": location["longitude"],
                    "daily": (
                        "weather_code,"
                        "temperature_2m_max,"
                        "temperature_2m_min,"
                        "precipitation_probability_max,"
                        "wind_speed_10m_max"
                    ),
                    "timezone": "auto",
                    "start_date": start_date,
                    "end_date": end_date,
                },
            )

            response.raise_for_status()
            payload = response.json()

        daily = payload.get("daily") or {}

        dates = daily.get("time") or []
        weather_codes = daily.get("weather_code") or []
        maximum_temperatures = (
            daily.get("temperature_2m_max") or []
        )
        minimum_temperatures = (
            daily.get("temperature_2m_min") or []
        )
        precipitation_probabilities = (
            daily.get(
                "precipitation_probability_max"
            )
            or []
        )
        wind_speeds = (
            daily.get("wind_speed_10m_max") or []
        )

        if not dates:
            return {
                "available": False,
                "source": "Open-Meteo",
                "location": location,
                "message": (
                    "No forecast was returned for the selected dates."
                ),
            }

        forecast_days: list[dict[str, Any]] = []

        for index, forecast_date in enumerate(dates):
            weather_code = safe_list_value(
                weather_codes,
                index,
            )

            forecast_days.append(
                {
                    "date": forecast_date,
                    "weather_code": weather_code,
                    "condition": weather_code_label(
                        weather_code
                    ),
                    "temperature_max_c": safe_list_value(
                        maximum_temperatures,
                        index,
                    ),
                    "temperature_min_c": safe_list_value(
                        minimum_temperatures,
                        index,
                    ),
                    "precipitation_probability_percent": (
                        safe_list_value(
                            precipitation_probabilities,
                            index,
                            0,
                        )
                    ),
                    "wind_speed_max_kmh": safe_list_value(
                        wind_speeds,
                        index,
                        0,
                    ),
                }
            )

        numeric_weather_codes = [
            int(code)
            for code in weather_codes
            if code is not None
        ]

        numeric_rain_probabilities = [
            float(value)
            for value in precipitation_probabilities
            if value is not None
        ]

        numeric_wind_speeds = [
            float(value)
            for value in wind_speeds
            if value is not None
        ]

        risk_level = calculate_weather_risk(
            numeric_weather_codes,
            numeric_rain_probabilities,
            numeric_wind_speeds,
        )

        maximum_rain_probability = max(
            numeric_rain_probabilities,
            default=0,
        )

        maximum_wind_speed = max(
            numeric_wind_speeds,
            default=0,
        )

        return {
            "available": True,
            "source": "Open-Meteo",
            "location": location,
            "risk_level": risk_level,
            "maximum_precipitation_probability_percent": (
                maximum_rain_probability
            ),
            "maximum_wind_speed_kmh": maximum_wind_speed,
            "departure_day": forecast_days[0],
            "forecast_days": forecast_days,
            "advice": build_weather_advice(
                risk_level,
                maximum_rain_probability,
                maximum_wind_speed,
            ),
        }

    except httpx.HTTPStatusError as exc:
        return {
            "available": False,
            "source": "Open-Meteo",
            "message": (
                "The weather service could not provide a forecast "
                f"for the selected dates. HTTP {exc.response.status_code}."
            ),
        }

    except httpx.RequestError:
        return {
            "available": False,
            "source": "Open-Meteo",
            "message": (
                "The weather service could not be reached. "
                "TripGuard continued without weather data."
            ),
        }

    except (KeyError, TypeError, ValueError) as exc:
        return {
            "available": False,
            "source": "Open-Meteo",
            "message": str(exc),
        }