"""Hindsight access for reviewed traveller decisions.

The identifier is demo-only: a production deployment needs real authentication.
"""

from __future__ import annotations

import os
import re

from hindsight_client import Hindsight
from hindsight_client_api.exceptions import NotFoundException


_TRAVELLER_ID = re.compile(r"^[A-Za-z0-9_-]{3,32}$", re.ASCII)


def bank_id_for(traveller_id: str) -> str:
    if not isinstance(traveller_id, str) or not _TRAVELLER_ID.fullmatch(traveller_id):
        raise ValueError("Use a 3–32 character traveller ID (letters, digits, _ or -).")
    return "tripguard-traveller-" + traveller_id.lower()


def _client() -> Hindsight | None:
    base_url = os.getenv("HINDSIGHT_BASE_URL", "").strip()
    if not base_url:
        return None
    settings = {"base_url": base_url, "timeout": 10.0}
    api_key = os.getenv("HINDSIGHT_API_KEY", "").strip()
    if api_key:
        settings["api_key"] = api_key
    return Hindsight(**settings)


def retain_hotel_decision(
    traveller_id: str,
    destination_city: str,
    work_location: str,
    decision: str,
    max_hotel_distance_km: float | None,
    note: str,
    approval_id: str,
) -> bool:
    """Persist one final manager decision; failures must not undo the review."""
    try:
        bank_id = bank_id_for(traveller_id)
        client = _client()
        if client is None:
            return False

        content = (
            f"TripGuard manager decision for traveller {traveller_id}: "
            f"{decision}. Destination: {destination_city}. "
            f"Workplace: {work_location}. "
        )
        if max_hotel_distance_km is not None:
            content += (
                f"Hotel too far for this workplace; prefer hotels within "
                f"{max_hotel_distance_km:g} km of {work_location}. "
            )
        if note:
            content += f"Manager's reason: {note.strip()[:1000]}"

        with client:
            response = client.retain(
                bank_id=bank_id,
                content=content,
                document_id="approval-" + approval_id,
                metadata={
                    "destination_city": destination_city.strip().casefold(),
                    "work_location": work_location.strip().casefold(),
                    "max_hotel_distance_km": (
                        f"{max_hotel_distance_km:g}" if max_hotel_distance_km is not None else ""
                    ),
                    "feedback_reason": "hotel_too_far" if max_hotel_distance_km is not None else "",
                },
                retain_async=False,
            )
        return getattr(response, "success", False) is True
    except Exception:
        return False



def retain_manager_preference(
    traveller_id: str,
    destination_city: str,
    work_location: str,
    decision: str,
    feedback_reason: str,
    note: str,
    approval_id: str,
) -> bool:
    """Persist reusable manager feedback in Hindsight."""

    try:
        bank_id = bank_id_for(
            traveller_id
        )

        client = _client()

        if client is None:
            return False

        cleaned_note = (
            note.strip()[:1000]
            if note
            else ""
        )

        preference_labels = {
            "urgent_short_notice": (
                "Urgent short-notice trip preference"
            ),
            "cost_exception": (
                "Cost exception preference"
            ),
            "other": (
                "General manager travel preference"
            ),
        }

        preference_label = (
            preference_labels.get(
                feedback_reason,
                "Manager travel preference",
            )
        )

        content = (
            f"TripGuard manager decision for traveller "
            f"{traveller_id}: {decision}. "
            f"Destination: {destination_city}. "
            f"Workplace: {work_location}. "
            f"Preference type: {preference_label}. "
        )

        if cleaned_note:
            content += (
                f"Manager's reason and future preference: "
                f"{cleaned_note}"
            )

        with client:
            response = client.retain(
                bank_id=bank_id,
                content=content,
                document_id=(
                    "approval-"
                    + approval_id
                ),
                metadata={
                    "destination_city": (
                        destination_city
                        .strip()
                        .casefold()
                    ),
                    "work_location": (
                        work_location
                        .strip()
                        .casefold()
                    ),
                    "feedback_reason": (
                        feedback_reason
                    ),
                    "decision": (
                        decision
                    ),
                },
                retain_async=False,
            )

        return (
            getattr(
                response,
                "success",
                False,
            )
            is True
        )

    except Exception as exc:
        print(
            "Hindsight manager preference retain failed:",
            repr(exc),
            flush=True,
        )
        return False

def recall_hotel_preference(
    traveller_id: str,
    destination_city: str,
    work_location: str,
) -> dict | None:
    """Return one validated soft preference from relevant Hindsight memory.

    Failure is raised to the graph, which records an unavailable memory step.
    Untrusted memory is never interpreted as policy or executable instructions.
    """
    bank_id = bank_id_for(traveller_id)
    client = _client()
    if client is None:
        raise RuntimeError("Hindsight is not configured")
    destination = destination_city.strip().casefold()
    workplace = work_location.strip().casefold()
    if not destination or not workplace:
        return None

    try:
        with client:
            response = client.recall(
                bank_id=bank_id,
                query=(
                    f"Manager hotel distance decision for {destination_city} "
                    f"workplace {work_location}; prefer hotels within km"
                ),
                include_chunks=True,
                max_tokens=400,
            )
    except NotFoundException:
        # Hindsight creates a traveller's bank on their first retain.
        return None

    for item in getattr(response, "results", ()):
        metadata = getattr(item, "metadata", None) or {}
        if not isinstance(metadata, dict):
            continue
        if (str(metadata.get("destination_city", "")).strip().casefold() != destination
                or str(metadata.get("work_location", "")).strip().casefold() != workplace
                or metadata.get("feedback_reason") != "hotel_too_far"):
            continue
        try:
            threshold = float(metadata.get("max_hotel_distance_km", ""))
        except (TypeError, ValueError):
            continue
        if not 0.5 <= threshold <= 20:
            continue
        return {
            "max_hotel_distance_km": threshold,
            "reason": (
                f"A past manager decision for {destination_city} at "
                f"{work_location} preferred hotels within {threshold:g} km."
            ),
            "source": "Hindsight manager decision",
        }
    return None
