from __future__ import annotations

import io
import json
import re
import unicodedata
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pypdf import PdfReader

from app.tools.policy_quality_tool import (
    make_uploaded_policy_safe,
)


DATA_DIR = Path(__file__).resolve().parents[2] / "data"

DEFAULT_POLICY_PATH = DATA_DIR / "travel_policy.json"
ACTIVE_POLICY_PATH = DATA_DIR / "active_policy.json"
POLICY_METADATA_PATH = DATA_DIR / "policy_metadata.json"

UPLOAD_DIR = DATA_DIR / "uploads"
ACTIVE_PDF_PATH = UPLOAD_DIR / "active_travel_policy.pdf"


DASH_REPLACEMENTS = str.maketrans(
    {
        "\u2010": "-",
        "\u2011": "-",
        "\u2012": "-",
        "\u2013": "-",
        "\u2014": "-",
        "\u2212": "-",
    }
)


MONEY_PATTERN = re.compile(
    r"(?:₹|INR|Rs\.?|Rupees?)"
    r"\s*:?\s*"
    r"("
    r"\d{1,3}(?:\s*,\s*\d{3})+"
    r"|"
    r"\d{4,8}(?:\.\d+)?"
    r")",
    flags=re.IGNORECASE,
)


BARE_MONEY_PATTERN = re.compile(
    r"\b("
    r"\d{1,3}(?:\s*,\s*\d{3})+"
    r"|"
    r"\d{4,8}"
    r")\b",
    flags=re.IGNORECASE,
)


def load_json_file(
    path: Path,
) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(
            f"Required file was not found: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


def save_json_file(
    path: Path,
    value: dict[str, Any],
) -> None:
    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with path.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            value,
            file,
            ensure_ascii=False,
            indent=2,
        )


def extract_pdf_text(
    pdf_bytes: bytes,
) -> tuple[str, int]:
    """
    Extract text from a text-based PDF.

    Scanned or image-only PDFs require OCR and are not automatically
    processed in this prototype.
    """
    try:
        reader = PdfReader(
            io.BytesIO(pdf_bytes)
        )
    except Exception as exc:
        raise ValueError(
            "The uploaded file could not be read as a valid PDF."
        ) from exc

    if reader.is_encrypted:
        try:
            decryption_result = reader.decrypt("")

            if decryption_result == 0:
                raise ValueError(
                    "The PDF requires a password."
                )
        except Exception as exc:
            raise ValueError(
                "Password-protected PDFs are not supported."
            ) from exc

    extracted_pages: list[str] = []

    for page in reader.pages:
        try:
            page_text = (
                page.extract_text()
                or ""
            )
        except Exception:
            page_text = ""

        cleaned_page_text = (
            page_text.strip()
        )

        if cleaned_page_text:
            extracted_pages.append(
                cleaned_page_text
            )

    full_text = "\n\n".join(
        extracted_pages
    ).strip()

    if len(full_text) < 50:
        raise ValueError(
            "Very little selectable text was found. "
            "The PDF may be scanned or image-based. "
            "Upload a text-based PDF."
        )

    return full_text, len(
        reader.pages
    )


def normalize_text(
    text: str,
) -> str:
    normalized = unicodedata.normalize(
        "NFKC",
        text,
    )

    normalized = normalized.translate(
        DASH_REPLACEMENTS
    )

    normalized = (
        normalized
        .replace("\u00a0", " ")
        .replace("\u202f", " ")
    )

    normalized = re.sub(
        r"[\u00ad\u200b\u200c\u200d\u2060\ufeff]",
        "",
        normalized,
    )

    normalized = re.sub(
        r"\s*,\s*",
        ",",
        normalized,
    )

    normalized = re.sub(
        r"\s+",
        " ",
        normalized,
    )

    return normalized.strip()


def normalize_lines(
    text: str,
) -> list[str]:
    normalized_lines: list[str] = []

    for line in text.splitlines():
        cleaned_line = normalize_text(
            line
        )

        if cleaned_line:
            normalized_lines.append(
                cleaned_line
            )

    return normalized_lines


def parse_number(
    raw_value: str,
    *,
    allow_decimal: bool = False,
) -> float | int | None:
    cleaned_value = re.sub(
        r"[,\s]",
        "",
        raw_value,
    )

    cleaned_value = re.sub(
        r"[^0-9.]",
        "",
        cleaned_value,
    )

    if not cleaned_value:
        return None

    try:
        numeric_value = float(
            cleaned_value
        )
    except ValueError:
        return None

    if allow_decimal:
        return numeric_value

    return int(numeric_value)


def find_first_blocker_position(
    text: str,
    blockers: list[str],
) -> int | None:
    lowercase_text = text.lower()
    positions: list[int] = []

    for blocker in blockers:
        position = lowercase_text.find(
            blocker.lower()
        )

        if position >= 0:
            positions.append(
                position
            )

    if not positions:
        return None

    return min(positions)


def find_money_after_labels(
    text: str,
    label_patterns: list[str],
    *,
    blockers: list[str] | None = None,
    search_window: int = 180,
) -> int | None:
    """
    Find a monetary amount following a matching policy label.

    The search stops before another policy category, reducing the risk
    of associating one rule's amount with another rule.
    """
    normalized_text = normalize_text(
        text
    )

    blockers = blockers or []

    for label_pattern in label_patterns:
        matches = re.finditer(
            label_pattern,
            normalized_text,
            flags=re.IGNORECASE,
        )

        for label_match in matches:
            window_start = (
                label_match.end()
            )

            window_end = min(
                window_start
                + search_window,
                len(normalized_text),
            )

            nearby_text = (
                normalized_text[
                    window_start:
                    window_end
                ]
            )

            blocker_position = (
                find_first_blocker_position(
                    nearby_text,
                    blockers,
                )
            )

            if blocker_position is not None:
                nearby_text = (
                    nearby_text[
                        :blocker_position
                    ]
                )

            currency_match = (
                MONEY_PATTERN.search(
                    nearby_text
                )
            )

            if currency_match:
                amount = parse_number(
                    currency_match.group(
                        1
                    )
                )

                if amount is not None:
                    return int(amount)

            bare_amount_match = (
                BARE_MONEY_PATTERN.search(
                    nearby_text
                )
            )

            if bare_amount_match:
                amount = parse_number(
                    bare_amount_match.group(
                        1
                    )
                )

                if amount is not None:
                    return int(amount)

    return None


def find_distance_after_labels(
    text: str,
    label_patterns: list[str],
    *,
    search_window: int = 160,
) -> float | None:
    normalized_text = normalize_text(
        text
    )

    distance_pattern = re.compile(
        r"([\d.]+)\s*"
        r"(?:kilometres?|kilometers?|kms?|km)\b",
        flags=re.IGNORECASE,
    )

    for label_pattern in label_patterns:
        matches = re.finditer(
            label_pattern,
            normalized_text,
            flags=re.IGNORECASE,
        )

        for label_match in matches:
            window_start = (
                label_match.start()
            )

            window_end = min(
                label_match.end()
                + search_window,
                len(normalized_text),
            )

            nearby_text = (
                normalized_text[
                    window_start:
                    window_end
                ]
            )

            distance_match = (
                distance_pattern.search(
                    nearby_text
                )
            )

            if not distance_match:
                continue

            distance = parse_number(
                distance_match.group(1),
                allow_decimal=True,
            )

            if distance is not None:
                return float(distance)

    return None


def find_days_after_labels(
    text: str,
    label_patterns: list[str],
    *,
    search_window: int = 160,
) -> int | None:
    normalized_text = normalize_text(
        text
    )

    days_pattern = re.compile(
        r"(\d+)\s*days?\b",
        flags=re.IGNORECASE,
    )

    for label_pattern in label_patterns:
        matches = re.finditer(
            label_pattern,
            normalized_text,
            flags=re.IGNORECASE,
        )

        for label_match in matches:
            window_start = (
                label_match.start()
            )

            window_end = min(
                label_match.end()
                + search_window,
                len(normalized_text),
            )

            nearby_text = (
                normalized_text[
                    window_start:
                    window_end
                ]
            )

            days_match = (
                days_pattern.search(
                    nearby_text
                )
            )

            if not days_match:
                continue

            number_of_days = (
                parse_number(
                    days_match.group(1)
                )
            )

            if number_of_days is not None:
                return int(
                    number_of_days
                )

    return None


def detect_company_name(
    extracted_text: str,
    fallback_name: str,
) -> str:
    lines = normalize_lines(
        extracted_text
    )

    ignored_phrases = [
        "travel policy",
        "corporate policy",
        "employee travel policy",
        "business travel policy",
        "policy document",
    ]

    for line in lines[:12]:
        lowercase_line = (
            line.lower()
        )

        if any(
            phrase in lowercase_line
            for phrase in ignored_phrases
        ):
            continue

        if re.fullmatch(
            r"(page\s*)?\d+",
            lowercase_line,
        ):
            continue

        if 3 <= len(line) <= 100:
            return line

    return fallback_name


def record_detection(
    detected_fields: list[str],
    fallback_fields: list[str],
    field_name: str,
    detected: bool,
) -> None:
    if detected:
        if field_name not in detected_fields:
            detected_fields.append(
                field_name
            )

        if field_name in fallback_fields:
            fallback_fields.remove(
                field_name
            )

        return

    if field_name not in fallback_fields:
        fallback_fields.append(
            field_name
        )


def parse_policy_text(
    extracted_text: str,
    filename: str,
) -> tuple[
    dict[str, Any],
    list[str],
    list[str],
]:
    default_policy = load_json_file(
        DEFAULT_POLICY_PATH
    )

    policy = deepcopy(
        default_policy
    )

    normalized_text = normalize_text(
        extracted_text
    )

    lowercase_text = (
        normalized_text.lower()
    )

    detected_fields: list[str] = []
    fallback_fields: list[str] = []

    company_name = detect_company_name(
        extracted_text,
        default_policy[
            "company_name"
        ],
    )

    policy["company_name"] = (
        company_name
    )

    record_detection(
        detected_fields,
        fallback_fields,
        "company_name",
        company_name
        != default_policy[
            "company_name"
        ],
    )

    if re.search(
        r"\beconomy\s+class\b",
        lowercase_text,
    ):
        policy[
            "domestic_flight_class"
        ] = "economy"

        record_detection(
            detected_fields,
            fallback_fields,
            "domestic_flight_class",
            True,
        )

    elif re.search(
        r"\bbusiness\s+class\b",
        lowercase_text,
    ):
        policy[
            "domestic_flight_class"
        ] = "business"

        record_detection(
            detected_fields,
            fallback_fields,
            "domestic_flight_class",
            True,
        )

    else:
        record_detection(
            detected_fields,
            fallback_fields,
            "domestic_flight_class",
            False,
        )

    flight_price = find_money_after_labels(
        extracted_text,
        label_patterns=[
            (
                r"\b(?:the\s+)?maximum\s+"
                r"round\s*(?:-\s*)?trip\s+flight\s+"
                r"(?:price|fare|cost)\b"
            ),
            (
                r"\bround\s*(?:-\s*)?trip\s+flight\s+"
                r"(?:price|fare|cost|limit|cap)\b"
            ),
            (
                r"\b(?:the\s+)?maximum\s+"
                r"(?:domestic\s+)?flight\s+"
                r"(?:price|fare|cost)\b"
            ),
            (
                r"\b(?:flight|airfare|air ticket)\s+"
                r"(?:price|fare|cost|limit|cap)\b"
            ),
            (
                r"\b(?:flight|airfare)\b"
                r".{0,50}"
                r"\b(?:must|should|shall|cannot)\b"
                r".{0,30}"
                r"\bexceed\b"
            ),
        ],
        blockers=[
            "hotel",
            "accommodation",
            "lodging",
            "transport",
            "approval",
            "booked",
            "booking",
        ],
    )

    if flight_price is not None:
        policy[
            "maximum_round_trip_flight_price"
        ] = int(flight_price)

        record_detection(
            detected_fields,
            fallback_fields,
            "maximum_round_trip_flight_price",
            True,
        )

    else:
        record_detection(
            detected_fields,
            fallback_fields,
            "maximum_round_trip_flight_price",
            False,
        )

    hotel_price = find_money_after_labels(
        extracted_text,
        label_patterns=[
            (
                r"\b(?:the\s+)?maximum\s+"
                r"(?:hotel|accommodation|lodging)\s+"
                r"(?:price|rate|cost)\b"
            ),
            (
                r"\b(?:hotel|accommodation|lodging)\s+"
                r"(?:price|rate|cost|limit|cap)\b"
            ),
            (
                r"\b(?:hotel|accommodation|lodging)\b"
                r".{0,50}"
                r"\bper\s+night\b"
            ),
            (
                r"\bnightly\s+"
                r"(?:hotel|accommodation|lodging)\s+"
                r"(?:rate|cost|limit|cap)\b"
            ),
        ],
        blockers=[
            "flight",
            "airfare",
            "transport",
            "approval",
            "booked",
            "booking",
            "hotel must be within",
            "hotel should be within",
        ],
    )

    if hotel_price is not None:
        policy[
            "maximum_hotel_price_per_night"
        ] = int(hotel_price)

        record_detection(
            detected_fields,
            fallback_fields,
            "maximum_hotel_price_per_night",
            True,
        )

    else:
        record_detection(
            detected_fields,
            fallback_fields,
            "maximum_hotel_price_per_night",
            False,
        )

    hotel_distance = find_distance_after_labels(
        extracted_text,
        label_patterns=[
            (
                r"\b(?:hotel|accommodation|lodging)\b"
                r".{0,70}"
                r"\b(?:within|distance|located|location)\b"
            ),
            (
                r"\b(?:work location|office|workplace|meeting location)\b"
            ),
        ],
    )

    if hotel_distance is not None:
        policy[
            "maximum_hotel_distance_km"
        ] = hotel_distance

        record_detection(
            detected_fields,
            fallback_fields,
            "maximum_hotel_distance_km",
            True,
        )

    else:
        record_detection(
            detected_fields,
            fallback_fields,
            "maximum_hotel_distance_km",
            False,
        )

    approval_limit = find_money_after_labels(
        extracted_text,
        label_patterns=[
            r"\btrips?\s+costing\s+more\s+than\b",
            r"\btrips?\s+(?:above|over|exceeding)\b",
            (
                r"\bapproval\s+(?:is\s+)?required\b"
                r".{0,60}"
                r"\b(?:above|over|exceeding|for)\b"
            ),
            r"\bmanager\s+approval\b",
            r"\bmanagement\s+approval\b",
            r"\bsupervisor\s+approval\b",
            r"\bapproval\s+(?:threshold|limit)\b",
        ],
        blockers=[
            "flight",
            "hotel",
            "accommodation",
            "lodging",
            "transport",
            "booked",
            "booking",
        ],
    )

    if approval_limit is not None:
        policy[
            "manager_approval_above"
        ] = int(approval_limit)

        record_detection(
            detected_fields,
            fallback_fields,
            "manager_approval_above",
            True,
        )

    else:
        record_detection(
            detected_fields,
            fallback_fields,
            "manager_approval_above",
            False,
        )

    advance_days = find_days_after_labels(
        extracted_text,
        label_patterns=[
            (
                r"\b(?:domestic\s+)?travel\b"
                r".{0,100}"
                r"\b(?:booked|booking|advance)\b"
            ),
            (
                r"\b(?:booked|booking)\b"
                r".{0,70}"
                r"\b(?:at least|minimum|advance)\b"
            ),
            r"\badvance\s+booking\b",
            r"\bminimum\s+booking\s+period\b",
        ],
    )

    if advance_days is not None:
        policy[
            "advance_booking_days"
        ] = int(advance_days)

        record_detection(
            detected_fields,
            fallback_fields,
            "advance_booking_days",
            True,
        )

    else:
        record_detection(
            detected_fields,
            fallback_fields,
            "advance_booking_days",
            False,
        )

    transport_budget = find_money_after_labels(
        extracted_text,
        label_patterns=[
            (
                r"\blocal\s+transport\s+"
                r"(?:budget|allowance|limit|cap)\b"
            ),
            (
                r"\btransport\s+"
                r"(?:budget|allowance|limit|cap)\b"
            ),
            (
                r"\bground\s+transport\s+"
                r"(?:budget|allowance|limit|cap)\b"
            ),
            (
                r"\b(?:taxi|cab|local travel)\s+"
                r"(?:budget|allowance|limit|cap)\b"
            ),
        ],
        blockers=[
            "flight",
            "hotel",
            "accommodation",
            "lodging",
            "approval",
            "booked",
            "booking",
        ],
    )

    if transport_budget is not None:
        policy[
            "allowed_transport_budget"
        ] = int(transport_budget)

        record_detection(
            detected_fields,
            fallback_fields,
            "allowed_transport_budget",
            True,
        )

    else:
        record_detection(
            detected_fields,
            fallback_fields,
            "allowed_transport_budget",
            False,
        )

    policy["currency"] = "INR"

    policy["source"] = {
        "type": "uploaded_pdf",
        "filename": filename,
    }

    return (
        policy,
        detected_fields,
        fallback_fields,
    )


def process_policy_pdf(
    pdf_bytes: bytes,
    filename: str,
) -> dict[str, Any]:
    extracted_text, page_count = (
        extract_pdf_text(
            pdf_bytes
        )
    )

    (
        parsed_policy,
        detected_fields,
        fallback_fields,
    ) = parse_policy_text(
        extracted_text,
        filename,
    )

    original_missing_fields = list(
        fallback_fields
    )

    policy, policy_coverage = (
        make_uploaded_policy_safe(
            parsed_policy=parsed_policy,
            detected_fields=detected_fields,
            fallback_fields=(
                original_missing_fields
            ),
            extracted_text=(
                extracted_text
            ),
        )
    )

    uploaded_at = datetime.now(
        timezone.utc
    ).isoformat()

    metadata = {
        "filename": filename,
        "uploaded_at": uploaded_at,
        "page_count": page_count,
        "extracted_character_count": len(
            extracted_text
        ),
        "detected_fields": (
            detected_fields
        ),
        "missing_fields": (
            policy_coverage[
                "not_specified_fields"
            ]
        ),
        "fallback_fields": [],
        "uses_fallback_values": False,
        "unsupported_rules": (
            policy_coverage[
                "unsupported_rules"
            ]
        ),
        "requires_manual_review": (
            policy_coverage[
                "requires_manual_review"
            ]
        ),
        "policy_coverage": (
            policy_coverage
        ),
        "parsed_values": {
            "company_name": policy.get(
                "company_name"
            ),
            "domestic_flight_class": (
                policy.get(
                    "domestic_flight_class"
                )
            ),
            "maximum_round_trip_flight_price": (
                policy.get(
                    "maximum_round_trip_flight_price"
                )
            ),
            "maximum_hotel_price_per_night": (
                policy.get(
                    "maximum_hotel_price_per_night"
                )
            ),
            "maximum_hotel_distance_km": (
                policy.get(
                    "maximum_hotel_distance_km"
                )
            ),
            "manager_approval_above": (
                policy.get(
                    "manager_approval_above"
                )
            ),
            "advance_booking_days": (
                policy.get(
                    "advance_booking_days"
                )
            ),
            "allowed_transport_budget": (
                policy.get(
                    "allowed_transport_budget"
                )
            ),
        },
    }

    UPLOAD_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    ACTIVE_PDF_PATH.write_bytes(
        pdf_bytes
    )

    save_json_file(
        ACTIVE_POLICY_PATH,
        policy,
    )

    save_json_file(
        POLICY_METADATA_PATH,
        metadata,
    )

    return {
        "policy": policy,
        "metadata": metadata,
        "text_preview": (
            extracted_text[:1500]
        ),
    }


def get_policy_metadata() -> dict[str, Any] | None:
    if not POLICY_METADATA_PATH.exists():
        return None

    return load_json_file(
        POLICY_METADATA_PATH
    )


def remove_active_policy() -> None:
    paths_to_remove = [
        ACTIVE_POLICY_PATH,
        POLICY_METADATA_PATH,
        ACTIVE_PDF_PATH,
    ]

    for path in paths_to_remove:
        if path.exists():
            path.unlink()