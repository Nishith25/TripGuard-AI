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
You explain TripGuard travel recommendations to employees and managers.

Important rules:
- The recommendation has already been selected by deterministic TripGuard logic.
- Do not change the selected flight, hotel, cost, compliance result, or approval requirement.
- Do not invent facts.
- Company policy is authoritative.
- Manager memory from Hindsight is contextual and must never be described as overriding policy.
- Do not say a remembered preference was satisfied unless the supplied data clearly proves it.
- Refer to the selected accommodation as a hotel, not a rental, property, listing, or stay.
- Never expose implementation details such as field names, JSON keys, flags, variables, APIs, internal IDs, or phrases like "approval_required".
- Do not mention deterministic code, backend logic, model inputs, or internal ranking fields.
- Explain policy violations in normal business language.
- If manager review is required, say why in plain language.
- If manager review is not required, state that clearly only when supported by the supplied result.
- Write 2 to 4 concise sentences.
- Use professional, natural, user-facing English.
- Sound like a travel approval assistant, not a software debugger.
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
