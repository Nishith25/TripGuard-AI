from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any


DATA_DIR = (
    Path(__file__)
    .resolve()
    .parents[2]
    / "data"
)

DEFAULT_POLICY_PATH = (
    DATA_DIR
    / "travel_policy.json"
)

ACTIVE_POLICY_PATH = (
    DATA_DIR
    / "active_policy.json"
)


DEFAULT_POLICY_SOURCE = (
    "default_demo_policy"
)

UPLOADED_POLICY_SOURCE = (
    "uploaded_pdf"
)


AUTOMATIC_POLICY_FIELDS = (
    "domestic_flight_class",
    "maximum_round_trip_flight_price",
    "maximum_hotel_price_per_night",
    "maximum_hotel_distance_km",
    "manager_approval_above",
    "advance_booking_days",
    "allowed_transport_budget",
)


FIELD_ALIASES = {
    "domestic flight class":
        "domestic_flight_class",
    "flight class":
        "domestic_flight_class",
    "domestic_flight_class":
        "domestic_flight_class",

    "maximum round trip flight price":
        "maximum_round_trip_flight_price",
    "maximum flight price":
        "maximum_round_trip_flight_price",
    "flight price":
        "maximum_round_trip_flight_price",
    "maximum_round_trip_flight_price":
        "maximum_round_trip_flight_price",

    "maximum hotel price per night":
        "maximum_hotel_price_per_night",
    "hotel price per night":
        "maximum_hotel_price_per_night",
    "maximum_hotel_price_per_night":
        "maximum_hotel_price_per_night",

    "maximum hotel distance km":
        "maximum_hotel_distance_km",
    "hotel distance":
        "maximum_hotel_distance_km",
    "maximum_hotel_distance_km":
        "maximum_hotel_distance_km",

    "manager approval above":
        "manager_approval_above",
    "manager approval threshold":
        "manager_approval_above",
    "manager_approval_above":
        "manager_approval_above",

    "advance booking days":
        "advance_booking_days",
    "advance booking":
        "advance_booking_days",
    "advance_booking_days":
        "advance_booking_days",

    "allowed transport budget":
        "allowed_transport_budget",
    "transport budget":
        "allowed_transport_budget",
    "allowed_transport_budget":
        "allowed_transport_budget",
}


def load_json_file(
    path: Path,
) -> dict[str, Any]:
    with path.open(
        "r",
        encoding="utf-8",
    ) as file:
        data = json.load(file)

    if not isinstance(
        data,
        dict,
    ):
        raise ValueError(
            f"Policy file {path.name} "
            "must contain a JSON object."
        )

    return data


def _normalise_field_name(
    value: Any,
) -> str | None:
    if value is None:
        return None

    normalised = (
        str(value)
        .strip()
        .lower()
        .replace("-", " ")
        .replace("_", " ")
    )

    normalised = " ".join(
        normalised.split()
    )

    canonical = FIELD_ALIASES.get(
        normalised
    )

    if canonical:
        return canonical

    underscore_name = (
        normalised.replace(
            " ",
            "_",
        )
    )

    if (
        underscore_name
        in AUTOMATIC_POLICY_FIELDS
    ):
        return underscore_name

    return None


def _normalise_field_collection(
    value: Any,
) -> set[str]:
    field_names: set[str] = set()

    if isinstance(
        value,
        dict,
    ):
        items = [
            key
            for key, detected
            in value.items()
            if detected
        ]

    elif isinstance(
        value,
        list,
    ):
        items = value

    else:
        items = []

    for item in items:
        field_name = (
            _normalise_field_name(
                item
            )
        )

        if field_name:
            field_names.add(
                field_name
            )

    return field_names


def _get_uploaded_policy_fields(
    policy: dict[str, Any],
) -> set[str]:
    coverage = policy.get(
        "policy_coverage",
        {},
    )

    if not isinstance(
        coverage,
        dict,
    ):
        coverage = {}

    # Prefer fields explicitly detected
    # from the uploaded document.
    for key in (
        "detected_fields",
        "extracted_fields",
    ):
        detected = (
            _normalise_field_collection(
                coverage.get(key)
            )
        )

        if detected:
            return detected

    # If the extractor recorded fields that
    # were absent, infer the detected set.
    not_specified = (
        _normalise_field_collection(
            coverage.get(
                "not_specified_fields"
            )
        )
    )

    if not_specified:
        return (
            set(
                AUTOMATIC_POLICY_FIELDS
            )
            - not_specified
        )

    # Compatibility fallback for older
    # active-policy files.
    enforced = (
        _normalise_field_collection(
            coverage.get(
                "enforced_fields"
            )
        )
    )

    if enforced:
        return enforced

    # Last fallback: only fields whose
    # extracted top-level values are present.
    return {
        field_name
        for field_name
        in AUTOMATIC_POLICY_FIELDS
        if policy.get(
            field_name
        )
        is not None
    }


def _extract_rule_field(
    rule: Any,
) -> str | None:
    if isinstance(
        rule,
        dict,
    ):
        for key in (
            "field",
            "field_name",
            "rule_key",
            "key",
            "name",
        ):
            field_name = (
                _normalise_field_name(
                    rule.get(key)
                )
            )

            if field_name:
                return field_name

        serialised = json.dumps(
            rule,
            default=str,
        )

    else:
        serialised = str(rule)

    normalised_text = (
        serialised
        .lower()
        .replace("-", " ")
        .replace("_", " ")
    )

    for alias, field_name in (
        FIELD_ALIASES.items()
    ):
        alias_text = alias.replace(
            "_",
            " ",
        )

        if alias_text in normalised_text:
            return field_name

    return None


def _sanitise_uploaded_policy(
    policy: dict[str, Any],
) -> dict[str, Any]:
    sanitised = deepcopy(
        policy
    )

    detected_fields = (
        _get_uploaded_policy_fields(
            sanitised
        )
    )

    for field_name in (
        AUTOMATIC_POLICY_FIELDS
    ):
        if (
            field_name
            not in detected_fields
        ):
            sanitised[
                field_name
            ] = None

    enforced_fields = [
        field_name
        for field_name
        in AUTOMATIC_POLICY_FIELDS
        if (
            field_name
            in detected_fields
            and sanitised.get(
                field_name
            )
            is not None
        )
    ]

    not_specified_fields = [
        field_name
        for field_name
        in AUTOMATIC_POLICY_FIELDS
        if (
            field_name
            not in detected_fields
        )
    ]

    coverage = sanitised.get(
        "policy_coverage",
        {},
    )

    if not isinstance(
        coverage,
        dict,
    ):
        coverage = {}

    unsupported_rules = (
        coverage.get(
            "unsupported_rules",
            [],
        )
    )

    if not isinstance(
        unsupported_rules,
        list,
    ):
        unsupported_rules = []

    coverage[
        "detected_fields"
    ] = enforced_fields

    coverage[
        "enforced_fields"
    ] = enforced_fields

    coverage[
        "not_specified_fields"
    ] = not_specified_fields

    coverage[
        "unsupported_rules"
    ] = unsupported_rules

    coverage[
        "requires_manual_review"
    ] = bool(
        coverage.get(
            "requires_manual_review",
            False,
        )
        or unsupported_rules
    )

    coverage[
        "using_default_demo_policy"
    ] = False

    sanitised[
        "policy_coverage"
    ] = coverage

    source = sanitised.get(
        "source",
        {},
    )

    if not isinstance(
        source,
        dict,
    ):
        source = {}

    source["type"] = (
        UPLOADED_POLICY_SOURCE
    )

    sanitised["source"] = source

    existing_rules = sanitised.get(
        "rules",
        [],
    )

    if not isinstance(
        existing_rules,
        list,
    ):
        existing_rules = []

    filtered_rules = []

    for rule in existing_rules:
        rule_field = (
            _extract_rule_field(
                rule
            )
        )

        if (
            rule_field
            in enforced_fields
        ):
            filtered_rules.append(
                rule
            )

    # The graph currently uses rules mainly
    # for the enforceable-rule count. Create
    # safe compatibility entries when the old
    # rule list cannot be matched.
    if (
        not filtered_rules
        and enforced_fields
    ):
        filtered_rules = [
            {
                "field":
                    field_name,
                "value":
                    sanitised.get(
                        field_name
                    ),
                "source":
                    UPLOADED_POLICY_SOURCE,
            }
            for field_name
            in enforced_fields
        ]

    sanitised["rules"] = (
        filtered_rules
    )

    return sanitised


def _mark_default_policy(
    policy: dict[str, Any],
) -> dict[str, Any]:
    marked_policy = deepcopy(
        policy
    )

    source = marked_policy.get(
        "source",
        {},
    )

    if not isinstance(
        source,
        dict,
    ):
        source = {}

    source["type"] = (
        DEFAULT_POLICY_SOURCE
    )

    marked_policy["source"] = (
        source
    )

    coverage = marked_policy.get(
        "policy_coverage",
        {},
    )

    if not isinstance(
        coverage,
        dict,
    ):
        coverage = {}

    coverage[
        "using_default_demo_policy"
    ] = True

    marked_policy[
        "policy_coverage"
    ] = coverage

    return marked_policy


def active_policy_exists() -> bool:
    return (
        ACTIVE_POLICY_PATH.exists()
    )


def load_travel_policy() -> dict[str, Any]:
    """
    Load one policy source only.

    Uploaded-policy fields are strictly
    limited to fields detected from the
    uploaded PDF. Missing uploaded fields
    are never filled from the demo policy.
    """
    if ACTIVE_POLICY_PATH.exists():
        active_policy = (
            load_json_file(
                ACTIVE_POLICY_PATH
            )
        )

        return (
            _sanitise_uploaded_policy(
                active_policy
            )
        )

    if DEFAULT_POLICY_PATH.exists():
        default_policy = (
            load_json_file(
                DEFAULT_POLICY_PATH
            )
        )

        return (
            _mark_default_policy(
                default_policy
            )
        )

    raise FileNotFoundError(
        "No active or default travel "
        "policy was found."
    )