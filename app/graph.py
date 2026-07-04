from datetime import date, datetime
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from app.tools.flight_tool import search_flights
from app.tools.hotel_tool import search_hotels
from app.tools.policy_tool import load_travel_policy


class TripGuardState(TypedDict, total=False):
    request: dict[str, Any]
    requirements: dict[str, Any]
    policy: dict[str, Any]
    flights: list[dict[str, Any]]
    hotels: list[dict[str, Any]]
    evaluated_options: list[dict[str, Any]]
    result: dict[str, Any]
    trace: list[dict[str, str]]


def add_trace(
    state: TripGuardState,
    tool: str,
    message: str,
    status: str = "completed",
) -> list[dict[str, str]]:
    trace = list(state.get("trace", []))

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

    number_of_nights = max((return_date - departure_date).days, 1)

    requirements = {
        "origin": request["origin"].strip().upper(),
        "destination": request["destination"].strip().upper(),
        "destination_city": request["destination_city"].strip(),
        "departure_date": request["departure_date"],
        "return_date": request["return_date"],
        "number_of_nights": number_of_nights,
        "budget": request["budget"],
        "arrival_before": request.get("arrival_before"),
        "work_location": request.get("work_location"),
        "purpose": request.get("purpose"),
    }

    return {
        "requirements": requirements,
        "trace": add_trace(
            state,
            "Requirement Planner",
            (
                f"Extracted route, dates, budget and arrival constraints. "
                f"Trip duration: {number_of_nights} night(s)."
            ),
        ),
    }


def retrieve_policy_node(
    state: TripGuardState,
) -> dict[str, Any]:
    policy = load_travel_policy()

    return {
        "policy": policy,
        "trace": add_trace(
            state,
            "Policy Retrieval Tool",
            (
                f"Loaded {len(policy.get('rules', []))} company "
                "travel-policy rules."
            ),
        ),
    }


def search_inventory_node(
    state: TripGuardState,
) -> dict[str, Any]:
    requirements = state["requirements"]

    flights = search_flights(
        origin=requirements["origin"],
        destination=requirements["destination"],
    )

    hotels = search_hotels(
        city=requirements["destination_city"],
    )

    trace = add_trace(
        state,
        "Flight Search Tool",
        f"Found {len(flights)} matching round-trip flight option(s).",
    )

    temporary_state = dict(state)
    temporary_state["trace"] = trace

    trace = add_trace(
        temporary_state,
        "Hotel Search Tool",
        f"Found {len(hotels)} matching hotel option(s).",
    )

    return {
        "flights": flights,
        "hotels": hotels,
        "trace": trace,
    }


def evaluate_options_node(
    state: TripGuardState,
) -> dict[str, Any]:
    policy = state["policy"]
    requirements = state["requirements"]
    flights = state.get("flights", [])
    hotels = state.get("hotels", [])

    evaluated_options: list[dict[str, Any]] = []

    number_of_nights = requirements["number_of_nights"]
    transport_budget = policy["allowed_transport_budget"]

    for flight in flights:
        for hotel in hotels:
            violations: list[str] = []
            warnings: list[str] = []

            flight_price = flight["round_trip_price"]
            hotel_total = hotel["price_per_night"] * number_of_nights
            total_cost = flight_price + hotel_total + transport_budget

            if (
                flight["travel_class"].lower()
                != policy["domestic_flight_class"].lower()
            ):
                violations.append(
                    "Domestic flight is not in the permitted economy class."
                )

            if (
                flight_price
                > policy["maximum_round_trip_flight_price"]
            ):
                violations.append(
                    "Round-trip flight price exceeds the policy limit."
                )

            if (
                hotel["price_per_night"]
                > policy["maximum_hotel_price_per_night"]
            ):
                violations.append(
                    "Hotel nightly price exceeds the policy limit."
                )

            if (
                hotel["distance_from_work_location_km"]
                > policy["maximum_hotel_distance_km"]
            ):
                violations.append(
                    "Hotel is farther from the work location than permitted."
                )

            arrival_before = requirements.get("arrival_before")

            if (
                arrival_before
                and flight["arrival_time"] > arrival_before
            ):
                violations.append(
                    "Flight arrives after the required arrival time."
                )

            if total_cost > requirements["budget"]:
                violations.append(
                    "Trip cost exceeds the traveller's stated budget."
                )

            if total_cost > policy["manager_approval_above"]:
                warnings.append(
                    "Manager approval is required due to the total trip cost."
                )

            departure_date = datetime.strptime(
                requirements["departure_date"],
                "%Y-%m-%d",
            ).date()

            days_before_departure = (
                departure_date - date.today()
            ).days

            if days_before_departure < policy["advance_booking_days"]:
                warnings.append(
                    "Trip is being booked inside the recommended "
                    "advance-booking period."
                )

            evaluated_options.append(
                {
                    "flight": flight,
                    "hotel": hotel,
                    "number_of_nights": number_of_nights,
                    "flight_cost": flight_price,
                    "hotel_cost": hotel_total,
                    "transport_budget": transport_budget,
                    "total_cost": total_cost,
                    "budget_remaining": requirements["budget"] - total_cost,
                    "is_compliant": len(violations) == 0,
                    "violations": violations,
                    "warnings": warnings,
                    "violation_count": len(violations),
                }
            )

    compliant_count = sum(
        1
        for option in evaluated_options
        if option["is_compliant"]
    )

    return {
        "evaluated_options": evaluated_options,
        "trace": add_trace(
            state,
            "Policy Compliance Tool",
            (
                f"Evaluated {len(evaluated_options)} flight-hotel "
                f"combinations. {compliant_count} option(s) are fully "
                "compliant."
            ),
        ),
    }


def select_recommendation_node(
    state: TripGuardState,
) -> dict[str, Any]:
    options = state.get("evaluated_options", [])
    requirements = state["requirements"]
    policy = state["policy"]

    if not options:
        return {
            "result": {
                "status": "no_inventory",
                "message": "No matching flight and hotel inventory was found.",
            },
            "trace": add_trace(
                state,
                "Decision Agent",
                "No recommendation could be generated.",
                status="failed",
            ),
        }

    compliant_options = [
        option
        for option in options
        if option["is_compliant"]
    ]

    if compliant_options:
        selected = min(
            compliant_options,
            key=lambda option: (
                option["total_cost"],
                option["flight"]["arrival_time"],
            ),
        )

        decision_type = "compliant_recommendation"
        explanation = (
            "Selected the lowest-cost option that satisfies the "
            "traveller's constraints and company travel policy."
        )
    else:
        selected = min(
            options,
            key=lambda option: (
                option["violation_count"],
                option["total_cost"],
                option["flight"]["arrival_time"],
            ),
        )

        decision_type = "exception_required"
        explanation = (
            "No fully compliant option was available. Selected the option "
            "with the fewest policy violations and lowest total cost."
        )

    approval_required = (
        selected["total_cost"] > policy["manager_approval_above"]
        or not selected["is_compliant"]
    )

    exception_amount = max(
        selected["total_cost"] - requirements["budget"],
        0,
    )

    result = {
        "status": decision_type,
        "explanation": explanation,
        "trip": {
            "origin": requirements["origin"],
            "destination": requirements["destination"],
            "departure_date": requirements["departure_date"],
            "return_date": requirements["return_date"],
            "purpose": requirements.get("purpose"),
        },
        "selected_flight": selected["flight"],
        "selected_hotel": selected["hotel"],
        "cost_summary": {
            "flight_cost": selected["flight_cost"],
            "hotel_cost": selected["hotel_cost"],
            "transport_budget": selected["transport_budget"],
            "total_cost": selected["total_cost"],
            "traveller_budget": requirements["budget"],
            "budget_remaining": selected["budget_remaining"],
            "exception_amount": exception_amount,
        },
        "compliance": {
            "is_compliant": selected["is_compliant"],
            "violations": selected["violations"],
            "warnings": selected["warnings"],
            "approval_required": approval_required,
        },
        "approval_request": {
            "prepared": approval_required,
            "reason": (
                "Policy exception or cost approval is required."
                if approval_required
                else "No additional approval required."
            ),
        },
        "alternatives_evaluated": len(options),
    }

    return {
        "result": result,
        "trace": add_trace(
            state,
            "Decision Agent",
            (
                f"Selected option {selected['flight']['id']} with hotel "
                f"{selected['hotel']['id']}. Decision: {decision_type}."
            ),
        ),
    }


def build_tripguard_graph():
    builder = StateGraph(TripGuardState)

    builder.add_node("parse_requirements", parse_requirements_node)
    builder.add_node("retrieve_policy", retrieve_policy_node)
    builder.add_node("search_inventory", search_inventory_node)
    builder.add_node("evaluate_options", evaluate_options_node)
    builder.add_node("select_recommendation", select_recommendation_node)

    builder.add_edge(START, "parse_requirements")
    builder.add_edge("parse_requirements", "retrieve_policy")
    builder.add_edge("retrieve_policy", "search_inventory")
    builder.add_edge("search_inventory", "evaluate_options")
    builder.add_edge("evaluate_options", "select_recommendation")
    builder.add_edge("select_recommendation", END)

    return builder.compile()


tripguard_graph = build_tripguard_graph()