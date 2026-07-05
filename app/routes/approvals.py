from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.routes.trips import (
    attach_approval_to_trip,
)


router = APIRouter(
    prefix="/api/approvals",
    tags=["Approvals"],
)


DATA_DIR = (
    Path(__file__).resolve().parents[2]
    / "data"
)

APPROVALS_PATH = (
    DATA_DIR / "approvals.json"
)

_STORAGE_LOCK = Lock()


class ApprovalRequestCreate(
    BaseModel,
):
    trip: dict[str, Any]

    selected_flight: dict[
        str,
        Any,
    ]

    selected_hotel: dict[
        str,
        Any,
    ]

    cost_summary: dict[
        str,
        Any,
    ]

    compliance: dict[
        str,
        Any,
    ]

    explanation: str

    trip_run_id: str | None = Field(
        default=None,
        max_length=120,
    )


class ApprovalDecisionRequest(
    BaseModel,
):
    decision: Literal[
        "approved",
        "rejected",
    ]

    reviewer_name: str = Field(
        min_length=2,
        max_length=100,
    )

    note: str | None = Field(
        default=None,
        max_length=1000,
    )


def utc_now() -> str:
    return datetime.now(
        timezone.utc
    ).isoformat()


def load_approvals_unlocked(
) -> list[dict[str, Any]]:
    if not APPROVALS_PATH.exists():
        return []

    try:
        with APPROVALS_PATH.open(
            "r",
            encoding="utf-8",
        ) as file:
            stored_value = json.load(
                file
            )

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
        if isinstance(
            item,
            dict,
        )
    ]


def load_approvals(
) -> list[dict[str, Any]]:
    with _STORAGE_LOCK:
        return (
            load_approvals_unlocked()
        )


def save_approvals_unlocked(
    approvals: list[
        dict[str, Any]
    ],
) -> None:
    APPROVALS_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    temporary_path = (
        APPROVALS_PATH.with_suffix(
            ".json.tmp"
        )
    )

    with temporary_path.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            approvals,
            file,
            ensure_ascii=False,
            indent=2,
        )

    temporary_path.replace(
        APPROVALS_PATH
    )


def find_approval_index(
    approvals: list[
        dict[str, Any]
    ],
    approval_id: str,
) -> int | None:
    return next(
        (
            index
            for index, approval
            in enumerate(approvals)
            if approval.get("id")
            == approval_id
        ),
        None,
    )


@router.get("")
def list_approval_requests(
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
    ),
    status: Literal[
        "pending",
        "approved",
        "rejected",
    ]
    | None = None,
):
    approvals = load_approvals()

    if status:
        approvals = [
            approval
            for approval in approvals
            if approval.get(
                "status"
            )
            == status
        ]

    approvals.sort(
        key=lambda item: (
            item.get(
                "created_at",
                "",
            )
        ),
        reverse=True,
    )

    selected_approvals = (
        approvals[:limit]
    )

    return {
        "success": True,
        "count": len(
            selected_approvals
        ),
        "approvals": (
            selected_approvals
        ),
    }


@router.post("")
def create_approval_request(
    request: ApprovalRequestCreate,
):
    created_at = utc_now()

    trip_run_id = (
        request.trip_run_id.strip()
        if request.trip_run_id
        else None
    )

    approval = {
        "id": (
            "APR-"
            + uuid4()
            .hex[:10]
            .upper()
        ),
        "trip_run_id": (
            trip_run_id
        ),
        "status": "pending",
        "created_at": created_at,
        "updated_at": created_at,
        "reviewer_name": None,
        "review_note": None,
        "decision_at": None,
        "trip": request.trip,
        "selected_flight": (
            request.selected_flight
        ),
        "selected_hotel": (
            request.selected_hotel
        ),
        "cost_summary": (
            request.cost_summary
        ),
        "compliance": (
            request.compliance
        ),
        "explanation": (
            request.explanation
        ),
    }

    with _STORAGE_LOCK:
        approvals = (
            load_approvals_unlocked()
        )

        approvals.append(
            approval
        )

        approvals.sort(
            key=lambda item: (
                item.get(
                    "created_at",
                    "",
                )
            ),
            reverse=True,
        )

        save_approvals_unlocked(
            approvals
        )

    return {
        "success": True,
        "message": (
            "Approval request created."
        ),
        "approval": approval,
    }


@router.get("/{approval_id}")
def get_approval_request(
    approval_id: str,
):
    approvals = load_approvals()

    approval = next(
        (
            item
            for item in approvals
            if item.get("id")
            == approval_id
        ),
        None,
    )

    if approval is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Approval request "
                "was not found."
            ),
        )

    return {
        "success": True,
        "approval": approval,
    }


@router.patch(
    "/{approval_id}/decision"
)
def decide_approval_request(
    approval_id: str,
    request: ApprovalDecisionRequest,
):
    with _STORAGE_LOCK:
        approvals = (
            load_approvals_unlocked()
        )

        approval_index = (
            find_approval_index(
                approvals,
                approval_id,
            )
        )

        if approval_index is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Approval request "
                    "was not found."
                ),
            )

        approval = approvals[
            approval_index
        ]

        if (
            approval.get("status")
            != "pending"
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "This approval request "
                    "has already been reviewed."
                ),
            )

        decision_time = utc_now()

        approval["status"] = (
            request.decision
        )

        approval["reviewer_name"] = (
            request
            .reviewer_name
            .strip()
        )

        approval["review_note"] = (
            request.note.strip()
            if request.note
            and request.note.strip()
            else None
        )

        approval["decision_at"] = (
            decision_time
        )

        approval["updated_at"] = (
            decision_time
        )

        approvals[
            approval_index
        ] = approval

        save_approvals_unlocked(
            approvals
        )

    trip_run_id = approval.get(
        "trip_run_id"
    )

    trip_linked = False

    if trip_run_id:
        updated_trip = (
            attach_approval_to_trip(
                trip_run_id,
                approval,
            )
        )

        trip_linked = (
            updated_trip is not None
        )

    return {
        "success": True,
        "message": (
            "Travel request approved."
            if request.decision
            == "approved"
            else (
                "Travel request rejected."
            )
        ),
        "approval": approval,
        "trip_linked": (
            trip_linked
        ),
    }