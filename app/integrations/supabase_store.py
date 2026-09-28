from __future__ import annotations

import os
from typing import Any

from supabase import Client, create_client


def storage_backend() -> str:
    return (
        os.getenv(
            "TRIPGUARD_STORAGE_BACKEND",
            "json",
        )
        .strip()
        .lower()
    )


def supabase_configured() -> bool:
    return bool(
        os.getenv(
            "SUPABASE_URL",
            "",
        ).strip()
        and os.getenv(
            "SUPABASE_SERVICE_ROLE_KEY",
            "",
        ).strip()
    )


def use_supabase() -> bool:
    return (
        storage_backend()
        == "supabase"
        and supabase_configured()
    )


def get_supabase() -> Client:
    url = os.getenv(
        "SUPABASE_URL",
        "",
    ).strip()

    key = os.getenv(
        "SUPABASE_SERVICE_ROLE_KEY",
        "",
    ).strip()

    if not url or not key:
        raise RuntimeError(
            "Supabase persistence is not configured."
        )

    return create_client(
        url,
        key,
    )


def fetch_rows(
    table: str,
) -> list[dict[str, Any]]:
    client = get_supabase()

    response = (
        client
        .table(table)
        .select("*")
        .order(
            "created_at",
            desc=True,
        )
        .execute()
    )

    data = response.data or []

    return [
        item
        for item in data
        if isinstance(item, dict)
    ]


def upsert_rows(
    table: str,
    rows: list[dict[str, Any]],
) -> None:
    if not rows:
        return

    client = get_supabase()

    (
        client
        .table(table)
        .upsert(
            rows,
            on_conflict="id",
        )
        .execute()
    )
