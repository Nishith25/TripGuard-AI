import json
import time
from datetime import datetime
from typing import Any, Iterator, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator, model_validator

from app.graph import tripguard_graph
from app.routes.policy import router as policy_router
from app.routes.approvals import router as approvals_router
from app.routes.trips import router as trips_router


app = FastAPI(
    title="TripGuard AI",
    description=(
        "An autonomous corporate travel policy, exception "
        "and recommendation agent."
    ),
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(policy_router)
app.include_router(approvals_router)
app.include_router(trips_router)

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
        examples=["Embassy Tech Village"],
    )
    purpose: Optional[str] = Field(
        default=None,
        examples=["Important client meeting"],
    )

    @field_validator("origin", "destination")
    @classmethod
    def validate_airport_code(cls, value: str) -> str:
        cleaned_value = value.strip().upper()

        if not cleaned_value.isalpha():
            raise ValueError(
                "Airport codes must contain only letters."
            )

        return cleaned_value

    @field_validator("arrival_before")
    @classmethod
    def validate_arrival_time(
        cls,
        value: Optional[str],
    ) -> Optional[str]:
        if value is None or value.strip() == "":
            return None

        cleaned_value = value.strip()
        parts = cleaned_value.split(":")

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

        if not 0 <= hour <= 23 or not 0 <= minute <= 59:
            raise ValueError("Invalid arrival time.")

        return f"{hour:02d}:{minute:02d}"

    @field_validator("departure_date", "return_date")
    @classmethod
    def validate_date_format(cls, value: str) -> str:
        try:
            parsed_date = datetime.strptime(
                value,
                "%Y-%m-%d",
            )
        except ValueError as exc:
            raise ValueError(
                "Dates must use YYYY-MM-DD format."
            ) from exc

        return parsed_date.strftime("%Y-%m-%d")

    @model_validator(mode="after")
    def validate_trip_dates(self):
        departure = datetime.strptime(
            self.departure_date,
            "%Y-%m-%d",
        ).date()

        return_date = datetime.strptime(
            self.return_date,
            "%Y-%m-%d",
        ).date()

        if return_date < departure:
            raise ValueError(
                "Return date cannot be before departure date."
            )

        return self


def encode_stream_event(payload: dict[str, Any]) -> str:
    """
    Convert an event into newline-delimited JSON.
    """
    return json.dumps(
        payload,
        ensure_ascii=False,
        default=str,
    ) + "\n"


def generate_trip_stream(
    request_data: dict[str, Any],
) -> Iterator[str]:
    """
    Execute the LangGraph workflow and stream the result of each
    completed node to the frontend.

    The small delay is only for making the execution steps clearly
    visible in the internship demonstration.
    """
    demo_step_delay_seconds = 0.55
    previous_trace_count = 0
    final_result: dict[str, Any] = {}

    try:
        yield encode_stream_event(
            {
                "type": "started",
                "message": "TripGuard AI started analysing the request.",
            }
        )

        graph_input = {
            "request": request_data,
            "trace": [],
        }

        for graph_update in tripguard_graph.stream(
            graph_input,
            stream_mode="updates",
        ):
            if not isinstance(graph_update, dict):
                continue

            for node_name, node_update in graph_update.items():
                if not isinstance(node_update, dict):
                    continue

                trace = node_update.get("trace", [])

                if len(trace) > previous_trace_count:
                    new_trace_items = trace[previous_trace_count:]

                    for trace_item in new_trace_items:
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
                                    "Agent step completed.",
                                ),
                                "status": trace_item.get(
                                    "status",
                                    "completed",
                                ),
                            }
                        )

                        time.sleep(demo_step_delay_seconds)

                    previous_trace_count = len(trace)

                if "result" in node_update:
                    final_result = node_update["result"]

        if not final_result:
            yield encode_stream_event(
                {
                    "type": "error",
                    "message": (
                        "The workflow completed without producing "
                        "a recommendation."
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
                "message": "Travel recommendation completed.",
            }
        )

    except Exception as exc:
        yield encode_stream_event(
            {
                "type": "error",
                "message": f"TripGuard agent failed: {exc}",
            }
        )


@app.get("/")
def root():
    return {
        "application": "TripGuard AI",
        "status": "running",
        "message": "Corporate travel decision agent is ready.",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }


@app.post("/api/plan")
def create_travel_plan(request: TravelRequest):
    """
    Standard non-streaming endpoint.
    """
    try:
        final_state = tripguard_graph.invoke(
            {
                "request": request.model_dump(),
                "trace": [],
            }
        )

        return {
            "success": True,
            "agent_trace": final_state.get("trace", []),
            "result": final_state.get("result", {}),
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
        raise HTTPException(
            status_code=500,
            detail=f"TripGuard agent failed: {exc}",
        ) from exc


@app.post("/api/plan/stream")
def stream_travel_plan(request: TravelRequest):
    """
    Streaming endpoint consumed by the React dashboard.
    """
    return StreamingResponse(
        generate_trip_stream(request.model_dump()),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )