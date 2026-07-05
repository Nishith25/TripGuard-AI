from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field


router = APIRouter(
    prefix="/api/trips",
    tags=["Trips"],
)


DATA_DIR = Path(__file__).resolve().parents[2] / "data"
TRIP_RUNS_PATH = DATA_DIR / "trip_runs.json"

_STORAGE_LOCK = Lock()


ApprovalStatus = Literal[
    "pending",
    "approved",
    "rejected",
    "not_required",
]


class TripRunCreate(BaseModel):
    id: str | None = Field(
        default=None,
        max_length=100,
    )

    created_at: str | None = None

    request: dict[str, Any]
    result: dict[str, Any]

    trace: list[dict[str, Any]] = Field(
        default_factory=list,
    )

    approval_status: ApprovalStatus = "pending"

    approval: dict[str, Any] | None = None

    source: str = Field(
        default="web_app",
        max_length=100,
    )


class TripApprovalUpdate(BaseModel):
    approval_status: Literal[
        "approved",
        "rejected",
    ]

    approval: dict[str, Any]


def utc_now() -> str:
    return datetime.now(
        timezone.utc
    ).isoformat()


def load_trip_runs_unlocked() -> list[dict[str, Any]]:
    if not TRIP_RUNS_PATH.exists():
        return []

    try:
        with TRIP_RUNS_PATH.open(
            "r",
            encoding="utf-8",
        ) as file:
            stored_value = json.load(file)
    except (
        json.JSONDecodeError,
        OSError,
    ):
        return []

    if not isinstance(
        stored_value,
        list,
    ):
        return []

    return [
        item
        for item in stored_value
        if isinstance(item, dict)
    ]


def load_trip_runs() -> list[dict[str, Any]]:
    with _STORAGE_LOCK:
        return load_trip_runs_unlocked()


def save_trip_runs_unlocked(
    trip_runs: list[dict[str, Any]],
) -> None:
    TRIP_RUNS_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    temporary_path = (
        TRIP_RUNS_PATH.with_suffix(
            ".json.tmp"
        )
    )

    with temporary_path.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            trip_runs,
            file,
            ensure_ascii=False,
            indent=2,
        )

    temporary_path.replace(
        TRIP_RUNS_PATH
    )


def build_trip_run_id() -> str:
    return (
        f"RUN-"
        f"{uuid4().hex[:12].upper()}"
    )


def normalise_trip_run_id(
    supplied_id: str | None,
) -> str:
    if not supplied_id:
        return build_trip_run_id()

    cleaned_id = supplied_id.strip()

    if not cleaned_id:
        return build_trip_run_id()

    return cleaned_id[:100]


def find_trip_run_index(
    trip_runs: list[dict[str, Any]],
    trip_run_id: str,
) -> int | None:
    return next(
        (
            index
            for index, trip_run
            in enumerate(trip_runs)
            if trip_run.get("id")
            == trip_run_id
        ),
        None,
    )


def attach_approval_to_trip(
    trip_run_id: str,
    approval: dict[str, Any],
) -> dict[str, Any] | None:
    """
    Attach an approval decision to a persisted trip run.

    This function can also be used by the approval route.
    """
    with _STORAGE_LOCK:
        trip_runs = (
            load_trip_runs_unlocked()
        )

        run_index = find_trip_run_index(
            trip_runs,
            trip_run_id,
        )

        if run_index is None:
            return None

        trip_run = trip_runs[run_index]

        trip_run["approval"] = approval
        trip_run["approval_status"] = (
            approval.get("status")
            or "pending"
        )
        trip_run["updated_at"] = utc_now()

        trip_runs[run_index] = trip_run

        save_trip_runs_unlocked(
            trip_runs
        )

        return trip_run


@router.post("")
def create_trip_run(
    request: TripRunCreate,
):
    trip_run_id = (
        normalise_trip_run_id(
            request.id
        )
    )

    created_at = (
        request.created_at
        or utc_now()
    )

    trip_run = {
        "id": trip_run_id,
        "created_at": created_at,
        "updated_at": utc_now(),
        "request": request.request,
        "result": request.result,
        "trace": request.trace,
        "approval_status": (
            request.approval_status
        ),
        "approval": request.approval,
        "source": request.source,
    }

    with _STORAGE_LOCK:
        trip_runs = (
            load_trip_runs_unlocked()
        )

        existing_index = (
            find_trip_run_index(
                trip_runs,
                trip_run_id,
            )
        )

        if existing_index is None:
            trip_runs.append(trip_run)
        else:
            existing_trip = (
                trip_runs[
                    existing_index
                ]
            )

            trip_run["created_at"] = (
                existing_trip.get(
                    "created_at"
                )
                or created_at
            )

            if (
                existing_trip.get(
                    "approval"
                )
                and not trip_run.get(
                    "approval"
                )
            ):
                trip_run["approval"] = (
                    existing_trip[
                        "approval"
                    ]
                )

                trip_run[
                    "approval_status"
                ] = existing_trip.get(
                    "approval_status",
                    trip_run[
                        "approval_status"
                    ],
                )

            trip_runs[
                existing_index
            ] = trip_run

        trip_runs.sort(
            key=lambda item: (
                item.get(
                    "created_at",
                    "",
                )
            ),
            reverse=True,
        )

        save_trip_runs_unlocked(
            trip_runs
        )

    return {
        "success": True,
        "message": (
            "Trip run persisted."
        ),
        "trip": trip_run,
    }


@router.get("")
def list_trip_runs(
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
    ),
    approval_status: ApprovalStatus | None = None,
):
    trip_runs = load_trip_runs()

    if approval_status:
        trip_runs = [
            trip_run
            for trip_run in trip_runs
            if trip_run.get(
                "approval_status"
            )
            == approval_status
        ]

    trip_runs.sort(
        key=lambda item: (
            item.get(
                "created_at",
                "",
            )
        ),
        reverse=True,
    )

    selected_runs = (
        trip_runs[:limit]
    )

    return {
        "success": True,
        "count": len(
            selected_runs
        ),
        "trips": selected_runs,
    }


@router.get("/{trip_run_id}")
def get_trip_run(
    trip_run_id: str,
):
    trip_runs = load_trip_runs()

    trip_run = next(
        (
            item
            for item in trip_runs
            if item.get("id")
            == trip_run_id
        ),
        None,
    )

    if trip_run is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Trip run was not found."
            ),
        )

    return {
        "success": True,
        "trip": trip_run,
    }


@router.patch(
    "/{trip_run_id}/approval"
)
def update_trip_approval(
    trip_run_id: str,
    request: TripApprovalUpdate,
):
    approval = {
        **request.approval,
        "status": (
            request.approval_status
        ),
    }

    updated_trip = (
        attach_approval_to_trip(
            trip_run_id,
            approval,
        )
    )

    if updated_trip is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Trip run was not found."
            ),
        )

    return {
        "success": True,
        "message": (
            "Trip approval status updated."
        ),
        "trip": updated_trip,
    }