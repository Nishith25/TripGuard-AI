from fastapi.testclient import TestClient

from app.main import app
from app.routes import health


client = TestClient(app)


def test_health_endpoint_when_dependencies_are_healthy(
    monkeypatch,
):
    monkeypatch.setattr(
        health,
        "check_supabase_health",
        lambda: {
            "status": "healthy",
            "backend": "supabase",
        },
    )

    monkeypatch.setattr(
        health,
        "check_hindsight_health",
        lambda: {
            "status": "healthy",
        },
    )

    response = client.get(
        "/api/health"
    )

    assert response.status_code == 200

    payload = response.json()

    assert payload["status"] == "healthy"

    assert (
        payload["services"]
        ["supabase"]
        ["status"]
        == "healthy"
    )

    assert (
        payload["services"]
        ["hindsight"]
        ["status"]
        == "healthy"
    )


def test_health_endpoint_reports_degraded_dependency(
    monkeypatch,
):
    monkeypatch.setattr(
        health,
        "check_supabase_health",
        lambda: {
            "status": "healthy",
            "backend": "supabase",
        },
    )

    monkeypatch.setattr(
        health,
        "check_hindsight_health",
        lambda: {
            "status": "unavailable",
            "error": "ConnectionError",
        },
    )

    response = client.get(
        "/api/health"
    )

    assert response.status_code == 503

    payload = response.json()

    assert payload["status"] == "degraded"

    assert (
        payload["services"]
        ["api"]
        ["status"]
        == "healthy"
    )

    assert (
        payload["services"]
        ["hindsight"]
        ["status"]
        == "unavailable"
    )
