from __future__ import annotations

import asyncio
from datetime import date, datetime
from typing import Any, TypedDict

from langgraph.graph import (
    END,
    START,
    StateGraph,
)

from app.tools.flight_tool import (
    search_flights,
)

from app.tools.hotel_tool import (
    search_hotels,
)

from app.tools.policy_tool import (
    load_travel_policy,
)

from app.tools.weather_tool import (
    fetch_weather_forecast,
)


class TripGuardState(
    TypedDict,
    total=False,
):
    request: dict[str, Any]
    requirements: dict[str, Any]
    policy: dict[str, Any]
    flights: list[
        dict[str, Any]
    ]
    hotels: list[
        dict[str, Any]
    ]
    inventory_sources: dict[
        str,
        Any,
    ]
    weather: dict[str, Any]
    evaluated_options: list[
        dict[str, Any]
    ]
    result: dict[str, Any]
    trace: list[
        dict[str, str]
    ]


def add_trace(
    state: TripGuardState,
    tool: str,
    message: str,
    status: str = "completed",
) -> list[dict[str, str]]:
    trace = list(
        state.get(
            "trace",
            [],
        )
    )

    trace.append(
        {
            "tool":
                tool,
            "message":
                message,
            "status":
                status,
        }
    )

    return trace


def _optional_float(
    value: Any,
) -> float | None:
    if value is None:
        return None

    try:
        return float(value)

    except (
        TypeError,
        ValueError,
    ):
        return None


def parse_requirements_node(
    state: TripGuardState,
) -> dict[str, Any]:
    request = state[
        "request"
    ]

    departure_date = (
        datetime.strptime(
            request[
                "departure_date"
            ],
            "%Y-%m-%d",
        ).date()
    )

    return_date = (
        datetime.strptime(
            request[
                "return_date"
            ],
            "%Y-%m-%d",
        ).date()
    )

    number_of_nights = max(
        (
            return_date
            - departure_date
        ).days,
        1,
    )

    requirements = {
        "origin":
            (
                request["origin"]
                .strip()
                .upper()
            ),
        "destination":
            (
                request[
                    "destination"
                ]
                .strip()
                .upper()
            ),
        "destination_city":
            (
                request[
                    "destination_city"
                ].strip()
            ),
        "departure_date":
            request[
                "departure_date"
            ],
        "return_date":
            request[
                "return_date"
            ],
        "number_of_nights":
            number_of_nights,
        "budget":
            float(
                request[
                    "budget"
                ]
            ),
        "arrival_before":
            request.get(
                "arrival_before"
            ),
        "work_location":
            request.get(
                "work_location"
            ),
        "purpose":
            request.get(
                "purpose"
            ),
    }

    return {
        "requirements":
            requirements,
        "trace":
            add_trace(
                state,
                "Requirement Planner",
                (
                    "Extracted route, dates, "
                    "budget, purpose and arrival "
                    "constraints. Trip duration: "
                    f"{number_of_nights} night(s)."
                ),
            ),
    }


def retrieve_policy_node(
    state: TripGuardState,
) -> dict[str, Any]:
    policy = (
        load_travel_policy()
    )

    source = (
        policy
        .get(
            "source",
            {},
        )
        .get("type")
        or "default_policy"
    )

    policy_coverage = (
        policy.get(
            "policy_coverage",
            {},
        )
    )

    manual_review_required = (
        policy_coverage.get(
            "requires_manual_review",
            False,
        )
    )

    enforceable_rule_count = len(
        policy.get(
            "rules",
            [],
        )
    )

    message = (
        f"Loaded {enforceable_rule_count} "
        "enforceable travel-policy rule(s) "
        f"from {source}."
    )

    if manual_review_required:
        message += (
            " Additional clauses require "
            "human review."
        )

    return {
        "policy":
            policy,
        "trace":
            add_trace(
                state,
                "Policy Retrieval Tool",
                message,
                status=(
                    "warning"
                    if manual_review_required
                    else "completed"
                ),
            ),
    }


def search_inventory_node(
    state: TripGuardState,
) -> dict[str, Any]:
    requirements = state[
        "requirements"
    ]

    flight_search = (
        search_flights(
            origin=(
                requirements[
                    "origin"
                ]
            ),
            destination=(
                requirements[
                    "destination"
                ]
            ),
            departure_date=(
                requirements[
                    "departure_date"
                ]
            ),
            return_date=(
                requirements[
                    "return_date"
                ]
            ),
        )
    )

    hotel_search = (
        search_hotels(
            city=(
                requirements[
                    "destination_city"
                ]
            ),
            work_location=(
                requirements.get(
                    "work_location"
                )
            ),
            check_in_date=(
                requirements[
                    "departure_date"
                ]
            ),
            check_out_date=(
                requirements[
                    "return_date"
                ]
            ),
        )
    )

    flights = (
        flight_search.get(
            "items",
            [],
        )
    )

    hotels = (
        hotel_search.get(
            "items",
            [],
        )
    )

    flight_message = (
        f"Found {len(flights)} matching "
        "round-trip flight option(s) using "
        f"{flight_search.get('provider', 'the configured provider')}."
    )

    if flight_search.get(
        "fallback_used"
    ):
        flight_message += (
            " Live search failed and local "
            "fallback was used."
        )

    trace = add_trace(
        state,
        "Flight Search Tool",
        flight_message,
        status=(
            "warning"
            if flight_search.get(
                "fallback_used"
            )
            else "completed"
        ),
    )

    temporary_state = dict(
        state
    )

    temporary_state[
        "trace"
    ] = trace

    hotel_message = (
        f"Found {len(hotels)} matching "
        "hotel option(s) using "
        f"{hotel_search.get('provider', 'the configured provider')}."
    )

    if hotel_search.get(
        "fallback_used"
    ):
        hotel_message += (
            " Live search failed and local "
            "fallback was used."
        )

    elif (
        hotel_search.get(
            "distance_verification"
        )
        == "unavailable"
    ):
        hotel_message += (
            " Work-location distance requires "
            "manual verification."
        )

    trace = add_trace(
        temporary_state,
        "Hotel Search Tool",
        hotel_message,
        status=(
            "warning"
            if (
                hotel_search.get(
                    "fallback_used"
                )
                or hotel_search.get(
                    "distance_verification"
                )
                == "unavailable"
            )
            else "completed"
        ),
    )

    inventory_sources = {
        "flight":
            {
                key: value
                for (
                    key,
                    value,
                ) in (
                    flight_search.items()
                )
                if key != "items"
            },
        "hotel":
            {
                key: value
                for (
                    key,
                    value,
                ) in (
                    hotel_search.items()
                )
                if key != "items"
            },
    }

    return {
        "flights":
            flights,
        "hotels":
            hotels,
        "inventory_sources":
            inventory_sources,
        "trace":
            trace,
    }


def weather_intelligence_node(
    state: TripGuardState,
) -> dict[str, Any]:
    requirements = state[
        "requirements"
    ]

    weather = asyncio.run(
        fetch_weather_forecast(
            city=(
                requirements[
                    "destination_city"
                ]
            ),
            start_date=(
                requirements[
                    "departure_date"
                ]
            ),
            end_date=(
                requirements[
                    "return_date"
                ]
            ),
        )
    )

    if weather.get(
        "available"
    ):
        departure_weather = (
            weather.get(
                "departure_day",
                {},
            )
        )

        message = (
            "Retrieved live forecast for "
            f"{requirements['destination_city']}. "
            "Departure conditions: "
            f"{departure_weather.get('condition', 'unknown')}; "
            "weather risk: "
            f"{weather.get('risk_level', 'unknown')}."
        )

        status = "completed"

    else:
        message = (
            weather.get(
                "message"
            )
            or (
                "Weather forecast was unavailable. "
                "The travel workflow continued "
                "without it."
            )
        )

        status = "warning"

    return {
        "weather":
            weather,
        "trace":
            add_trace(
                state,
                "Weather Intelligence Tool",
                message,
                status=status,
            ),
    }


def evaluate_options_node(
    state: TripGuardState,
) -> dict[str, Any]:
    policy = state[
        "policy"
    ]

    requirements = state[
        "requirements"
    ]

    flights = state.get(
        "flights",
        [],
    )

    hotels = state.get(
        "hotels",
        [],
    )

    evaluated_options: list[
        dict[str, Any]
    ] = []

    number_of_nights = (
        requirements[
            "number_of_nights"
        ]
    )

    transport_budget = (
        policy.get(
            "allowed_transport_budget"
        )
        or 0
    )

    policy_coverage = (
        policy.get(
            "policy_coverage",
            {},
        )
    )

    policy_manual_review_required = (
        policy_coverage.get(
            "requires_manual_review",
            False,
        )
    )

    parsed_departure_date = (
        datetime.strptime(
            requirements[
                "departure_date"
            ],
            "%Y-%m-%d",
        ).date()
    )

    days_before_departure = (
        parsed_departure_date
        - date.today()
    ).days

    for flight in flights:
        for hotel in hotels:
            violations: list[
                str
            ] = []

            warnings: list[
                str
            ] = []

            manual_review_reasons: list[
                str
            ] = []

            flight_price = (
                _optional_float(
                    flight.get(
                        "round_trip_price"
                    )
                )
            )

            hotel_price_per_night = (
                _optional_float(
                    hotel.get(
                        "price_per_night"
                    )
                )
            )

            if flight_price is None:
                violations.append(
                    "Flight price could not be verified."
                )

                flight_price = 0.0

            if (
                hotel_price_per_night
                is None
            ):
                violations.append(
                    "Hotel nightly price could not be verified."
                )

                hotel_price_per_night = (
                    0.0
                )

            hotel_total = (
                hotel_price_per_night
                * number_of_nights
            )

            total_cost = (
                flight_price
                + hotel_total
                + float(
                    transport_budget
                )
            )

            required_class = (
                policy.get(
                    "domestic_flight_class"
                )
            )

            flight_class = str(
                flight.get(
                    "travel_class"
                )
                or ""
            ).strip().lower()

            if required_class:
                if not flight_class:
                    warnings.append(
                        "Flight class could not be "
                        "verified from live inventory."
                    )

                    manual_review_reasons.append(
                        "Verify the selected flight class."
                    )

                elif (
                    flight_class
                    != str(
                        required_class
                    ).lower()
                ):
                    violations.append(
                        "Domestic flight is not in "
                        "the travel class permitted "
                        "by the uploaded policy."
                    )

            maximum_flight_price = (
                policy.get(
                    "maximum_round_trip_flight_price"
                )
            )

            if (
                maximum_flight_price
                is not None
                and flight_price
                > float(
                    maximum_flight_price
                )
            ):
                violations.append(
                    "Round-trip flight price exceeds "
                    "the uploaded policy limit."
                )

            maximum_hotel_price = (
                policy.get(
                    "maximum_hotel_price_per_night"
                )
            )

            if (
                maximum_hotel_price
                is not None
                and hotel_price_per_night
                > float(
                    maximum_hotel_price
                )
            ):
                violations.append(
                    "Hotel nightly price exceeds "
                    "the uploaded policy limit."
                )

            maximum_hotel_distance = (
                policy.get(
                    "maximum_hotel_distance_km"
                )
            )

            hotel_distance = (
                _optional_float(
                    hotel.get(
                        "distance_from_work_location_km"
                    )
                )
            )

            if (
                maximum_hotel_distance
                is not None
            ):
                if hotel_distance is None:
                    warnings.append(
                        "Hotel distance from the work "
                        "location could not be verified "
                        "automatically."
                    )

                    manual_review_reasons.append(
                        "Verify the selected hotel's "
                        "distance from the work location."
                    )

                elif (
                    hotel_distance
                    > float(
                        maximum_hotel_distance
                    )
                ):
                    violations.append(
                        "Hotel is farther from the work "
                        "location than the uploaded "
                        "policy permits."
                    )

            arrival_before = (
                requirements.get(
                    "arrival_before"
                )
            )

            arrival_time = str(
                flight.get(
                    "arrival_time"
                )
                or ""
            ).strip()

            if arrival_before:
                if not arrival_time:
                    warnings.append(
                        "Flight arrival time could not "
                        "be verified from live inventory."
                    )

                    manual_review_reasons.append(
                        "Verify the selected flight "
                        "arrival time."
                    )

                elif (
                    arrival_time
                    > arrival_before
                ):
                    violations.append(
                        "Flight arrives after the "
                        "traveller's required arrival time."
                    )

            if (
                total_cost
                > requirements[
                    "budget"
                ]
            ):
                violations.append(
                    "Trip cost exceeds the traveller's "
                    "stated budget."
                )

            manager_approval_limit = (
                policy.get(
                    "manager_approval_above"
                )
            )

            if (
                manager_approval_limit
                is not None
                and total_cost
                > float(
                    manager_approval_limit
                )
            ):
                warnings.append(
                    "Manager approval is required "
                    "because the trip exceeds the "
                    "uploaded policy's cost threshold."
                )

            advance_booking_days = (
                policy.get(
                    "advance_booking_days"
                )
            )

            if (
                advance_booking_days
                is not None
                and days_before_departure
                < int(
                    advance_booking_days
                )
            ):
                warnings.append(
                    "Trip is being booked inside the "
                    "advance-booking period specified "
                    "by the uploaded policy."
                )

            if (
                policy_manual_review_required
            ):
                warnings.append(
                    "Some uploaded policy clauses "
                    "could not be automatically "
                    "enforced and require human review."
                )

            evaluated_options.append(
                {
                    "flight":
                        flight,
                    "hotel":
                        hotel,
                    "number_of_nights":
                        number_of_nights,
                    "flight_cost":
                        flight_price,
                    "hotel_cost":
                        hotel_total,
                    "transport_budget":
                        float(
                            transport_budget
                        ),
                    "total_cost":
                        total_cost,
                    "budget_remaining":
                        (
                            requirements[
                                "budget"
                            ]
                            - total_cost
                        ),
                    "is_compliant":
                        (
                            len(
                                violations
                            )
                            == 0
                        ),
                    "violations":
                        violations,
                    "warnings":
                        warnings,
                    "violation_count":
                        len(
                            violations
                        ),
                    "manual_review_required":
                        (
                            len(
                                manual_review_reasons
                            )
                            > 0
                        ),
                    "manual_review_reasons":
                        (
                            manual_review_reasons
                        ),
                }
            )

    compliant_count = sum(
        1
        for option in (
            evaluated_options
        )
        if option[
            "is_compliant"
        ]
    )

    inventory_manual_review_count = (
        sum(
            1
            for option in (
                evaluated_options
            )
            if option.get(
                "manual_review_required"
            )
        )
    )

    message = (
        f"Evaluated {len(evaluated_options)} "
        "flight-hotel combinations. "
        f"{compliant_count} option(s) satisfy "
        "all automatically enforceable rules."
    )

    if (
        inventory_manual_review_count
    ):
        message += (
            f" {inventory_manual_review_count} "
            "option(s) contain inventory fields "
            "requiring manual verification."
        )

    return {
        "evaluated_options":
            evaluated_options,
        "trace":
            add_trace(
                state,
                "Policy Compliance Tool",
                message,
                status=(
                    "warning"
                    if (
                        policy_manual_review_required
                        or inventory_manual_review_count
                    )
                    else "completed"
                ),
            ),
    }


def select_recommendation_node(
    state: TripGuardState,
) -> dict[str, Any]:
    options = state.get(
        "evaluated_options",
        [],
    )

    requirements = state[
        "requirements"
    ]

    policy = state[
        "policy"
    ]

    policy_coverage = (
        policy.get(
            "policy_coverage",
            {
                "requires_manual_review":
                    False,
                "unsupported_rules":
                    [],
                "enforced_fields":
                    [],
                "not_specified_fields":
                    [],
            },
        )
    )

    weather = state.get(
        "weather",
        {
            "available":
                False,
            "message":
                "Weather was not checked.",
        },
    )

    inventory_sources = (
        state.get(
            "inventory_sources",
            {},
        )
    )

    if not options:
        return {
            "result": {
                "status":
                    "no_inventory",
                "message":
                    (
                        "No matching flight and "
                        "hotel inventory was found."
                    ),
                "weather":
                    weather,
                "policy_coverage":
                    policy_coverage,
                "inventory_sources":
                    inventory_sources,
            },
            "trace":
                add_trace(
                    state,
                    "Decision Agent",
                    (
                        "No recommendation could be "
                        "generated because matching "
                        "inventory was unavailable."
                    ),
                    status="failed",
                ),
        }

    compliant_options = [
        option
        for option in options
        if option[
            "is_compliant"
        ]
    ]

    if compliant_options:
        selected = min(
            compliant_options,
            key=lambda option: (
                bool(
                    option.get(
                        "manual_review_required"
                    )
                ),
                option[
                    "total_cost"
                ],
                option[
                    "flight"
                ].get(
                    "arrival_time",
                    "23:59",
                ),
            ),
        )

        decision_type = (
            "compliant_recommendation"
        )

        explanation = (
            "Selected the lowest-cost option "
            "that satisfies the traveller's "
            "constraints and every uploaded "
            "policy rule that TripGuard could "
            "automatically enforce."
        )

    else:
        selected = min(
            options,
            key=lambda option: (
                option[
                    "violation_count"
                ],
                bool(
                    option.get(
                        "manual_review_required"
                    )
                ),
                option[
                    "total_cost"
                ],
                option[
                    "flight"
                ].get(
                    "arrival_time",
                    "23:59",
                ),
            ),
        )

        decision_type = (
            "exception_required"
        )

        explanation = (
            "No fully compliant option was "
            "available. TripGuard selected "
            "the option with the fewest policy "
            "violations and the lowest total cost."
        )

    manager_approval_limit = (
        policy.get(
            "manager_approval_above"
        )
    )

    cost_approval_required = (
        manager_approval_limit
        is not None
        and selected[
            "total_cost"
        ]
        > float(
            manager_approval_limit
        )
    )

    policy_manual_review_required = (
        policy_coverage.get(
            "requires_manual_review",
            False,
        )
    )

    inventory_manual_review_required = (
        bool(
            selected.get(
                "manual_review_required"
            )
        )
    )

    approval_required = (
        cost_approval_required
        or not selected[
            "is_compliant"
        ]
        or policy_manual_review_required
        or inventory_manual_review_required
    )

    if (
        policy_manual_review_required
    ):
        explanation += (
            " Some uploaded policy clauses "
            "were preserved for human review "
            "because they are outside the "
            "current automatic enforcement schema."
        )

    if (
        inventory_manual_review_required
    ):
        explanation += (
            " One or more live inventory fields "
            "could not be verified automatically "
            "and must be confirmed by a human reviewer."
        )

    exception_amount = max(
        selected[
            "total_cost"
        ]
        - requirements[
            "budget"
        ],
        0,
    )

    travel_advisories: list[
        str
    ] = []

    if weather.get(
        "available"
    ):
        risk_level = (
            weather.get(
                "risk_level",
                "low",
            )
        )

        weather_advice = (
            weather.get(
                "advice"
            )
        )

        if weather_advice:
            travel_advisories.append(
                weather_advice
            )

        if risk_level == "high":
            travel_advisories.append(
                "Consider a flexible fare "
                "because weather disruption "
                "risk is high."
            )

    else:
        travel_advisories.append(
            weather.get(
                "message"
            )
            or (
                "Weather information was "
                "unavailable and was not used "
                "in the final decision."
            )
        )

    approval_reasons: list[
        str
    ] = []

    if cost_approval_required:
        approval_reasons.append(
            "The trip exceeds the "
            "manager-approval threshold."
        )

    if not selected[
        "is_compliant"
    ]:
        approval_reasons.append(
            "The recommendation contains "
            "policy or traveller constraint "
            "exceptions."
        )

    if (
        policy_manual_review_required
    ):
        approval_reasons.append(
            "Some uploaded policy clauses "
            "require manual review."
        )

    if (
        inventory_manual_review_required
    ):
        approval_reasons.append(
            "Some live inventory fields "
            "require manual verification."
        )

    result = {
        "status":
            decision_type,
        "explanation":
            explanation,
        "trip": {
            "origin":
                requirements[
                    "origin"
                ],
            "destination":
                requirements[
                    "destination"
                ],
            "destination_city":
                requirements[
                    "destination_city"
                ],
            "departure_date":
                requirements[
                    "departure_date"
                ],
            "return_date":
                requirements[
                    "return_date"
                ],
            "purpose":
                requirements.get(
                    "purpose"
                ),
        },
        "selected_flight":
            selected[
                "flight"
            ],
        "selected_hotel":
            selected[
                "hotel"
            ],
        "inventory_sources":
            inventory_sources,
        "weather":
            weather,
        "travel_advisories":
            travel_advisories,
        "policy_coverage":
            policy_coverage,
        "cost_summary": {
            "flight_cost":
                selected[
                    "flight_cost"
                ],
            "hotel_cost":
                selected[
                    "hotel_cost"
                ],
            "transport_budget":
                selected[
                    "transport_budget"
                ],
            "total_cost":
                selected[
                    "total_cost"
                ],
            "traveller_budget":
                requirements[
                    "budget"
                ],
            "budget_remaining":
                selected[
                    "budget_remaining"
                ],
            "exception_amount":
                exception_amount,
        },
        "compliance": {
            "is_compliant":
                selected[
                    "is_compliant"
                ],
            "violations":
                selected[
                    "violations"
                ],
            "warnings":
                selected[
                    "warnings"
                ],
            "approval_required":
                approval_required,
            "manual_policy_review_required":
                (
                    policy_manual_review_required
                ),
            "manual_inventory_review_required":
                (
                    inventory_manual_review_required
                ),
            "manual_inventory_review_reasons":
                selected.get(
                    "manual_review_reasons",
                    [],
                ),
        },
        "approval_request": {
            "prepared":
                approval_required,
            "reason":
                (
                    " ".join(
                        approval_reasons
                    )
                    if approval_reasons
                    else (
                        "No additional manager "
                        "approval is required."
                    )
                ),
        },
        "alternatives_evaluated":
            len(options),
    }

    return {
        "result":
            result,
        "trace":
            add_trace(
                state,
                "Decision Agent",
                (
                    "Selected option "
                    f"{selected['flight']['id']} "
                    "with hotel "
                    f"{selected['hotel']['id']}. "
                    f"Decision: {decision_type}."
                ),
                status=(
                    "warning"
                    if approval_required
                    else "completed"
                ),
            ),
    }


def build_tripguard_graph():
    builder = StateGraph(
        TripGuardState
    )

    builder.add_node(
        "parse_requirements",
        parse_requirements_node,
    )

    builder.add_node(
        "retrieve_policy",
        retrieve_policy_node,
    )

    builder.add_node(
        "search_inventory",
        search_inventory_node,
    )

    builder.add_node(
        "weather_intelligence",
        weather_intelligence_node,
    )

    builder.add_node(
        "evaluate_options",
        evaluate_options_node,
    )

    builder.add_node(
        "select_recommendation",
        select_recommendation_node,
    )

    builder.add_edge(
        START,
        "parse_requirements",
    )

    builder.add_edge(
        "parse_requirements",
        "retrieve_policy",
    )

    builder.add_edge(
        "retrieve_policy",
        "search_inventory",
    )

    builder.add_edge(
        "search_inventory",
        "weather_intelligence",
    )

    builder.add_edge(
        "weather_intelligence",
        "evaluate_options",
    )

    builder.add_edge(
        "evaluate_options",
        "select_recommendation",
    )

    builder.add_edge(
        "select_recommendation",
        END,
    )

    return builder.compile()


tripguard_graph = (
    build_tripguard_graph()
)