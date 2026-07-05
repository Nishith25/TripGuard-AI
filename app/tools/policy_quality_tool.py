from __future__ import annotations

import re
from copy import deepcopy
from typing import Any


SUPPORTED_POLICY_FIELDS = [
    "domestic_flight_class",
    "maximum_round_trip_flight_price",
    "maximum_hotel_price_per_night",
    "maximum_hotel_distance_km",
    "manager_approval_above",
    "advance_booking_days",
    "allowed_transport_budget",
]


KNOWN_RULE_PATTERNS = [
    re.compile(
        r"\b(?:economy|business|premium economy|first)\s+class\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:round[\s-]?trip|return|domestic)\s+flight\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:flight|airfare|air ticket)\b"
        r".{0,100}"
        r"\b(?:price|fare|cost|limit|cap|exceed)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:hotel|accommodation|lodging)\b"
        r".{0,100}"
        r"\b(?:price|rate|cost|night|limit|cap|exceed)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:hotel|accommodation|lodging)\b"
        r".{0,120}"
        r"\b(?:km|kms|kilometres?|kilometers?)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:manager|management|supervisor)\s+approval\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\bapproval\s+(?:threshold|limit|required)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:advance\s+booking|booked\s+at\s+least)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:local|ground)?\s*transport\b"
        r".{0,80}"
        r"\b(?:budget|allowance|limit|cap)\b",
        re.IGNORECASE,
    ),
]


POLICY_KEYWORDS = {
    "airfare",
    "airline",
    "approval",
    "approved",
    "booking",
    "business class",
    "cancellation",
    "economy",
    "employee",
    "expense",
    "fare",
    "flight",
    "hotel",
    "invoice",
    "lodging",
    "meal",
    "per diem",
    "policy",
    "receipt",
    "reimbursement",
    "refundable",
    "transport",
    "travel",
}


RULE_LANGUAGE = {
    "must",
    "should",
    "shall",
    "cannot",
    "may not",
    "not exceed",
    "required",
    "permitted",
    "allowed",
    "only",
    "approval",
    "eligible",
    "reimburse",
    "prohibited",
}


def normalize_rule_text(text: str) -> str:
    return re.sub(
        r"\s+",
        " ",
        text,
    ).strip()


def split_policy_sentences(
    extracted_text: str,
) -> list[str]:
    """
    Split PDF text into candidate policy clauses.

    PDF extraction often creates irregular lines and bullets, so both
    line breaks and punctuation are treated as possible boundaries.
    """
    cleaned_text = (
        extracted_text
        .replace("•", ". ")
        .replace("▪", ". ")
        .replace("●", ". ")
        .replace("◦", ". ")
        .replace("–", "-")
        .replace("—", "-")
    )

    pieces = re.split(
        r"(?<=[.!?;])\s+|\n+",
        cleaned_text,
    )

    sentences: list[str] = []

    for piece in pieces:
        sentence = normalize_rule_text(
            piece
        )

        if 20 <= len(sentence) <= 600:
            sentences.append(sentence)

    return list(
        dict.fromkeys(sentences)
    )


def looks_like_policy_rule(
    sentence: str,
) -> bool:
    lowercase_sentence = sentence.lower()

    keyword_count = sum(
        1
        for keyword in POLICY_KEYWORDS
        if keyword in lowercase_sentence
    )

    contains_rule_language = any(
        expression in lowercase_sentence
        for expression in RULE_LANGUAGE
    )

    return (
        keyword_count >= 1
        and contains_rule_language
    )


def is_known_supported_rule(
    sentence: str,
) -> bool:
    return any(
        pattern.search(sentence)
        for pattern in KNOWN_RULE_PATTERNS
    )


def find_unsupported_rules(
    extracted_text: str,
) -> list[str]:
    """
    Preserve policy-like clauses that the current automatic schema
    cannot safely enforce.
    """
    unsupported_rules: list[str] = []

    for sentence in split_policy_sentences(
        extracted_text
    ):
        if not looks_like_policy_rule(
            sentence
        ):
            continue

        if is_known_supported_rule(
            sentence
        ):
            continue

        unsupported_rules.append(
            sentence
        )

    return unsupported_rules[:20]


def format_policy_number(
    value: float | int,
) -> str:
    numeric_value = float(value)

    if numeric_value.is_integer():
        return f"{int(numeric_value):,}"

    return f"{numeric_value:g}"


def build_detected_rules(
    policy: dict[str, Any],
) -> list[str]:
    """
    Build policy rules only from values actually detected in the PDF.
    """
    rules: list[str] = []

    flight_class = policy.get(
        "domestic_flight_class"
    )

    if flight_class:
        rules.append(
            "Domestic flights must be booked in "
            f"{flight_class} class."
        )

    flight_price = policy.get(
        "maximum_round_trip_flight_price"
    )

    if flight_price is not None:
        rules.append(
            "Round-trip flight price should not exceed INR "
            f"{format_policy_number(flight_price)}."
        )

    hotel_price = policy.get(
        "maximum_hotel_price_per_night"
    )

    if hotel_price is not None:
        rules.append(
            "Hotel price should not exceed INR "
            f"{format_policy_number(hotel_price)} per night."
        )

    hotel_distance = policy.get(
        "maximum_hotel_distance_km"
    )

    if hotel_distance is not None:
        rules.append(
            "Hotel should be within "
            f"{format_policy_number(hotel_distance)} kilometres "
            "of the work location."
        )

    approval_limit = policy.get(
        "manager_approval_above"
    )

    if approval_limit is not None:
        rules.append(
            "Trips costing more than INR "
            f"{format_policy_number(approval_limit)} "
            "require manager approval."
        )

    advance_days = policy.get(
        "advance_booking_days"
    )

    if advance_days is not None:
        rules.append(
            "Domestic travel should normally be booked at least "
            f"{format_policy_number(advance_days)} days in advance."
        )

    transport_budget = policy.get(
        "allowed_transport_budget"
    )

    if transport_budget is not None:
        rules.append(
            "The permitted local transport budget is INR "
            f"{format_policy_number(transport_budget)}."
        )

    return rules


def make_uploaded_policy_safe(
    parsed_policy: dict[str, Any],
    detected_fields: list[str],
    fallback_fields: list[str],
    extracted_text: str,
) -> tuple[
    dict[str, Any],
    dict[str, Any],
]:
    """
    Remove demo-policy fallback values from an uploaded policy.

    A missing field becomes None and is not automatically enforced.
    Unrecognised clauses are preserved and routed to human review.
    """
    safe_policy = deepcopy(
        parsed_policy
    )

    fallback_field_set = set(
        fallback_fields
    )

    detected_field_set = set(
        detected_fields
    )

    missing_fields: list[str] = []

    for field_name in SUPPORTED_POLICY_FIELDS:
        if field_name in fallback_field_set:
            safe_policy[field_name] = None
            missing_fields.append(
                field_name
            )

    if "company_name" in fallback_field_set:
        safe_policy[
            "company_name"
        ] = "Uploaded Travel Policy"

    enforced_fields = [
        field_name
        for field_name in SUPPORTED_POLICY_FIELDS
        if (
            field_name in detected_field_set
            and safe_policy.get(
                field_name
            ) is not None
        )
    ]

    unsupported_rules = (
        find_unsupported_rules(
            extracted_text
        )
    )

    requires_manual_review = (
        len(unsupported_rules) > 0
        or len(enforced_fields) == 0
    )

    coverage = {
        "mode": "safe_extraction",
        "detected_fields": sorted(
            detected_field_set
        ),
        "enforced_fields": (
            enforced_fields
        ),
        "not_specified_fields": (
            missing_fields
        ),
        "unsupported_rules": (
            unsupported_rules
        ),
        "supported_rule_count": len(
            enforced_fields
        ),
        "unsupported_rule_count": len(
            unsupported_rules
        ),
        "requires_manual_review": (
            requires_manual_review
        ),
        "uses_demo_fallback_values": False,
        "note": (
            "Only rules detected in the uploaded PDF are "
            "automatically enforced. Unrecognised clauses "
            "require human review."
        ),
    }

    safe_policy["rules"] = (
        build_detected_rules(
            safe_policy
        )
    )

    safe_policy[
        "policy_coverage"
    ] = coverage

    safe_policy["source"] = {
        **safe_policy.get(
            "source",
            {},
        ),
        "type": "uploaded_pdf",
        "extraction_mode": (
            "safe_extraction"
        ),
    }

    return safe_policy, coverage