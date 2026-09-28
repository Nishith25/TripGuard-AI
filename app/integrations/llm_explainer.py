from __future__ import annotations

import json
import os
from typing import Any

import httpx


GROQ_API_URL = (
    "https://api.groq.com/openai/v1/chat/completions"
)

DEFAULT_MODEL = (
    "openai/gpt-oss-120b"
)


def groq_configured() -> bool:
    return bool(
        os.getenv(
            "GROQ_API_KEY",
            "",
        ).strip()
    )


def generate_trip_explanation(
    result: dict[str, Any],
    fallback: str,
) -> tuple[str, bool]:
    """
    Generate a concise natural-language explanation.

    The LLM does not make the policy or ranking decision.
    It only explains the result already computed by TripGuard.
    """

    api_key = os.getenv(
        "GROQ_API_KEY",
        "",
    ).strip()

    if not api_key:
        return fallback, False

    model = (
        os.getenv(
            "GROQ_MODEL",
            DEFAULT_MODEL,
        ).strip()
        or DEFAULT_MODEL
    )

    payload = {
        "trip":
            result.get(
                "trip",
                {},
            ),
        "selected_flight":
            result.get(
                "selected_flight",
                {},
            ),
        "selected_hotel":
            result.get(
                "selected_hotel",
                {},
            ),
        "cost_summary":
            result.get(
                "cost_summary",
                {},
            ),
        "compliance":
            result.get(
                "compliance",
                {},
            ),
        "decision_memory":
            result.get(
                "decision_memory",
                {},
            ),
        "approval_request":
            result.get(
                "approval_request",
                {},
            ),
        "selection_reasoning":
            result.get(
                "selection_reasoning",
                {},
            ),
        "weather":
            result.get(
                "weather",
                {},
            ),
    }

    system_prompt = """
You explain corporate travel recommendations for TripGuard.

Important rules:
- The travel option has already been selected by deterministic code.
- Do not change the selected flight, hotel, cost, compliance result, or approval requirement.
- Do not invent facts.
- Do not claim a Hindsight preference was satisfied unless the supplied data proves it.
- Company policy is authoritative.
- Manager memory is only contextual.
- Write 2 to 4 concise sentences.
- Explain why this recommendation was selected and whether manager review is required.
- Use professional, plain English.
""".strip()

    try:
        response = httpx.post(
            GROQ_API_URL,
            headers={
                "Authorization":
                    f"Bearer {api_key}",
                "Content-Type":
                    "application/json",
            },
            json={
                "model": model,
                "reasoning_effort": "low",
                "temperature": 0.2,
                "max_completion_tokens": 220,
                "messages": [
                    {
                        "role": "system",
                        "content":
                            system_prompt,
                    },
                    {
                        "role": "user",
                        "content": (
                            "Explain this already-computed "
                            "TripGuard recommendation:\n"
                            + json.dumps(
                                payload,
                                ensure_ascii=False,
                            )
                        ),
                    },
                ],
            },
            timeout=15.0,
        )

        response.raise_for_status()

        body = response.json()

        explanation = (
            body
            .get(
                "choices",
                [{}],
            )[0]
            .get(
                "message",
                {},
            )
            .get(
                "content",
                "",
            )
            .strip()
        )

        if not explanation:
            return fallback, False

        return explanation, True

    except Exception as exc:
        print(
            "Groq explanation failed:",
            repr(exc),
            flush=True,
        )

        return fallback, False
