from __future__ import annotations

import json
import logging
import os
import time
from datetime import datetime
from typing import Any, Iterator, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import (
    BaseModel,
    Field,
    field_validator,
    model_validator,
)

from app.graph import tripguard_graph
from app.routes.approvals import (
    router as approvals_router,
)
from app.routes.policy import (
    router as policy_router,
)
from app.routes.trips import (
    router as trips_router,
)


logger = logging.getLogger(
    "tripguard",
)


LOCAL_FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


def get_allowed_origins() -> list[str]:
    """
    Read additional frontend origins from the ALLOWED_ORIGINS
    environment variable.

    Example:
    ALLOWED_ORIGINS=https://tripguard.vercel.app
    """
    raw_origins = os.getenv(
        "ALLOWED_ORIGINS",
        "",
    )

    configured_origins = [
        origin.strip().rstrip("/")
        for origin in raw_origins.split(",")
        if origin.strip()
    ]

    return list(
        dict.fromkeys(
            [
                *LOCAL_FRONTEND_ORIGINS,
                *configured_origins,
            ]
        )
    )


def get_stream_step_delay() -> float:
    """
    Control how long each workflow event remains visible before
    the next streamed event is sent.
    """
    raw_delay = os.getenv(
        "STREAM_STEP_DELAY_SECONDS",
        "0.35",
    )

    try:
        parsed_delay = float(
            raw_delay
        )
    except ValueError:
        return 0.35

    return max(
        parsed_delay,
        0.0,
    )


app = FastAPI(
    title="TripGuard AI",
    description=(
        "A corporate travel policy, exception, recommendation "
        "and human-approval agent."
    ),
    version="1.2.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    policy_router
)

app.include_router(
    approvals_router
)

app.include_router(
    trips_router
)


class TravelRequest(BaseModel):
    origin: str = Field(
        min_length=3,
        max_length=3,
        examples=["HYD"],
    )

    destination: str = Field(
        min_length=3,
        max_length=3,
        examples=["BLR"],
    )

    destination_city: str = Field(
        min_length=2,
        examples=["Bengaluru"],
    )

    departure_date: str = Field(
        examples=["2026-07-08"],
    )

    return_date: str = Field(
        examples=["2026-07-10"],
    )

    budget: float = Field(
        gt=0,
        examples=[18000],
    )

    arrival_before: Optional[str] = Field(
        default=None,
        examples=["10:00"],
    )

    work_location: Optional[str] = Field(
        default=None,
        examples=[
            "Embassy Tech Village"
        ],
    )

    purpose: Optional[str] = Field(
        default=None,
        examples=[
            "Important client meeting"
        ],
    )

    @field_validator(
        "origin",
        "destination",
    )
    @classmethod
    def validate_airport_code(
        cls,
        value: str,
    ) -> str:
        cleaned_value = (
            value.strip().upper()
        )

        if not cleaned_value.isalpha():
            raise ValueError(
                "Airport codes must contain only letters."
            )

        return cleaned_value

    @field_validator(
        "arrival_before"
    )
    @classmethod
    def validate_arrival_time(
        cls,
        value: Optional[str],
    ) -> Optional[str]:
        if (
            value is None
            or value.strip() == ""
        ):
            return None

        cleaned_value = value.strip()
        parts = cleaned_value.split(
            ":"
        )

        if len(parts) != 2:
            raise ValueError(
                "arrival_before must use HH:MM format."
            )

        try:
            hour = int(parts[0])
            minute = int(parts[1])
        except ValueError as exc:
            raise ValueError(
                "arrival_before must use HH:MM format."
            ) from exc

        if (
            not 0 <= hour <= 23
            or not 0 <= minute <= 59
        ):
            raise ValueError(
                "Invalid arrival time."
            )

        return (
            f"{hour:02d}:"
            f"{minute:02d}"
        )

    @field_validator(
        "departure_date",
        "return_date",
    )
    @classmethod
    def validate_date_format(
        cls,
        value: str,
    ) -> str:
        try:
            parsed_date = (
                datetime.strptime(
                    value,
                    "%Y-%m-%d",
                )
            )
        except ValueError as exc:
            raise ValueError(
                "Dates must use YYYY-MM-DD format."
            ) from exc

        return parsed_date.strftime(
            "%Y-%m-%d"
        )

    @model_validator(
        mode="after"
    )
    def validate_request(
        self,
    ):
        departure = (
            datetime.strptime(
                self.departure_date,
                "%Y-%m-%d",
            ).date()
        )

        return_date = (
            datetime.strptime(
                self.return_date,
                "%Y-%m-%d",
            ).date()
        )

        if return_date < departure:
            raise ValueError(
                "Return date cannot be before departure date."
            )

        if (
            self.origin
            == self.destination
        ):
            raise ValueError(
                "Origin and destination cannot be the same."
            )

        return self


def encode_stream_event(
    payload: dict[str, Any],
) -> str:
    """
    Convert an event into newline-delimited JSON.
    """
    return (
        json.dumps(
            payload,
            ensure_ascii=False,
            default=str,
        )
        + "\n"
    )


def generate_trip_stream(
    request_data: dict[str, Any],
) -> Iterator[str]:
    """
    Execute the LangGraph workflow and stream every completed
    workflow stage to the frontend.
    """
    stream_step_delay_seconds = (
        get_stream_step_delay()
    )

    previous_trace_count = 0

    final_result: dict[
        str,
        Any,
    ] = {}

    try:
        yield encode_stream_event(
            {
                "type": "started",
                "message": (
                    "TripGuard AI started "
                    "analysing the request."
                ),
            }
        )

        graph_input = {
            "request": request_data,
            "trace": [],
        }

        for graph_update in (
            tripguard_graph.stream(
                graph_input,
                stream_mode="updates",
            )
        ):
            if not isinstance(
                graph_update,
                dict,
            ):
                continue

            for (
                node_name,
                node_update,
            ) in graph_update.items():
                if not isinstance(
                    node_update,
                    dict,
                ):
                    continue

                trace = node_update.get(
                    "trace",
                    [],
                )

                if (
                    len(trace)
                    > previous_trace_count
                ):
                    new_trace_items = (
                        trace[
                            previous_trace_count:
                        ]
                    )

                    for (
                        trace_item
                    ) in new_trace_items:
                        yield encode_stream_event(
                            {
                                "type": "step",
                                "node": node_name,
                                "tool": trace_item.get(
                                    "tool",
                                    node_name,
                                ),
                                "message": trace_item.get(
                                    "message",
                                    (
                                        "Agent step "
                                        "completed."
                                    ),
                                ),
                                "status": trace_item.get(
                                    "status",
                                    "completed",
                                ),
                            }
                        )

                        if (
                            stream_step_delay_seconds
                            > 0
                        ):
                            time.sleep(
                                stream_step_delay_seconds
                            )

                    previous_trace_count = (
                        len(trace)
                    )

                if (
                    "result"
                    in node_update
                ):
                    final_result = (
                        node_update[
                            "result"
                        ]
                    )

        if not final_result:
            yield encode_stream_event(
                {
                    "type": "error",
                    "message": (
                        "The workflow completed "
                        "without producing a "
                        "recommendation."
                    ),
                }
            )

            return

        yield encode_stream_event(
            {
                "type": "final",
                "result": final_result,
            }
        )

        yield encode_stream_event(
            {
                "type": "complete",
                "message": (
                    "Travel recommendation "
                    "completed."
                ),
            }
        )

    except Exception as exc:
        logger.exception(
            "TripGuard streaming workflow failed."
        )

        yield encode_stream_event(
            {
                "type": "error",
                "message": (
                    "TripGuard agent failed: "
                    f"{exc}"
                ),
            }
        )


@app.get("/")
def root():
    return {
        "application": (
            "TripGuard AI"
        ),
        "status": "running",
        "message": (
            "Corporate travel decision "
            "agent is ready."
        ),
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": (
            "TripGuard AI"
        ),
        "version": "1.2.0",
    }


@app.post("/api/plan")
def create_travel_plan(
    request: TravelRequest,
):
    """
    Standard non-streaming endpoint.
    """
    try:
        final_state = (
            tripguard_graph.invoke(
                {
                    "request": (
                        request.model_dump()
                    ),
                    "trace": [],
                }
            )
        )

        return {
            "success": True,
            "agent_trace": (
                final_state.get(
                    "trace",
                    [],
                )
            ),
            "result": (
                final_state.get(
                    "result",
                    {},
                )
            ),
        }

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        logger.exception(
            "TripGuard workflow failed."
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "TripGuard agent failed: "
                f"{exc}"
            ),
        ) from exc


@app.post("/api/plan/stream")
def stream_travel_plan(
    request: TravelRequest,
):
    """
    Streaming endpoint consumed by the React application.
    """
    return StreamingResponse(
        generate_trip_stream(
            request.model_dump()
        ),
        media_type=(
            "application/x-ndjson"
        ),
        headers={
            "Cache-Control": (
                "no-cache, no-transform"
            ),
            "X-Accel-Buffering": "no",
        },
    )