from __future__ import annotations

import io
import json
import re
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pypdf import PdfReader


DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DEFAULT_POLICY_PATH = DATA_DIR / "travel_policy.json"
ACTIVE_POLICY_PATH = DATA_DIR / "active_policy.json"
POLICY_METADATA_PATH = DATA_DIR / "policy_metadata.json"
UPLOAD_DIR = DATA_DIR / "uploads"
ACTIVE_PDF_PATH = UPLOAD_DIR / "active_travel_policy.pdf"


def load_json_file(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Required file was not found: {path}")

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_json_file(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8") as file:
        json.dump(
            value,
            file,
            ensure_ascii=False,
            indent=2,
        )


def extract_pdf_text(pdf_bytes: bytes) -> tuple[str, int]:
    """
    Extract text from a text-based PDF.

    Scanned PDFs need OCR and are not supported in this version.
    """
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
    except Exception as exc:
        raise ValueError(
            "The uploaded file could not be read as a valid PDF."
        ) from exc

    if reader.is_encrypted:
        try:
            reader.decrypt("")
        except Exception as exc:
            raise ValueError(
                "Password-protected PDFs are not supported."
            ) from exc

    extracted_pages: list[str] = []

    for page in reader.pages:
        page_text = page.extract_text() or ""
        extracted_pages.append(page_text.strip())

    full_text = "\n\n".join(
        page for page in extracted_pages if page
    ).strip()

    if len(full_text) < 50:
        raise ValueError(
            "Very little text was found. The PDF may be scanned or "
            "image-based. Upload a text-based PDF."
        )

    return full_text, len(reader.pages)


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def find_number(
    text: str,
    patterns: list[str],
    *,
    allow_decimal: bool = False,
) -> float | int | None:
    for pattern in patterns:
        match = re.search(
            pattern,
            text,
            flags=re.IGNORECASE,
        )

        if not match:
            continue

        raw_value = match.group(1).replace(",", "").strip()

        try:
            numeric_value = float(raw_value)
        except ValueError:
            continue

        if allow_decimal:
            return numeric_value

        return int(numeric_value)

    return None


def detect_company_name(
    extracted_text: str,
    fallback_name: str,
) -> str:
    lines = [
        normalize_text(line)
        for line in extracted_text.splitlines()
        if normalize_text(line)
    ]

    for line in lines[:10]:
        lowercase_line = line.lower()

        if "travel policy" in lowercase_line:
            continue

        if "corporate policy" in lowercase_line:
            continue

        if 3 <= len(line) <= 100:
            return line

    return fallback_name


def parse_policy_text(
    extracted_text: str,
    filename: str,
) -> tuple[dict[str, Any], list[str], list[str]]:
    """
    Convert common travel-policy sentences into structured rules.

    Any rule that cannot be identified safely uses the existing
    demo-policy value and is reported as a fallback field.
    """
    default_policy = load_json_file(DEFAULT_POLICY_PATH)
    policy = deepcopy(default_policy)

    searchable_text = normalize_text(extracted_text)
    lowercase_text = searchable_text.lower()

    detected_fields: list[str] = []
    fallback_fields: list[str] = []

    policy["company_name"] = detect_company_name(
        extracted_text,
        default_policy["company_name"],
    )

    if policy["company_name"] != default_policy["company_name"]:
        detected_fields.append("company_name")
    else:
        fallback_fields.append("company_name")

    if "economy class" in lowercase_text:
        policy["domestic_flight_class"] = "economy"
        detected_fields.append("domestic_flight_class")
    elif "business class" in lowercase_text:
        policy["domestic_flight_class"] = "business"
        detected_fields.append("domestic_flight_class")
    else:
        fallback_fields.append("domestic_flight_class")

    flight_price = find_number(
        searchable_text,
        [
            (
                r"(?:round[\s-]?trip|return)\s+flight"
                r"(?:\s+(?:fare|price|cost))?"
                r".{0,60}?(?:₹|inr|rs\.?)\s*([\d,]+)"
            ),
            (
                r"(?:maximum|max|limit)\s+(?:domestic\s+)?flight"
                r"(?:\s+(?:fare|price|cost))?"
                r".{0,50}?(?:₹|inr|rs\.?)\s*([\d,]+)"
            ),
            (
                r"flight.{0,45}?(?:must not|should not|cannot)\s+exceed"
                r".{0,20}?(?:₹|inr|rs\.?)\s*([\d,]+)"
            ),
        ],
    )

    if flight_price is not None:
        policy["maximum_round_trip_flight_price"] = flight_price
        detected_fields.append("maximum_round_trip_flight_price")
    else:
        fallback_fields.append("maximum_round_trip_flight_price")

    hotel_price = find_number(
        searchable_text,
        [
            (
                r"hotel.{0,50}?(?:per night|nightly)"
                r".{0,40}?(?:₹|inr|rs\.?)\s*([\d,]+)"
            ),
            (
                r"(?:maximum|max|limit)\s+hotel"
                r"(?:\s+(?:price|rate|cost))?"
                r".{0,45}?(?:₹|inr|rs\.?)\s*([\d,]+)"
            ),
            (
                r"hotel.{0,45}?(?:must not|should not|cannot)\s+exceed"
                r".{0,20}?(?:₹|inr|rs\.?)\s*([\d,]+)"
            ),
        ],
    )

    if hotel_price is not None:
        policy["maximum_hotel_price_per_night"] = hotel_price
        detected_fields.append("maximum_hotel_price_per_night")
    else:
        fallback_fields.append("maximum_hotel_price_per_night")

    hotel_distance = find_number(
        searchable_text,
        [
            (
                r"hotel.{0,70}?(?:within|maximum|max|not more than)"
                r"\s*([\d.]+)\s*(?:kilometres|kilometers|kms|km)"
            ),
            (
                r"([\d.]+)\s*(?:kilometres|kilometers|kms|km)"
                r".{0,45}?(?:office|work location|meeting location)"
            ),
        ],
        allow_decimal=True,
    )

    if hotel_distance is not None:
        policy["maximum_hotel_distance_km"] = hotel_distance
        detected_fields.append("maximum_hotel_distance_km")
    else:
        fallback_fields.append("maximum_hotel_distance_km")

    approval_limit = find_number(
        searchable_text,
        [
            (
                r"(?:manager|management|supervisor)\s+approval"
                r".{0,55}?(?:above|over|exceeding)"
                r".{0,20}?(?:₹|inr|rs\.?)\s*([\d,]+)"
            ),
            (
                r"trips?\s+(?:costing|above|over)"
                r".{0,20}?(?:₹|inr|rs\.?)\s*([\d,]+)"
                r".{0,45}?approval"
            ),
        ],
    )

    if approval_limit is not None:
        policy["manager_approval_above"] = approval_limit
        detected_fields.append("manager_approval_above")
    else:
        fallback_fields.append("manager_approval_above")

    advance_days = find_number(
        searchable_text,
        [
            (
                r"(?:booked|booking).{0,40}?"
                r"(?:at least|minimum of)\s*(\d+)\s*days?"
            ),
            (
                r"advance(?:\s+booking)?.{0,25}?(\d+)\s*days?"
            ),
        ],
    )

    if advance_days is not None:
        policy["advance_booking_days"] = advance_days
        detected_fields.append("advance_booking_days")
    else:
        fallback_fields.append("advance_booking_days")

    transport_budget = find_number(
        searchable_text,
        [
            (
                r"(?:local\s+)?transport"
                r"(?:\s+(?:budget|allowance|limit))?"
                r".{0,45}?(?:₹|inr|rs\.?)\s*([\d,]+)"
            ),
        ],
    )

    if transport_budget is not None:
        policy["allowed_transport_budget"] = transport_budget
        detected_fields.append("allowed_transport_budget")
    else:
        fallback_fields.append("allowed_transport_budget")

    policy["currency"] = "INR"

    policy["rules"] = [
        (
            "Domestic flights must be booked in "
            f"{policy['domestic_flight_class']} class."
        ),
        (
            "Round-trip flight price should not exceed INR "
            f"{policy['maximum_round_trip_flight_price']:,}."
        ),
        (
            "Hotel price should not exceed INR "
            f"{policy['maximum_hotel_price_per_night']:,} per night."
        ),
        (
            "Hotel should be within "
            f"{policy['maximum_hotel_distance_km']} kilometres "
            "of the work location."
        ),
        (
            "Trips costing more than INR "
            f"{policy['manager_approval_above']:,} require "
            "manager approval."
        ),
        (
            "Domestic travel should normally be booked at least "
            f"{policy['advance_booking_days']} days in advance."
        ),
        (
            "The permitted local transport budget is INR "
            f"{policy['allowed_transport_budget']:,}."
        ),
    ]

    policy["source"] = {
        "type": "uploaded_pdf",
        "filename": filename,
    }

    return policy, detected_fields, fallback_fields


def process_policy_pdf(
    pdf_bytes: bytes,
    filename: str,
) -> dict[str, Any]:
    extracted_text, page_count = extract_pdf_text(pdf_bytes)

    policy, detected_fields, fallback_fields = parse_policy_text(
        extracted_text,
        filename,
    )

    uploaded_at = datetime.now(timezone.utc).isoformat()

    metadata = {
        "filename": filename,
        "uploaded_at": uploaded_at,
        "page_count": page_count,
        "extracted_character_count": len(extracted_text),
        "detected_fields": detected_fields,
        "fallback_fields": fallback_fields,
        "uses_fallback_values": len(fallback_fields) > 0,
    }

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ACTIVE_PDF_PATH.write_bytes(pdf_bytes)

    save_json_file(ACTIVE_POLICY_PATH, policy)
    save_json_file(POLICY_METADATA_PATH, metadata)

    return {
        "policy": policy,
        "metadata": metadata,
        "text_preview": extracted_text[:1000],
    }


def get_policy_metadata() -> dict[str, Any] | None:
    if not POLICY_METADATA_PATH.exists():
        return None

    return load_json_file(POLICY_METADATA_PATH)


def remove_active_policy() -> None:
    for path in [
        ACTIVE_POLICY_PATH,
        POLICY_METADATA_PATH,
        ACTIVE_PDF_PATH,
    ]:
        if path.exists():
            path.unlink()