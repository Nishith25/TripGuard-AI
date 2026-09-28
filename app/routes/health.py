from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.integrations.supabase_store import (
    check_supabase_health,
)
from app.integrations.travel_memory import (
    check_hindsight_health,
)


router = APIRouter(
    prefix="/api",
    tags=["Health"],
)


@router.get("/health")
def health_check():
    supabase = (
        check_supabase_health()
    )

    hindsight = (
        check_hindsight_health()
    )

    services = {
        "api": {
            "status": "healthy",
        },
        "supabase": supabase,
        "hindsight": hindsight,
    }

    dependencies_healthy = (
        supabase.get("status")
        == "healthy"
        and hindsight.get("status")
        == "healthy"
    )

    payload = {
        "status": (
            "healthy"
            if dependencies_healthy
            else "degraded"
        ),
        "services": services,
    }

    return JSONResponse(
        status_code=(
            200
            if dependencies_healthy
            else 503
        ),
        content=payload,
    )
