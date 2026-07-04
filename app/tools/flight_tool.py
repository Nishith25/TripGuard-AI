import json
from pathlib import Path
from typing import Any


DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def search_flights(
    origin: str,
    destination: str,
) -> list[dict[str, Any]]:
    """
    Searches the local flight inventory.

    This mock tool will later be replaced with a real travel API.
    """
    flights_path = DATA_DIR / "flights.json"

    if not flights_path.exists():
        raise FileNotFoundError(
            f"Flight inventory was not found at {flights_path}"
        )

    with flights_path.open("r", encoding="utf-8") as file:
        flights = json.load(file)

    normalized_origin = origin.strip().upper()
    normalized_destination = destination.strip().upper()

    return [
        flight
        for flight in flights
        if flight["origin"].upper() == normalized_origin
        and flight["destination"].upper() == normalized_destination
    ]