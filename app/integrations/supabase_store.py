from __future__ import annotations

import os
from typing import Any

from supabase import Client, create_client


_MEMORY_STORE: dict[
    str,
    list[dict[str, Any]],
] = {
    "trip_runs": [],
    "approvals": [],
}


def storage_backend() -> str:
    return (
        os.getenv(
            "TRIPGUARD_STORAGE_BACKEND",
            "supabase",
        )
        .strip()
        .lower()
    )


def using_memory_store() -> bool:
    return (
        storage_backend()
        == "memory"
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
            "Supabase persistence is not configured. "
            "Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY."
        )

    return create_client(
        url,
        key,
    )


def reset_memory_store() -> None:
    for table in _MEMORY_STORE:
        _MEMORY_STORE[table] = []


def fetch_rows(
    table: str,
) -> list[dict[str, Any]]:
    if using_memory_store():
        rows = _MEMORY_STORE.setdefault(
            table,
            [],
        )

        return [
            dict(item)
            for item in sorted(
                rows,
                key=lambda item: (
                    item.get(
                        "created_at",
                        "",
                    )
                ),
                reverse=True,
            )
        ]

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

    if using_memory_store():
        existing = {
            item.get("id"): item
            for item in _MEMORY_STORE.setdefault(
                table,
                [],
            )
            if item.get("id")
        }

        for row in rows:
            row_id = row.get("id")

            if row_id:
                existing[row_id] = dict(
                    row
                )

        _MEMORY_STORE[table] = list(
            existing.values()
        )

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
