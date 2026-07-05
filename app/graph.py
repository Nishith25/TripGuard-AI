from __future__ import annotations

import asyncio
from datetime import date, datetime
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from app.tools.flight_tool import search_flights
from app.tools.hotel_tool import search_hotels
from app.tools.policy_tool import load_travel_policy
from app.tools.weather_tool import fetch_weather_forecast


class TripGuardState(
    TypedDict,
    total=False,
):
    request: dict[str, Any]
    requirements: dict[str, Any]
    policy: dict[str, Any]
    flights: list[dict[str, Any]]
    hotels: list[dict[str, Any]]
    weather: dict[str, Any]
    evaluated_options: list[
        dict[str, Any]
    ]
    result: dict[str, Any]
    trace: list[dict[str, str]]


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
            "tool": tool,
            "message": message,
            "status": status,
        }
    )

    return trace


def parse_requirements_node(
    state: TripGuardState,
) -> dict[str, Any]:
    request = state["request"]

    departure_date = datetime.strptime(
        request["departure_date"],
        "%Y-%m-%d",
    ).date()

    return_date = datetime.strptime(
        request["return_date"],
        "%Y-%m-%d",
    ).date()

    number_of_nights = max(
        (
            return_date
            - departure_date
        ).days,
        1,
    )

    requirements = {
        "origin": (
            request["origin"]
            .strip()
            .upper()
        ),
        "destination": (
            request["destination"]
            .strip()
            .upper()
        ),
        "destination_city": (
            request[
                "destination_city"
            ].strip()
        ),
        "departure_date": request[
            "departure_date"
        ],
        "return_date": request[
            "return_date"
        ],
        "number_of_nights": (
            number_of_nights
        ),
        "budget": float(
            request["budget"]
        ),
        "arrival_before": (
            request.get(
                "arrival_before"
            )
        ),
        "work_location": (
            request.get(
                "work_location"
            )
        ),
        "purpose": request.get(
            "purpose"
        ),
    }

    return {
        "requirements": requirements,
        "trace": add_trace(
            state,
            "Requirement Planner",
            (
                "Extracted route, dates, budget, purpose and "
                f"arrival constraints. Trip duration: "
                f"{number_of_nights} night(s)."
            ),
        ),
    }


def retrieve_policy_node(
    state: TripGuardState,
) -> dict[str, Any]:
    policy = load_travel_policy()

    source = (
        policy
        .get("source", {})
        .get("type")
        or "default_policy"
    )

    policy_coverage = policy.get(
        "policy_coverage",
        {},
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
        f"Loaded {enforceable_rule_count} enforceable "
        f"travel-policy rule(s) from {source}."
    )

    if manual_review_required:
        message += (
            " Additional clauses require human review."
        )

    return {
        "policy": policy,
        "trace": add_trace(
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

    flights = search_flights(
        origin=requirements[
            "origin"
        ],
        destination=requirements[
            "destination"
        ],
    )

    hotels = search_hotels(
        city=requirements[
            "destination_city"
        ],
    )

    trace = add_trace(
        state,
        "Flight Search Tool",
        (
            f"Found {len(flights)} matching round-trip "
            "flight option(s)."
        ),
    )

    temporary_state = dict(
        state
    )

    temporary_state[
        "trace"
    ] = trace

    trace = add_trace(
        temporary_state,
        "Hotel Search Tool",
        (
            f"Found {len(hotels)} matching hotel option(s)."
        ),
    )

    return {
        "flights": flights,
        "hotels": hotels,
        "trace": trace,
    }


def weather_intelligence_node(
    state: TripGuardState,
) -> dict[str, Any]:
    requirements = state[
        "requirements"
    ]

    weather = asyncio.run(
        fetch_weather_forecast(
            city=requirements[
                "destination_city"
            ],
            start_date=requirements[
                "departure_date"
            ],
            end_date=requirements[
                "return_date"
            ],
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
                "The travel workflow continued without it."
            )
        )

        status = "warning"

    return {
        "weather": weather,
        "trace": add_trace(
            state,
            "Weather Intelligence Tool",
            message,
            status=status,
        ),
    }


def evaluate_options_node(
    state: TripGuardState,
) -> dict[str, Any]:
    policy = state["policy"]

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

    policy_coverage = policy.get(
        "policy_coverage",
        {},
    )

    manual_review_required = (
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
            violations: list[str] = []
            warnings: list[str] = []

            flight_price = float(
                flight[
                    "round_trip_price"
                ]
            )

            hotel_price_per_night = float(
                hotel[
                    "price_per_night"
                ]
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

            if (
                required_class
                and flight[
                    "travel_class"
                ].lower()
                != str(
                    required_class
                ).lower()
            ):
                violations.append(
                    "Domestic flight is not in the travel class "
                    "permitted by the uploaded policy."
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
                    "Round-trip flight price exceeds the uploaded "
                    "policy limit."
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
                    "Hotel nightly price exceeds the uploaded "
                    "policy limit."
                )

            maximum_hotel_distance = (
                policy.get(
                    "maximum_hotel_distance_km"
                )
            )

            if (
                maximum_hotel_distance
                is not None
                and float(
                    hotel[
                        "distance_from_work_location_km"
                    ]
                )
                > float(
                    maximum_hotel_distance
                )
            ):
                violations.append(
                    "Hotel is farther from the work location "
                    "than the uploaded policy permits."
                )

            arrival_before = (
                requirements.get(
                    "arrival_before"
                )
            )

            if (
                arrival_before
                and flight[
                    "arrival_time"
                ]
                > arrival_before
            ):
                violations.append(
                    "Flight arrives after the traveller's required "
                    "arrival time."
                )

            if (
                total_cost
                > requirements[
                    "budget"
                ]
            ):
                violations.append(
                    "Trip cost exceeds the traveller's stated budget."
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
                    "Manager approval is required because the trip "
                    "exceeds the uploaded policy's cost threshold."
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
                    "Trip is being booked inside the advance-booking "
                    "period specified by the uploaded policy."
                )

            if manual_review_required:
                warnings.append(
                    "Some uploaded policy clauses could not be "
                    "automatically enforced and require human review."
                )

            evaluated_options.append(
                {
                    "flight": flight,
                    "hotel": hotel,
                    "number_of_nights": (
                        number_of_nights
                    ),
                    "flight_cost": (
                        flight_price
                    ),
                    "hotel_cost": (
                        hotel_total
                    ),
                    "transport_budget": (
                        float(
                            transport_budget
                        )
                    ),
                    "total_cost": (
                        total_cost
                    ),
                    "budget_remaining": (
                        requirements[
                            "budget"
                        ]
                        - total_cost
                    ),
                    "is_compliant": (
                        len(violations)
                        == 0
                    ),
                    "violations": (
                        violations
                    ),
                    "warnings": (
                        warnings
                    ),
                    "violation_count": len(
                        violations
                    ),
                }
            )

    compliant_count = sum(
        1
        for option in evaluated_options
        if option[
            "is_compliant"
        ]
    )

    return {
        "evaluated_options": (
            evaluated_options
        ),
        "trace": add_trace(
            state,
            "Policy Compliance Tool",
            (
                f"Evaluated {len(evaluated_options)} "
                "flight-hotel combinations. "
                f"{compliant_count} option(s) satisfy all "
                "automatically enforceable rules."
            ),
            status=(
                "warning"
                if manual_review_required
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

    policy = state["policy"]

    policy_coverage = policy.get(
        "policy_coverage",
        {
            "requires_manual_review": False,
            "unsupported_rules": [],
            "enforced_fields": [],
            "not_specified_fields": [],
        },
    )

    weather = state.get(
        "weather",
        {
            "available": False,
            "message": (
                "Weather was not checked."
            ),
        },
    )

    if not options:
        return {
            "result": {
                "status": "no_inventory",
                "message": (
                    "No matching flight and hotel inventory "
                    "was found."
                ),
                "weather": weather,
                "policy_coverage": (
                    policy_coverage
                ),
            },
            "trace": add_trace(
                state,
                "Decision Agent",
                (
                    "No recommendation could be generated because "
                    "matching inventory was unavailable."
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
                option[
                    "total_cost"
                ],
                option[
                    "flight"
                ][
                    "arrival_time"
                ],
            ),
        )

        decision_type = (
            "compliant_recommendation"
        )

        explanation = (
            "Selected the lowest-cost option that satisfies the "
            "traveller's constraints and every uploaded policy rule "
            "that TripGuard could automatically enforce."
        )

    else:
        selected = min(
            options,
            key=lambda option: (
                option[
                    "violation_count"
                ],
                option[
                    "total_cost"
                ],
                option[
                    "flight"
                ][
                    "arrival_time"
                ],
            ),
        )

        decision_type = (
            "exception_required"
        )

        explanation = (
            "No fully compliant option was available. TripGuard "
            "selected the option with the fewest policy violations "
            "and the lowest total cost."
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

    manual_review_required = (
        policy_coverage.get(
            "requires_manual_review",
            False,
        )
    )

    approval_required = (
        cost_approval_required
        or not selected[
            "is_compliant"
        ]
        or manual_review_required
    )

    if manual_review_required:
        explanation += (
            " Some uploaded policy clauses were preserved for "
            "human review because they are outside the current "
            "automatic enforcement schema."
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

    travel_advisories: list[str] = []

    if weather.get(
        "available"
    ):
        risk_level = weather.get(
            "risk_level",
            "low",
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
                "Consider a flexible fare because weather "
                "disruption risk is high."
            )

    else:
        travel_advisories.append(
            weather.get(
                "message"
            )
            or (
                "Weather information was unavailable and was "
                "not used in the final decision."
            )
        )

    approval_reasons: list[str] = []

    if cost_approval_required:
        approval_reasons.append(
            "The trip exceeds the manager-approval threshold."
        )

    if not selected[
        "is_compliant"
    ]:
        approval_reasons.append(
            "The recommendation contains policy or traveller "
            "constraint exceptions."
        )

    if manual_review_required:
        approval_reasons.append(
            "Some uploaded policy clauses require manual review."
        )

    result = {
        "status": decision_type,
        "explanation": explanation,
        "trip": {
            "origin": (
                requirements[
                    "origin"
                ]
            ),
            "destination": (
                requirements[
                    "destination"
                ]
            ),
            "destination_city": (
                requirements[
                    "destination_city"
                ]
            ),
            "departure_date": (
                requirements[
                    "departure_date"
                ]
            ),
            "return_date": (
                requirements[
                    "return_date"
                ]
            ),
            "purpose": (
                requirements.get(
                    "purpose"
                )
            ),
        },
        "selected_flight": (
            selected["flight"]
        ),
        "selected_hotel": (
            selected["hotel"]
        ),
        "weather": weather,
        "travel_advisories": (
            travel_advisories
        ),
        "policy_coverage": (
            policy_coverage
        ),
        "cost_summary": {
            "flight_cost": (
                selected[
                    "flight_cost"
                ]
            ),
            "hotel_cost": (
                selected[
                    "hotel_cost"
                ]
            ),
            "transport_budget": (
                selected[
                    "transport_budget"
                ]
            ),
            "total_cost": (
                selected[
                    "total_cost"
                ]
            ),
            "traveller_budget": (
                requirements[
                    "budget"
                ]
            ),
            "budget_remaining": (
                selected[
                    "budget_remaining"
                ]
            ),
            "exception_amount": (
                exception_amount
            ),
        },
        "compliance": {
            "is_compliant": (
                selected[
                    "is_compliant"
                ]
            ),
            "violations": (
                selected[
                    "violations"
                ]
            ),
            "warnings": (
                selected[
                    "warnings"
                ]
            ),
            "approval_required": (
                approval_required
            ),
            "manual_policy_review_required": (
                manual_review_required
            ),
        },
        "approval_request": {
            "prepared": (
                approval_required
            ),
            "reason": (
                " ".join(
                    approval_reasons
                )
                if approval_reasons
                else (
                    "No additional manager approval is required."
                )
            ),
        },
        "alternatives_evaluated": len(
            options
        ),
    }

    return {
        "result": result,
        "trace": add_trace(
            state,
            "Decision Agent",
            (
                f"Selected option "
                f"{selected['flight']['id']} with hotel "
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