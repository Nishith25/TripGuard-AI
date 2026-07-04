import json
from pathlib import Path
from typing import Any


DATA_DIR = Path(__file__).resolve().parents[2] / "data"

DEFAULT_POLICY_PATH = DATA_DIR / "travel_policy.json"
ACTIVE_POLICY_PATH = DATA_DIR / "active_policy.json"


def load_json_file(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def load_travel_policy() -> dict[str, Any]:
    """
    Load the uploaded PDF policy when available.

    If no PDF policy has been uploaded, use the original demo policy.
    """
    if ACTIVE_POLICY_PATH.exists():
        return load_json_file(ACTIVE_POLICY_PATH)

    if DEFAULT_POLICY_PATH.exists():
        return load_json_file(DEFAULT_POLICY_PATH)

    raise FileNotFoundError(
        "No active or default travel policy was found."
    )