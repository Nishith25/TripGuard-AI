import json
from pathlib import Path
from typing import Any


DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def search_hotels(city: str) -> list[dict[str, Any]]:
    """
    Searches the local hotel inventory.

    The search is currently city-based. Later, this tool can call
    a live hotel inventory or maps API.
    """
    hotels_path = DATA_DIR / "hotels.json"

    if not hotels_path.exists():
        raise FileNotFoundError(
            f"Hotel inventory was not found at {hotels_path}"
        )

    with hotels_path.open("r", encoding="utf-8") as file:
        hotels = json.load(file)

    normalized_city = city.strip().lower()

    return [
        hotel
        for hotel in hotels
        if hotel["city"].strip().lower() == normalized_city
    ]