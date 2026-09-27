"""Behavioral checks for remembered travel decisions."""

import json
from importlib import import_module

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import TravelRequest, app
from app import graph
from app.routes import approvals


def test_traveller_id_is_optional_but_validated():
    base = dict(
        origin="HYD", destination="BLR", destination_city="Bengaluru",
        departure_date="2026-10-01", return_date="2026-10-02", budget=18000,
    )
    assert TravelRequest(**base).traveller_id is None
    assert TravelRequest(**base, traveller_id="NISHITH_01").traveller_id == "NISHITH_01"
    with pytest.raises(ValidationError):
        TravelRequest(**base, traveller_id="../shared")


def test_memory_banks_do_not_mix_travellers():
    memory = import_module("app.integrations.travel_memory")
    assert memory.bank_id_for("A123") == "tripguard-traveller-a123"
    assert memory.bank_id_for("B123") == "tripguard-traveller-b123"
    with pytest.raises(ValueError):
        memory.bank_id_for("../../a123")


def test_manager_rejection_is_retained_once_after_approval_is_saved(monkeypatch, tmp_path):
    memory = import_module("app.integrations.travel_memory")
    monkeypatch.setattr(approvals, "APPROVALS_PATH", tmp_path / "approvals.json")
    monkeypatch.setenv("HINDSIGHT_BASE_URL", "https://memory.example")
    calls = []

    class FakeClient:
        def __init__(self, **kwargs):
            assert kwargs["base_url"] == "https://memory.example"

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return None

        def retain(self, **kwargs):
            calls.append(kwargs)
            return type("Ack", (), {"success": True})()

    monkeypatch.setattr(memory, "Hindsight", FakeClient)
    created = approvals.create_approval_request(approvals.ApprovalRequestCreate(
        trip={"traveller_id": "DEMO_01", "destination_city": "Bengaluru",
              "work_location": "Embassy Tech Village"},
        selected_flight={"id": "F1"}, selected_hotel={"name": "Far Hotel"},
        cost_summary={}, compliance={}, explanation="Existing trip result",
    ))["approval"]
    response = approvals.decide_approval_request(created["id"], approvals.ApprovalDecisionRequest(
        decision="rejected", reviewer_name="Demo Manager", note="Morning meeting",
        feedback_reason="hotel_too_far", max_hotel_distance_km=2,
    ))
    assert response["memory_saved"] is True
    assert response["approval"]["status"] == "rejected"
    assert approvals.load_approvals()[0]["memory_saved"] is True
    assert calls[0]["bank_id"] == "tripguard-traveller-demo_01"
    assert calls[0]["document_id"] == "approval-" + created["id"]
    assert calls[0]["retain_async"] is False
    assert calls[0]["metadata"]["destination_city"] == "bengaluru"
    assert "2 km" in calls[0]["content"]
    assert "Embassy Tech Village" in calls[0]["content"]
    with pytest.raises(HTTPException) as duplicate:
        approvals.decide_approval_request(created["id"], approvals.ApprovalDecisionRequest(
            decision="rejected", reviewer_name="Demo Manager", note="again",
            feedback_reason="hotel_too_far", max_hotel_distance_km=2,
        ))
    assert duplicate.value.status_code == 409
    assert len(calls) == 1


def test_negative_retain_acknowledgement_does_not_claim_saved(monkeypatch):
    memory = import_module("app.integrations.travel_memory")
    monkeypatch.setenv("HINDSIGHT_BASE_URL", "https://memory.example")

    class FakeClient:
        def __init__(self, **kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *args): return None
        def retain(self, **kwargs): return type("Ack", (), {"success": False})()

    monkeypatch.setattr(memory, "Hindsight", FakeClient)
    assert memory.retain_hotel_decision(
        "DEMO_01", "Bengaluru", "Embassy Tech Village", "rejected", 2,
        "Morning meeting", "a1",
    ) is False


def test_hotel_distance_reason_requires_valid_threshold():
    with pytest.raises(ValidationError):
        approvals.ApprovalDecisionRequest(
            decision="rejected", reviewer_name="Manager", feedback_reason="hotel_too_far",
        )
    with pytest.raises(ValidationError):
        approvals.ApprovalDecisionRequest(
            decision="rejected", reviewer_name="Manager", feedback_reason="hotel_too_far",
            max_hotel_distance_km=50,
        )


def test_hindsight_failure_preserves_reviewed_decision(monkeypatch, tmp_path):
    memory = import_module("app.integrations.travel_memory")
    monkeypatch.setattr(approvals, "APPROVALS_PATH", tmp_path / "approvals.json")
    monkeypatch.setenv("HINDSIGHT_BASE_URL", "https://memory.example")

    class FailingClient:
        def __init__(self, **kwargs):
            raise ConnectionError("Memory unreachable")

    monkeypatch.setattr(memory, "Hindsight", FailingClient)
    approval = approvals.create_approval_request(approvals.ApprovalRequestCreate(
        trip={"traveller_id": "DEMO_01", "destination_city": "Bengaluru",
              "work_location": "Embassy Tech Village"},
        selected_flight={}, selected_hotel={}, cost_summary={}, compliance={}, explanation="",
    ))["approval"]
    response = approvals.decide_approval_request(approval["id"], approvals.ApprovalDecisionRequest(
        decision="rejected", reviewer_name="Manager", feedback_reason="hotel_too_far",
        max_hotel_distance_km=2,
    ))
    assert response["approval"]["status"] == "rejected"
    assert response["memory_saved"] is False


def _option(hotel_id, distance, total, compliant=True):
    return {
        "flight": {"id": "F1", "flight_number": "AI101", "arrival_time": "09:00"},
        "hotel": {"id": hotel_id, "name": hotel_id,
                  "distance_from_work_location_km": distance},
        "flight_cost": 6000, "hotel_cost": total - 6000,
        "transport_budget": 0, "total_cost": total,
        "budget_remaining": 18000 - total, "is_compliant": compliant,
        "manual_review_required": False, "violation_count": 0 if compliant else 1,
        "violations": [] if compliant else ["Hotel exceeds company price cap"],
        "warnings": [],
    }


def _state(options, memory=None):
    return {
        "evaluated_options": options,
        "requirements": {"origin": "HYD", "destination": "BLR",
                         "destination_city": "Bengaluru", "departure_date": "2026-10-01",
                         "return_date": "2026-10-02", "budget": 18000,
                         "number_of_nights": 1, "traveller_id": "DEMO_01",
                         "work_location": "Embassy Tech Village"},
        "policy": {"policy_coverage": {"requires_manual_review": False}},
        "decision_memory": memory or {"status": "none", "reason": None,
                                      "max_hotel_distance_km": None},
        "trace": [],
    }


def test_recalled_distance_changes_choice_only_among_compliant_hotels():
    options = [_option("Cheap Far", 5, 9000), _option("Nearby", 1.2, 10000)]
    base_result = graph.select_recommendation_node(_state(options))["result"]
    assert base_result["selected_hotel"]["id"] == "Cheap Far"

    memory = {"status": "used", "reason": "Manager rejected a distant hotel",
              "max_hotel_distance_km": 2}
    result = graph.select_recommendation_node(_state(options, memory))["result"]
    assert result["selected_hotel"]["id"] == "Nearby"
    assert "memory" in result["explanation"].lower()
    assert result["decision_memory"]["status"] == "used"
    assert result["selection_reasoning"]["priority_order"][2] == "Remembered hotel distance preference"
    assert result["trip"]["traveller_id"] == "DEMO_01"
    assert result["trip"]["work_location"] == "Embassy Tech Village"

    incompatible = [_option("Cheap Far", 5, 9000), _option("Nearby", 1.2, 10000, False)]
    result = graph.select_recommendation_node(_state(incompatible, memory))["result"]
    assert result["selected_hotel"]["id"] == "Cheap Far"


def test_recall_uses_matching_workplace_and_ignores_other_location(monkeypatch):
    memory = import_module("app.integrations.travel_memory")
    monkeypatch.setenv("HINDSIGHT_BASE_URL", "https://memory.example")

    class FakeClient:
        def __init__(self, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return None

        def recall(self, **kwargs):
            assert kwargs["bank_id"] == "tripguard-traveller-demo_01"
            return type("Response", (), {"results": [
                type("Memory", (), {"text": (
                    "Manager rejected hotel in Bengaluru near Embassy Tech Village; "
                    "prefer hotels within 2 km of Embassy Tech Village"
                ), "chunk_id": None, "metadata": {
                    "destination_city": "bengaluru", "work_location": "embassy tech village",
                    "max_hotel_distance_km": "2", "feedback_reason": "hotel_too_far",
                }})()
            ], "chunks": {}})()

    monkeypatch.setattr(memory, "Hindsight", FakeClient)
    assert memory.recall_hotel_preference(
        "DEMO_01", "Bengaluru", "Embassy Tech Village",
    )["max_hotel_distance_km"] == 2
    assert memory.recall_hotel_preference(
        "DEMO_01", "Bengaluru", "Different Workplace",
    ) is None


def test_overlapping_workplace_and_city_names_cannot_leak_preferences(monkeypatch):
    memory = import_module("app.integrations.travel_memory")
    monkeypatch.setenv("HINDSIGHT_BASE_URL", "https://memory.example")

    class FakeClient:
        def __init__(self, **kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *args): return None
        def recall(self, **kwargs):
            return type("Response", (), {"results": [
                type("Memory", (), {"text": "Bengaluru; Embassy Tech Village Annex; within 2 km",
                    "chunk_id": None, "metadata": {
                        "destination_city": "bengaluru", "work_location": "embassy tech village annex",
                        "max_hotel_distance_km": "2", "feedback_reason": "hotel_too_far",
                    }})(),
            ], "chunks": {}})()

    monkeypatch.setattr(memory, "Hindsight", FakeClient)
    assert memory.recall_hotel_preference("DEMO_01", "Bengaluru", "Embassy Tech Village") is None
    assert memory.recall_hotel_preference("DEMO_01", "Bengaluru Rural", "Embassy Tech Village Annex") is None


def test_uncreated_memory_bank_is_empty_not_unavailable(monkeypatch):
    from hindsight_client_api.exceptions import NotFoundException
    memory = import_module("app.integrations.travel_memory")
    monkeypatch.setenv("HINDSIGHT_BASE_URL", "https://memory.example")

    class FakeClient:
        def __init__(self, **kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *args): return None
        def recall(self, **kwargs): raise NotFoundException(status=404, reason="Missing bank")

    monkeypatch.setattr(memory, "Hindsight", FakeClient)
    assert memory.recall_hotel_preference("NEW_01", "Bengaluru", "Embassy Tech Village") is None


def test_hindsight_recall_outage_warns_and_keeps_normal_selection(monkeypatch):
    def unreachable(*args):
        raise ConnectionError("offline")

    monkeypatch.setattr(graph, "recall_hotel_preference", unreachable, raising=False)
    state = _state([_option("Cheap Far", 5, 9000), _option("Nearby", 1, 10000)])
    update = graph.recall_decision_memory_node(state)
    assert update["decision_memory"]["status"] == "unavailable"
    assert update["trace"][-1]["status"] == "warning"
    state.update(update)
    assert graph.select_recommendation_node(state)["result"]["selected_hotel"]["id"] == "Cheap Far"


def test_stream_and_plan_show_same_recalled_decision(monkeypatch):
    async def offline_weather(**kwargs):
        return {"available": False, "message": "Weather skipped in fixture"}

    monkeypatch.setattr(graph, "fetch_weather_forecast", offline_weather)
    monkeypatch.setattr(graph, "recall_hotel_preference", lambda *args: {
        "max_hotel_distance_km": 2, "reason": "Past manager preferred a nearby hotel",
        "source": "Hindsight manager decision",
    })
    request = {
        "traveller_id": "DEMO_01", "origin": "HYD", "destination": "BLR",
        "destination_city": "Bengaluru", "departure_date": "2026-10-01",
        "return_date": "2026-10-02", "budget": 18000,
        "arrival_before": "10:00", "work_location": "Embassy Tech Village",
        "purpose": "Client meeting",
    }
    client = TestClient(app)
    regular = client.post("/api/plan", json=request)
    streamed = client.post("/api/plan/stream", json=request)
    events = [json.loads(line) for line in streamed.text.splitlines()]
    assert regular.status_code == 200 and streamed.status_code == 200
    assert any(e.get("tool") == "Hindsight Recall" for e in events)
    final = next(e["result"] for e in events if e["type"] == "final")
    assert final["selected_hotel"]["id"] == regular.json()["result"]["selected_hotel"]["id"]
    assert final["decision_memory"]["status"] == "used"


def test_fictional_two_trip_demo_changes_hotel_without_policy_violation(monkeypatch):
    async def offline_weather(**kwargs):
        return {"available": False, "message": "Weather skipped in fixture"}

    monkeypatch.setattr(graph, "fetch_weather_forecast", offline_weather)
    monkeypatch.setattr(graph, "recall_hotel_preference", lambda *args: None)
    request = {
        "traveller_id": "DEMO_01", "origin": "HYD", "destination": "BLR",
        "destination_city": "Bengaluru", "departure_date": "2026-10-01",
        "return_date": "2026-10-02", "budget": 18000,
        "arrival_before": "10:00", "work_location": "Embassy Tech Village",
        "purpose": "Morning client meeting",
    }
    client = TestClient(app)
    before = client.post("/api/plan", json=request).json()["result"]
    assert before["selected_hotel"]["id"] == "HT-204"
    assert before["compliance"]["is_compliant"] is True
    monkeypatch.setattr(graph, "recall_hotel_preference", lambda *args: {
        "max_hotel_distance_km": 2, "reason": "Manager preferred hotels within 2 km",
        "source": "Hindsight manager decision",
    })
    after = client.post("/api/plan", json=request).json()["result"]
    assert after["selected_hotel"]["id"] == "HT-201"
    assert after["compliance"]["is_compliant"] is True
    assert after["decision_memory"]["status"] == "used"
