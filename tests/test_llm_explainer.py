from app.integrations import (
    llm_explainer,
)


def sample_result():
    return {
        "trip": {
            "origin": "HYD",
            "destination": "BLR",
        },
        "selected_flight": {
            "flight_number": "AI101",
        },
        "selected_hotel": {
            "name": "Nearby Hotel",
        },
        "cost_summary": {
            "total_cost": 12000,
            "traveller_budget": 18000,
        },
        "compliance": {
            "is_compliant": True,
            "approval_required": False,
        },
        "decision_memory": {
            "status": "none",
        },
        "approval_request": {
            "prepared": False,
        },
        "selection_reasoning": {},
        "weather": {},
    }


def test_llm_falls_back_without_api_key(
    monkeypatch,
):
    monkeypatch.delenv(
        "GROQ_API_KEY",
        raising=False,
    )

    explanation, generated = (
        llm_explainer
        .generate_trip_explanation(
            sample_result(),
            "Deterministic explanation.",
        )
    )

    assert generated is False
    assert (
        explanation
        == "Deterministic explanation."
    )


def test_llm_uses_generated_explanation(
    monkeypatch,
):
    monkeypatch.setenv(
        "GROQ_API_KEY",
        "test-key",
    )

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [
                    {
                        "message": {
                            "content":
                                "The selected trip is "
                                "policy compliant."
                        }
                    }
                ]
            }

    monkeypatch.setattr(
        llm_explainer.httpx,
        "post",
        lambda *args, **kwargs:
            FakeResponse(),
    )

    explanation, generated = (
        llm_explainer
        .generate_trip_explanation(
            sample_result(),
            "Fallback.",
        )
    )

    assert generated is True
    assert (
        explanation
        == "The selected trip is policy compliant."
    )


def test_llm_failure_keeps_deterministic_result(
    monkeypatch,
):
    monkeypatch.setenv(
        "GROQ_API_KEY",
        "test-key",
    )

    def fail(*args, **kwargs):
        raise ConnectionError(
            "Groq unavailable"
        )

    monkeypatch.setattr(
        llm_explainer.httpx,
        "post",
        fail,
    )

    explanation, generated = (
        llm_explainer
        .generate_trip_explanation(
            sample_result(),
            "Original safe explanation.",
        )
    )

    assert generated is False
    assert (
        explanation
        == "Original safe explanation."
    )
